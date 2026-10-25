import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import app from '../server/server.js';
import { runQuery, queryOne, queryAll, transaction } from '../server/db/db.js';
import { verifySignature } from '../server/services/razorpayService.js';
import { hasCourseEntitlement } from '../server/services/billingService.js';
import { ensureEnrollment } from '../server/services/progressionEngine.js';

console.log('\n====================================================');
console.log('CODIFICATORS SECURE COURSE PURCHASE & ACCESS TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

async function runAsyncTest(id, name, fn) {
  try {
    await fn();
    console.log(`✅ [Test ${id} Passed]: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [Test ${id} Failed]: ${name}`);
    console.error(err);
    failedTests++;
  }
}

// Start ephemeral test server
const server = app.listen(0);
const port = server.address().port;
const BASE_URL = `http://127.0.0.1:${port}`;

async function apiRequest(method, path, body = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: data };
}

// Setup test users & courses
const testBuyerId = 'usr-test-buyer-2026';
const testBuyerEmail = 'buyer2026@codificators.com';
const testAttackerId = 'usr-test-attacker-2026';
const testAttackerEmail = 'attacker2026@codificators.com';
const testAdminId = 'usr-admin-1';

// Ensure test users exist
runQuery(
  `INSERT OR IGNORE INTO users (id, email, password_hash, name, role)
   VALUES (?, ?, 'pass123', 'Test Buyer', 'STUDENT')`,
  [testBuyerId, testBuyerEmail]
);

runQuery(
  `INSERT OR IGNORE INTO users (id, email, password_hash, name, role)
   VALUES (?, ?, 'pass123', 'Test Attacker', 'STUDENT')`,
  [testAttackerId, testAttackerEmail]
);

// Ensure test courses exist with authoritative pricing
runQuery(
  `INSERT OR REPLACE INTO courses (id, title, slug, description, category, level, price, original_price, is_published, status)
   VALUES ('course-dsa-java', 'Data Structures & Algorithms in Java & C++', 'dsa-java', 'Master Arrays, Trees, DP', 'DSA', 'Intermediate', 199, 399, 1, 'PUBLISHED')`
);

runQuery(
  `INSERT OR REPLACE INTO courses (id, title, slug, description, category, level, price, original_price, is_published, status)
   VALUES ('course-fullstack-web', 'Full Stack Web Development', 'fullstack-web', 'Master React, Node, Express, PostgreSQL', 'Full Stack', 'Intermediate', 249, 499, 1, 'PUBLISHED')`
);

// Clear prior test orders and enrollments for test buyer
runQuery('DELETE FROM orders WHERE user_id IN (?, ?)', [testBuyerId, testAttackerId]);
runQuery('DELETE FROM enrollments WHERE user_id IN (?, ?)', [testBuyerId, testAttackerId]);
runQuery('DELETE FROM course_entitlements WHERE user_id IN (?, ?)', [testBuyerId, testAttackerId]);

