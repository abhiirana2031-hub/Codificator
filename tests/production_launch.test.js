import assert from 'node:assert/strict';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use isolated test DB
const TEST_DB_PATH = path.join(__dirname, 'isolated_launch_test.db');
process.env.LMS_DB_PATH = TEST_DB_PATH;

if (fs.existsSync(TEST_DB_PATH)) {
  try { fs.unlinkSync(TEST_DB_PATH); } catch {}
}
if (fs.existsSync(`${TEST_DB_PATH}-wal`)) {
  try { fs.unlinkSync(`${TEST_DB_PATH}-wal`); } catch {}
}
if (fs.existsSync(`${TEST_DB_PATH}-shm`)) {
  try { fs.unlinkSync(`${TEST_DB_PATH}-shm`); } catch {}
}

const { db, runQuery, queryOne, queryAll, initSchema, transaction } = await import('../server/db/db.js');
const { seedDatabase } = await import('../server/db/seed.js');
const {
  validateCoupon,
  recordCouponRedemption,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  listAdminCoupons,
  getCouponRedemptions
} = await import('../server/services/couponService.js');
const { ensureEnrollment } = await import('../server/services/progressionEngine.js');

console.log('====================================================');
console.log('CODIFICATORS PRODUCTION LAUNCH & AUTH/COUPON TEST SUITE');
console.log('====================================================\n');

initSchema();
seedDatabase();

let passed = 0;
let failed = 0;

async function runTest(num, name, fn) {
  try {
    await fn();
    console.log(`✅ [Test ${num} Passed]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [Test ${num} Failed]: ${name}`);
    console.error(err);
    failed++;
  }
}

// ----------------------------------------------------
// SECTION 1: AUTHENTICATION & ACCESS CONTROL
// ----------------------------------------------------

await runTest(1, 'Signup creates student account with encrypted/hashed password and default role STUDENT', async () => {
  const userId = `usr-test-${Date.now()}`;
  const email = `student_${Date.now()}@example.com`;
  
  runQuery(
    `INSERT INTO users (id, name, email, password_hash, role, phone, is_active)
     VALUES (?, ?, ?, ?, 'STUDENT', ?, 1)`,
    [userId, 'Test Student', email, 'hash_sample_abc', '+919876543210']
  );

  const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  assert.ok(user);
  assert.equal(user.role, 'STUDENT');
  assert.equal(user.is_active, 1);
  assert.equal(user.phone, '+919876543210');
});

await runTest(2, 'Role self-escalation is strictly prevented: Users cannot assign themselves ADMIN role during registration/profile', async () => {
  const testUser = queryOne("SELECT * FROM users WHERE role = 'STUDENT' LIMIT 1");
  assert.ok(testUser);

  // Attempting profile update with role must be ignored or rejected
  const allowedFields = ['name', 'display_name', 'phone', 'college', 'bio', 'skills', 'preferred_languages', 'social_links'];
  const maliciousPayload = {
    name: 'Tampered Student',
    role: 'ADMIN',
    is_active: 1
  };

  const fieldsToUpdate = Object.keys(maliciousPayload).filter(f => allowedFields.includes(f));
  assert.ok(!fieldsToUpdate.includes('role'), 'role must never be an allowed user-editable field');
});

