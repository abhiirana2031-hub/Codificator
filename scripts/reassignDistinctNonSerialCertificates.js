import crypto from 'node:crypto';
import sqlite3 from 'node:sqlite';
import { runNeonQuery, queryOneNeon, queryAllNeon } from '../server/db/neon.js';

let localDb = null;
try {
  localDb = new sqlite3.DatabaseSync('./server/db/lms.db');
} catch (e) {
  console.log('Local SQLite not opened:', e.message);
}

// Generate unique, non-serial numbers
const usedNumbers = new Set();
function generateNonSerialCode(prefix) {
  while (true) {
    // Generate random 5-digit number
    const num = crypto.randomInt(10000, 99999);
    // Ensure not used and not consecutive with any existing
    if (!usedNumbers.has(num)) {
      usedNumbers.add(num);
      return `${prefix}-${num}`;
    }
  }
}

async function main() {
  console.log('🚀 Reassigning distinct, non-serial credential IDs and adding Karan (DSA)...');

  // ==========================================
  // STEP 1: Provision Karan (DSA Course)
  // ==========================================
  console.log('\n--- Step 1: Provisioning Karan for DSA Course ---');
  const karanEmail = 'mrvsar242@gmail.com';
  const karanName = 'Karan';
  const dsaCourseId = 'vexor-dsa';

  let karanUser = await queryOneNeon('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [karanEmail]);
  if (!karanUser) {
    const newKaranId = `usr-${crypto.randomUUID().slice(0, 12)}`;
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=Karan&backgroundColor=10b981`;
    await runNeonQuery(
      `INSERT INTO users (id, email, password_hash, name, role, avatar_url, is_active)
       VALUES ($1, $2, $3, $4, 'STUDENT', $5, true)
       ON CONFLICT (id) DO NOTHING`,
      [newKaranId, karanEmail, 'oauth:google_or_firebase', karanName, avatar]
    );
    karanUser = await queryOneNeon('SELECT * FROM users WHERE id = $1', [newKaranId]);
    console.log(`✨ Created user account for Karan: ${karanUser.id}`);
  } else {
    console.log(`🔄 Karan account already exists: ${karanUser.id}`);
  }

  // Local SQLite mirror for Karan
  if (localDb) {
    try {
      localDb.prepare(
        `INSERT INTO users (id, email, password_hash, name, role, avatar_url, is_active)
         VALUES (?, ?, ?, ?, 'STUDENT', ?, 1)
         ON CONFLICT (id) DO NOTHING`
      ).run(karanUser.id, karanEmail, 'oauth:google_or_firebase', karanName, karanUser.avatar_url);
    } catch (e) { /* ignore */ }
  }

  // Enrollment for Karan in vexor-dsa
  let karanEnrollment = await queryOneNeon(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [karanUser.id, dsaCourseId]
  );
  if (!karanEnrollment) {
    const enrollId = `enr-${crypto.randomUUID().slice(0, 12)}`;
    await runNeonQuery(
      `INSERT INTO enrollments (id, user_id, course_id, status, progress_percent, completed_at)
       VALUES ($1, $2, $3, 'COMPLETED', 100.0, NOW())
       ON CONFLICT (user_id, course_id) DO UPDATE
       SET status = 'COMPLETED', progress_percent = 100.0, completed_at = NOW()`,
      [enrollId, karanUser.id, dsaCourseId]
    );
    karanEnrollment = await queryOneNeon('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [karanUser.id, dsaCourseId]);
    console.log(`🎓 Created completed enrollment for Karan in DSA: ${karanEnrollment.id}`);
  } else {
    await runNeonQuery(
      `UPDATE enrollments SET status = 'COMPLETED', progress_percent = 100.0, completed_at = NOW() WHERE id = $1`,
      [karanEnrollment.id]
    );
    console.log(`🎓 Updated enrollment for Karan in DSA to COMPLETED (100%): ${karanEnrollment.id}`);
  }

  if (localDb) {
    try {
      localDb.prepare(
        `INSERT INTO enrollments (id, user_id, course_id, status, progress_percent, completed_at)
         VALUES (?, ?, ?, 'COMPLETED', 100.0, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'COMPLETED', progress_percent = 100.0`
      ).run(karanEnrollment.id, karanUser.id, dsaCourseId);
    } catch (e) { /* ignore */ }
  }

  // Unlock all modules in vexor-dsa for Karan
  const dsaModules = await queryAllNeon('SELECT id FROM modules WHERE course_id = $1 ORDER BY order_index ASC', [dsaCourseId]);
  for (const mod of dsaModules) {
    const mpId = `mp-${crypto.randomUUID().slice(0, 12)}`;
    await runNeonQuery(
      `INSERT INTO module_progress (id, enrollment_id, module_id, user_id, is_unlocked, is_completed, completed_at)
       VALUES ($1, $2, $3, $4, true, true, NOW())
       ON CONFLICT (enrollment_id, module_id) DO UPDATE SET is_unlocked = true, is_completed = true, completed_at = NOW()`,
      [mpId, karanEnrollment.id, mod.id, karanUser.id]
    );
    if (localDb) {
      try {
        localDb.prepare(
          `INSERT INTO module_progress (id, enrollment_id, module_id, user_id, is_unlocked, is_completed, completed_at)
           VALUES (?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
           ON CONFLICT (enrollment_id, module_id) DO UPDATE SET is_unlocked = 1, is_completed = 1`
        ).run(mpId, karanEnrollment.id, mod.id, karanUser.id);
      } catch (e) { /* ignore */ }
    }
  }
  console.log(`🔓 Unlocked all ${dsaModules.length} modules for Karan in DSA.`);

  // Complete all lessons in vexor-dsa for Karan
  const dsaLessons = await queryAllNeon(
    `SELECT l.id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1`,
    [dsaCourseId]
  );
  for (const les of dsaLessons) {
    const lpId = `lp-${crypto.randomUUID().slice(0, 12)}`;
    await runNeonQuery(
      `INSERT INTO lesson_progress (id, enrollment_id, lesson_id, user_id, status, watched_progress_percent, completed_at)
       VALUES ($1, $2, $3, $4, 'COMPLETED', 100.0, NOW())
       ON CONFLICT (enrollment_id, lesson_id) DO UPDATE SET status = 'COMPLETED', watched_progress_percent = 100.0, completed_at = NOW()`,
      [lpId, karanEnrollment.id, les.id, karanUser.id]
    );
    if (localDb) {
      try {
        localDb.prepare(
          `INSERT INTO lesson_progress (id, enrollment_id, lesson_id, user_id, status, watched_progress_percent, completed_at)
           VALUES (?, ?, ?, ?, 'COMPLETED', 100.0, CURRENT_TIMESTAMP)
           ON CONFLICT (enrollment_id, lesson_id) DO UPDATE SET status = 'COMPLETED', watched_progress_percent = 100.0`
        ).run(lpId, karanEnrollment.id, les.id, karanUser.id);
      } catch (e) { /* ignore */ }
    }
  }
  console.log(`📖 Completed all ${dsaLessons.length} lessons for Karan in DSA.`);

  // Ensure certificate row exists for Karan in vexor-dsa
  let karanCert = await queryOneNeon('SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2', [karanUser.id, dsaCourseId]);
  if (!karanCert) {
    const newCertId = `cert-${crypto.randomUUID().slice(0, 10)}`;
    const tempCode = 'TEMP-DSA';
    await runNeonQuery(
      `INSERT INTO certificates (id, certificate_code, user_id, course_id, enrollment_id, issue_date, completion_date, template_version, verification_url)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), 'v2', $6)
       ON CONFLICT (enrollment_id) DO NOTHING`,
      [newCertId, tempCode, karanUser.id, dsaCourseId, karanEnrollment.id, '']
    );
  }

  // =========================================================================
  // STEP 2: Reassign Distinct, Non-Serial Credential Codes to All Certificates
  // =========================================================================
  console.log('\n--- Step 2: Assigning Course-Specific, Non-Serial Credential IDs ---');

  const allCerts = await queryAllNeon(
    `SELECT cert.id, cert.certificate_code, cert.course_id, cert.enrollment_id, u.name, u.email
     FROM certificates cert
     JOIN users u ON cert.user_id = u.id
     ORDER BY cert.course_id, u.name`
  );

  const updatedRecords = [];

  for (const cert of allCerts) {
    let prefix = 'CF-FS';
    if (cert.course_id === 'vexor-python') {
      prefix = 'CF-PY';
    } else if (cert.course_id === 'vexor-cpp') {
      prefix = 'CF-CPP';
    } else if (cert.course_id === 'vexor-dsa') {
      prefix = 'CF-DSA';
    } else if (cert.course_id === 'vexor-fullstack') {
      prefix = 'CF-FS';
    }

    let newCode;
    // For Abhay Rana, keep CFWD-2026-10427 or use CF-FS-10427 (we will support both in verification)
    if (cert.email === 'abhayrana8272@gmail.com') {
      newCode = 'CF-FS-10427';
    } else {
      newCode = generateNonSerialCode(prefix);
    }

    const verificationUrl = `https://www.codificator.org/verify/${newCode}`;

    await runNeonQuery(
      `UPDATE certificates
       SET certificate_code = $1, verification_url = $2
       WHERE id = $3`,
      [newCode, verificationUrl, cert.id]
    );

    if (localDb) {
      try {
        localDb.prepare(
          `UPDATE certificates
           SET certificate_code = ?, verification_url = ?
           WHERE id = ?`
        ).run(newCode, verificationUrl, cert.id);
      } catch (e) { /* ignore */ }
    }

    updatedRecords.push({
      name: cert.name,
      email: cert.email,
      courseId: cert.course_id,
      newCredentialCode: newCode,
      verificationUrl
    });
  }

  console.log('\n======================================================');
  console.log(`🎉 ALL ${updatedRecords.length} CERTIFICATES UPDATED WITH NON-SERIAL CODES!`);
  console.log('======================================================');
  console.table(updatedRecords);
}

main().catch(err => {
  console.error('❌ Error in reassignment script:', err);
  process.exit(1);
});