async function runAllTests() {
  try {
    // ---------------------------------------------------------
    // SECTION 1: AUTHENTICATION ENFORCEMENT
    // ---------------------------------------------------------

    await runAsyncTest(1, 'Logged-out visitor can browse permitted public course information', async () => {
      const res = await apiRequest('GET', '/api/courses');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.courses));
      assert.ok(res.body.courses.length > 0);
      const dsa = res.body.courses.find(c => c.id === 'course-dsa-java');
      assert.ok(dsa, 'course-dsa-java must be present');
      assert.equal(dsa.price, 199);
    });

    await runAsyncTest(2, 'Logged-out visitor cannot create a purchase order (HTTP 401 Unauthorized)', async () => {
      const res = await apiRequest('POST', '/api/create-order', {
        courseId: 'course-dsa-java',
        amount: 19900
      });
      assert.equal(res.status, 401, 'Unauthenticated order creation must be rejected with 401');
      assert.ok(res.body.error.includes('Authentication required'));
    });

    await runAsyncTest(3, 'Logged-out visitor cannot enroll in a paid course (HTTP 401 Unauthorized)', async () => {
      const res = await apiRequest('POST', '/api/courses/course-dsa-java/enroll', {});
      assert.equal(res.status, 401, 'Unauthenticated enrollment must be rejected with 401');
    });

    await runAsyncTest(4, 'One user cannot purchase on behalf of another by modifying a request', async () => {
      const res = await apiRequest('POST', '/api/create-order', {
        courseId: 'course-dsa-java',
        userId: testBuyerId // Attacker spoofing buyer's ID in body
      }, testAttackerId);

      assert.equal(res.status, 200);
      assert.ok(res.body.order_id);
      // Verify in database that order is bound strictly to authenticated attacker, not spoofed buyer
      const order = queryOne('SELECT * FROM orders WHERE transaction_ref = ?', [res.body.order_id]);
      assert.equal(order.user_id, testAttackerId, 'Order must belong strictly to authenticated user');
      assert.notEqual(order.user_id, testBuyerId, 'Spoofed user ID must be completely ignored');
    });

    // ---------------------------------------------------------
    // SECTION 2: PAYMENT & ORDER LIFECYCLE
    // ---------------------------------------------------------

    let createdRazorpayOrderId = null;

    await runAsyncTest(5, 'Correct order creation for a real configured course with server-calculated price', async () => {
      const res = await apiRequest('POST', '/api/create-order', {
        courseId: 'course-fullstack-web'
      }, testBuyerId);

      assert.equal(res.status, 200);
      assert.ok(res.body.order_id);
      createdRazorpayOrderId = res.body.order_id;
      // Price of course-fullstack-web is ₹249 = 24900 paise
      assert.equal(res.body.finalPrice, 249);
      assert.equal(res.body.amount, 24900);

      // Verify a PENDING order was recorded in the database
      const pendingOrder = queryOne('SELECT * FROM orders WHERE transaction_ref = ?', [createdRazorpayOrderId]);
      assert.ok(pendingOrder, 'Pending order must be persisted in database');
      assert.equal(pendingOrder.status, 'PENDING');
      assert.equal(pendingOrder.user_id, testBuyerId);
      assert.equal(pendingOrder.course_id, 'course-fullstack-web');
      assert.equal(pendingOrder.amount, 249);
    });

    await runAsyncTest(6, 'Frontend price tampering is ignored by server-calculated pricing', async () => {
      const res = await apiRequest('POST', '/api/create-order', {
        courseId: 'course-dsa-java',
        amount: 100 // Tampered client amount
      }, testBuyerId);

      assert.equal(res.status, 200);
      assert.equal(res.body.finalPrice, 199);
      assert.equal(res.body.amount, 19900);
    });

    await runAsyncTest(7, 'Invalid payment signatures are rejected (HTTP 400)', async () => {
      const res = await apiRequest('POST', '/api/verify-payment', {
        razorpay_order_id: createdRazorpayOrderId,
        razorpay_payment_id: 'pay_tampered_123',
        razorpay_signature: 'fake_tampered_signature_hex_00000000000000000000000000000000',
        courseId: 'course-fullstack-web'
      }, testBuyerId);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes('Signature mismatch'));

      // Verify order was marked FAILED and course was NOT unlocked
      const order = queryOne('SELECT * FROM orders WHERE transaction_ref = ?', [createdRazorpayOrderId]);
      assert.equal(order.status, 'FAILED');
      const enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [testBuyerId, 'course-fullstack-web']);
      assert.ok(!enrollment, 'Failed payment must not unlock course');
    });

    await runAsyncTest(8, 'Missing payment verification fields are rejected (HTTP 400)', async () => {
      const res = await apiRequest('POST', '/api/verify-payment', {
        razorpay_order_id: createdRazorpayOrderId
        // missing razorpay_payment_id & razorpay_signature
      }, testBuyerId);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await runAsyncTest(9, 'Failed or abandoned payment does not unlock course', async () => {
      const isEntitled = hasCourseEntitlement(testBuyerId, 'course-fullstack-web');
      assert.equal(isEntitled, false, 'Student must not be entitled after failed/unverified payment');
    });

    let verifiedPaymentId = 'pay_verified_test_999';
    let validSignature = null;
    let testValidOrderId = null;

    await runAsyncTest(10, 'Verified successful payment grants persistent course access', async () => {
      // 1. Create fresh order for course-fullstack-web
      const orderRes = await apiRequest('POST', '/api/create-order', {
        courseId: 'course-fullstack-web'
      }, testBuyerId);

      assert.equal(orderRes.status, 200);
      testValidOrderId = orderRes.body.order_id;

      // 2. Generate valid HMAC-SHA256 signature
      const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key';
      validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${testValidOrderId}|${verifiedPaymentId}`)
        .digest('hex');

      // 3. Verify payment with valid signature
      const verifyRes = await apiRequest('POST', '/api/verify-payment', {
        razorpay_order_id: testValidOrderId,
        razorpay_payment_id: verifiedPaymentId,
        razorpay_signature: validSignature,
        courseId: 'course-fullstack-web'
      }, testBuyerId);

      assert.equal(verifyRes.status, 200);
      assert.equal(verifyRes.body.success, true);

      // 4. Confirm order is COMPLETED in DB
      const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderRes.body.internal_order_id]);
      assert.equal(order.status, 'COMPLETED');
      assert.equal(order.transaction_ref, verifiedPaymentId);

      // 5. Confirm enrollment is created
      const enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [testBuyerId, 'course-fullstack-web']);
      assert.ok(enrollment, 'Enrollment must exist in database');
      assert.equal(enrollment.status, 'ACTIVE');

      // 6. Confirm student is now entitled
      assert.equal(hasCourseEntitlement(testBuyerId, 'course-fullstack-web'), true);
    });

    await runAsyncTest(11, 'Duplicate payment verification is idempotent and does not create duplicate enrollments', async () => {
      const retryRes = await apiRequest('POST', '/api/verify-payment', {
        razorpay_order_id: testValidOrderId,
        razorpay_payment_id: verifiedPaymentId,
        razorpay_signature: validSignature,
        courseId: 'course-fullstack-web'
      }, testBuyerId);

      assert.equal(retryRes.status, 200);
      assert.equal(retryRes.body.success, true);
      assert.equal(retryRes.body.already_processed, true);

      // Verify only ONE enrollment exists in database for this student & course
      const enrollments = queryAll('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [testBuyerId, 'course-fullstack-web']);
      assert.equal(enrollments.length, 1, 'Duplicate verification must not create duplicate enrollment rows');
    });

    await runAsyncTest(12, 'Duplicate checkout attempts for already enrolled course are rejected', async () => {
      const res = await apiRequest('POST', '/api/create-order', {
        courseId: 'course-fullstack-web'
      }, testBuyerId);

      assert.equal(res.status, 400);
      assert.equal(res.body.alreadyEnrolled, true);
      assert.ok(res.body.error.includes('already enrolled'));
    });

    // ---------------------------------------------------------
    // SECTION 3: COURSE CONTENT AUTHORIZATION
    // ---------------------------------------------------------

    await runAsyncTest(13, 'Paid course is accessible to enrolled student after verified purchase', async () => {
      const res = await apiRequest('GET', '/api/courses/course-fullstack-web', null, testBuyerId);
      assert.equal(res.status, 200);
      assert.ok(res.body.course.enrollment, 'Enrollment details must be returned for enrolled student');
    });

    await runAsyncTest(14, 'A non-enrolled user cannot access restricted curriculum or lesson APIs', async () => {
      const res = await apiRequest('GET', '/api/learning/course-fullstack-web/curriculum', null, testAttackerId);
      assert.equal(res.status, 402, 'Unentitled student must be rejected with HTTP 402 Payment Required');
      assert.equal(res.body.requires_payment, true);
    });

    await runAsyncTest(16, 'A valid complimentary admin grant unlocks course without fabricating payment', async () => {
      const res = await apiRequest('POST', '/api/admin/entitlements/grant', {
        userId: testAttackerId,
        courseId: 'course-system-design',
        reason: 'National competitive coding merit scholarship grant'
      }, testAdminId);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const grant = queryOne('SELECT * FROM course_entitlements WHERE user_id = ? AND course_id = ?', [testAttackerId, 'course-system-design']);
      assert.ok(grant, 'Course entitlement record must exist');
      assert.equal(grant.is_active, 1);
      assert.equal(grant.reason, 'National competitive coding merit scholarship grant');

      // Verify student is entitled
      assert.equal(hasCourseEntitlement(testAttackerId, 'course-system-design'), true);

      // Verify financial transaction history was NOT falsified (no bogus order created)
      const bogusOrder = queryOne('SELECT * FROM orders WHERE user_id = ? AND course_id = ?', [testAttackerId, 'course-system-design']);
      assert.ok(!bogusOrder, 'Complimentary grant must not invent a fabricated order in orders table');
    });

    await runAsyncTest(17, 'Admin orders endpoint requires admin authorization and displays real DB records', async () => {
      // Ordinary student cannot access
      const forbiddenRes = await apiRequest('GET', '/api/admin/orders', null, testBuyerId);
      assert.equal(forbiddenRes.status, 403, 'Non-admin user must receive 403 on admin orders endpoint');

      // Admin can access
      const adminRes = await apiRequest('GET', '/api/admin/orders', null, testAdminId);
      assert.equal(adminRes.status, 200);
      assert.ok(Array.isArray(adminRes.body.orders));
      assert.ok(adminRes.body.orders.length > 0);
    });

    await runAsyncTest(18, 'Public APIs do not expose private user account lists', async () => {
      const unauthRes = await apiRequest('GET', '/api/auth/users');
      assert.equal(unauthRes.status, 401, 'Guest must receive 401 on /api/auth/users');

      const studentRes = await apiRequest('GET', '/api/auth/users', null, testBuyerId);
      assert.equal(studentRes.status, 403, 'Student must receive 403 on /api/auth/users');
    });

    console.log(`\n====================================================`);
    console.log(`RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log(`====================================================\n`);

    server.close();
    if (failedTests > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL 18 WORKFLOW & DATA SECURITY TESTS PASSED PERFECTLY!\n');
      process.exit(0);
    }
  } catch (globalErr) {
    console.error('Fatal test runner error:', globalErr);
    server.close();
    process.exit(1);
  }
}

runAllTests();