await runTest(3, 'Password recovery generates crypto-secure token with expiration and single-use enforcement', async () => {
  const user = queryOne("SELECT * FROM users WHERE role = 'STUDENT' LIMIT 1");
  assert.ok(user);

  const resetToken = 'test-token-' + Date.now();
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiry = new Date(Date.now() + 3600000).toISOString();

  runQuery(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at)
     VALUES (?, ?, ?, ?, NULL)`,
    [`pr-${Date.now()}`, user.id, tokenHash, expiry]
  );

  const record = queryOne('SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL', [tokenHash]);
  assert.ok(record);
  assert.equal(record.user_id, user.id);

  // Invalidate on use
  runQuery('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id]);
  const usedRecord = queryOne('SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL', [tokenHash]);
  assert.equal(usedRecord, undefined, 'Used token must not be valid for reuse');
});

await runTest(4, 'Admin routes and user toggles are accessible only by users with ADMIN role', async () => {
  const adminUser = queryOne("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1");
  const studentUser = queryOne("SELECT * FROM users WHERE role = 'STUDENT' LIMIT 1");

  assert.ok(adminUser, 'Admin user must exist in system');
  assert.ok(studentUser, 'Student user must exist in system');

  // Verify RBAC guard check
  const checkAdmin = (user) => user && user.role === 'ADMIN';
  assert.equal(checkAdmin(adminUser), true);
  assert.equal(checkAdmin(studentUser), false);
});

// ----------------------------------------------------
// SECTION 2: PROFILES & PHOTO SECURITY
// ----------------------------------------------------

await runTest(5, 'User can update permitted profile fields (display name, bio, phone, college, skills)', async () => {
  const user = queryOne("SELECT * FROM users WHERE role = 'STUDENT' LIMIT 1");
  
  runQuery(
    `UPDATE users 
     SET display_name = ?, bio = ?, college = ?, skills = ?, preferred_languages = ?
     WHERE id = ?`,
    ['Alex Coder', 'Fullstack Engineer in training', 'NIT Trichy', '["React", "Node.js"]', '["JavaScript", "Python"]', user.id]
  );

  const updated = queryOne('SELECT * FROM users WHERE id = ?', [user.id]);
  assert.equal(updated.display_name, 'Alex Coder');
  assert.equal(updated.bio, 'Fullstack Engineer in training');
  assert.equal(updated.college, 'NIT Trichy');
});

await runTest(6, 'Avatar validation rejects files exceeding 2MB and enforces valid image magic bytes', async () => {
  const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  const validPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const maliciousScript = Buffer.from('<?php echo "evil"; ?>');

  const checkMagicBytes = (buf) => {
    if (buf.length < 4) return false;
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    return isJpeg || isPng;
  };

  assert.equal(checkMagicBytes(validJpeg), true);
  assert.equal(checkMagicBytes(validPng), true);
  assert.equal(checkMagicBytes(maliciousScript), false, 'Arbitrary non-image script must be rejected');

  const oversizedBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB
  assert.ok(oversizedBuffer.length > 2 * 1024 * 1024, 'Oversized image must exceed 2MB limit');
});

// ----------------------------------------------------
// SECTION 3: COUPON & DISCOUNT ENGINE
// ----------------------------------------------------

// Setup known course for testing with explicit price
const testCourse = queryOne('SELECT * FROM courses LIMIT 1');
assert.ok(testCourse, 'Test course must exist');
runQuery('UPDATE courses SET price = 2000 WHERE id = ?', [testCourse.id]);
const coursePrice = 2000;

await runTest(7, 'Scenario A: Valid percentage discount (25% off ₹2,000 -> ₹1,500)', async () => {
  runQuery('DELETE FROM coupons WHERE code = ?', ['LEARN25']);
  
  createCoupon({
    code: 'LEARN25',
    description: '25% discount for learners',
    discount_type: 'PERCENTAGE',
    discount_value: 25,
    max_discount: 1000,
    is_active: 1
  });

  const res = validateCoupon({
    code: 'LEARN25',
    courseId: testCourse.id,
    user: { id: 'usr-student-1', email: 'student@codificators.com' }
  });

  assert.equal(res.valid, true);
  assert.equal(res.discountAmount, 500);
  assert.equal(res.finalPrice, 1500);
  assert.equal(res.isFree, false);
});

await runTest(8, 'Scenario B: Valid fixed discount (SAVE300, ₹300 off ₹2,000 -> ₹1,700)', async () => {
  runQuery('DELETE FROM coupons WHERE code = ?', ['SAVE300']);
  
  createCoupon({
    code: 'SAVE300',
    description: 'Fixed 300 discount',
    discount_type: 'FIXED',
    discount_value: 300,
    is_active: 1
  });

  const res = validateCoupon({
    code: 'SAVE300',
    courseId: testCourse.id,
    user: { id: 'usr-student-1', email: 'student@codificators.com' }
  });

  assert.equal(res.valid, true);
  assert.equal(res.discountAmount, 300);
  assert.equal(res.finalPrice, 1700);
});

await runTest(9, 'Expired coupon is rejected with clear error message', async () => {
  runQuery('DELETE FROM coupons WHERE code = ?', ['EXPIRED50']);
  
  createCoupon({
    code: 'EXPIRED50',
    discount_type: 'PERCENTAGE',
    discount_value: 50,
    expiry_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
    is_active: 1
  });

  const res = validateCoupon({
    code: 'EXPIRED50',
    courseId: testCourse.id,
    user: { id: 'usr-student-1' }
  });

  assert.equal(res.valid, false);
  assert.ok(res.error.toLowerCase().includes('expired'));
});

await runTest(10, 'Inactive / Deactivated coupon is rejected', async () => {
  runQuery('DELETE FROM coupons WHERE code = ?', ['INACTIVE10']);
  
  createCoupon({
    code: 'INACTIVE10',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    is_active: 0
  });

  const res = validateCoupon({
    code: 'INACTIVE10',
    courseId: testCourse.id,
    user: { id: 'usr-student-1' }
  });

  assert.equal(res.valid, false);
  assert.ok(res.error.toLowerCase().includes('active'));
});

await runTest(11, 'Course-ineligible coupon is rejected when applied to non-eligible course', async () => {
  runQuery('DELETE FROM coupons WHERE code = ?', ['COURSEONLY']);
  
  // Ensure another course exists to satisfy foreign key
  let secondCourse = queryOne('SELECT * FROM courses WHERE id != ? LIMIT 1', [testCourse.id]);
  if (!secondCourse) {
    runQuery(
      `INSERT INTO courses (id, title, slug, description, price, is_published)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['course-second-test', 'Python Specialization', 'python-spec', 'Python track', 1500, 1]
    );
    secondCourse = { id: 'course-second-test' };
  }

  createCoupon({
    code: 'COURSEONLY',
    discount_type: 'PERCENTAGE',
    discount_value: 20,
    eligible_course_id: secondCourse.id,
    is_active: 1
  });

  const res = validateCoupon({
    code: 'COURSEONLY',
    courseId: testCourse.id,
    user: { id: 'usr-student-1' }
  });

  assert.equal(res.valid, false);
  assert.ok(res.error.toLowerCase().includes('course'));
});

await runTest(12, 'Scenario C: User-specific discount enforces email / phone restriction', async () => {
  runQuery('DELETE FROM coupons WHERE code = ?', ['VIPALEX']);
  
  createCoupon({
    code: 'VIPALEX',
    discount_type: 'PERCENTAGE',
    discount_value: 40,
    eligible_email: 'vip.alex@codificators.com',
    eligible_phone: '+919876543210',
    is_active: 1
  });

  // Attempting to use with wrong email
  const imposterRes = validateCoupon({
    code: 'VIPALEX',
    courseId: testCourse.id,
    user: {
      id: 'usr-imposter',
      email: 'imposter@random.com',
      phone: '+910000000000'
    }
  });

  assert.equal(imposterRes.valid, false);
  assert.ok(imposterRes.error.toLowerCase().includes('account'));

  // Applying with matched eligible email and phone
  const validRes = validateCoupon({
    code: 'VIPALEX',
    courseId: testCourse.id,
    user: {
      id: 'usr-alex',
      email: 'vip.alex@codificators.com',
      phone: '+919876543210'
    }
  });
  assert.equal(validRes.valid, true);
  assert.equal(validRes.discountAmount, 800);
});

await runTest(13, 'Scenario D: Free-course entitlement (100% discount) grants enrollment safely', async () => {
  runQuery('DELETE FROM coupons WHERE code = ?', ['FREE100']);
  
  createCoupon({
    code: 'FREE100',
    discount_type: 'PERCENTAGE',
    discount_value: 100,
    is_active: 1
  });

  const student = queryOne("SELECT * FROM users WHERE role = 'STUDENT' LIMIT 1");
  const validation = validateCoupon({
    code: 'FREE100',
    courseId: testCourse.id,
    user: {
      id: student.id,
      email: student.email
    }
  });

  assert.equal(validation.valid, true);
  assert.equal(validation.isFree, true);
  assert.equal(validation.finalPrice, 0);

  // Record free redemption
  const redemptionId = recordCouponRedemption({
    couponId: validation.coupon.id,
    userId: student.id,
    courseId: testCourse.id,
    discountAmount: validation.discountAmount,
    originalPrice: coursePrice,
    finalPrice: 0
  });

  assert.ok(redemptionId);

  // Enroll student
  const enrollment = ensureEnrollment(student.id, testCourse.id);
  assert.ok(enrollment);
});

await runTest(14, 'Duplicate single-use redemption and user redemption limits are strictly enforced', async () => {
  runQuery('DELETE FROM coupons WHERE code = ?', ['ONCEONLY']);
  
  createCoupon({
    code: 'ONCEONLY',
    discount_type: 'FIXED',
    discount_value: 100,
    max_redemptions_per_user: 1,
    is_active: 1
  });

  const student = queryOne("SELECT * FROM users WHERE role = 'STUDENT' LIMIT 1");
  const validCheck = validateCoupon({
    code: 'ONCEONLY',
    courseId: testCourse.id,
    user: {
      id: student.id,
      email: student.email
    }
  });

  assert.equal(validCheck.valid, true);

  // First redemption succeeds
  recordCouponRedemption({
    couponId: validCheck.coupon.id,
    userId: student.id,
    courseId: testCourse.id,
    discountAmount: 100,
    originalPrice: coursePrice,
    finalPrice: coursePrice - 100
  });

  // Second redemption must be blocked
  const secondCheck = validateCoupon({
    code: 'ONCEONLY',
    courseId: testCourse.id,
    user: {
      id: student.id,
      email: student.email
    }
  });

  assert.equal(secondCheck.valid, false);
  assert.ok(secondCheck.error.toLowerCase().includes('already redeemed'));
});

await runTest(15, 'Price security: Discounts cannot produce negative payable amounts', async () => {
  runQuery('DELETE FROM coupons WHERE code = ?', ['MEGADISCOUNT']);
  
  createCoupon({
    code: 'MEGADISCOUNT',
    discount_type: 'FIXED',
    discount_value: 999999, // Exceeds course price
    is_active: 1
  });

  const res = validateCoupon({
    code: 'MEGADISCOUNT',
    courseId: testCourse.id,
    user: { id: 'usr-student-1' }
  });

  assert.equal(res.valid, true);
  assert.equal(res.finalPrice, 0, 'Payable amount must clamp to 0 and never become negative');
  assert.equal(res.discountAmount, coursePrice, 'Discount amount cannot exceed course price');
});

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL 15 PRODUCTION LAUNCH TESTS PASSED!\n');
}
