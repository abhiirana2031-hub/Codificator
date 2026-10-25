import crypto from 'node:crypto';
import sqlite3 from 'node:sqlite';
import { runNeonQuery, queryOneNeon, queryAllNeon } from '../server/db/neon.js';

let localDb = null;
try {
  localDb = new sqlite3.DatabaseSync('./server/db/lms.db');
} catch (e) {
  console.log('Local SQLite not opened:', e.message);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // CSV parser accounting for quotes
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= 4 && values[1] && values[3] && values[3].includes('@')) {
      const name = values[1].replace(/["']/g, '').trim();
      const rawCourse = values[2].replace(/["']/g, '').trim();
      const email = values[3].replace(/["']/g, '').trim().toLowerCase();
      const phone = (values[4] || '').replace(/["']/g, '').trim();
      const college = (values[5] || '').replace(/["']/g, '').trim();

      // Skip summary / total row
      if (email.includes('total') || name.toLowerCase().includes('total')) continue;

      let courseId = 'vexor-fullstack';
      const cLower = rawCourse.toLowerCase();
      if (cLower.includes('python')) {
        courseId = 'vexor-python';
      } else if (cLower.includes('c++') || cLower.includes('cpp')) {
        courseId = 'vexor-cpp';
      } else if (cLower.includes('full') || cLower.includes('app') || cLower.includes('web')) {
        courseId = 'vexor-fullstack';
      }

      rows.push({
        name,
        rawCourse,
        courseId,
        email,
        phone,
        college
      });
    }
  }
  return rows;
}

async function main() {
  console.log('🚀 Starting Google Sheet Student & Certificate Importer...');

  // 1. Fetch CSV from Google Sheets
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/1EuH4lceMmlkfFtCqrn866dSfIEOfyfnfk2N0-qLWmbU/export?format=csv';
  console.log(`📥 Fetching spreadsheet from: ${sheetUrl}`);
  
  const res = await fetch(sheetUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet: HTTP ${res.status}`);
  }
  const csvText = await res.text();
  const students = parseCSV(csvText);
  console.log(`✅ Parsed ${students.length} student registrations from spreadsheet.`);

  // 2. Fetch existing certificates to find starting certificate sequence number
  const existingCerts = await queryAllNeon('SELECT certificate_code FROM certificates');
  let highestCodeNum = 10427; // Abhay Rana's certificate is CFWD-2026-10427
  for (const cert of existingCerts) {
    const match = cert.certificate_code?.match(/(\d{5,})/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highestCodeNum) highestCodeNum = num;
    }
  }
  console.log(`ℹ️ Current highest certificate number: ${highestCodeNum}`);

  const results = [];

  for (const s of students) {
    console.log(`\n======================================================`);
    console.log(`👤 Processing: ${s.name} (${s.email})`);
    console.log(`   Course: ${s.courseId} (${s.rawCourse}) | Phone: ${s.phone || 'N/A'} | College: ${s.college}`);

    // --- STEP A: Find or Create User in Neon ---
    let user = await queryOneNeon('SELECT * FROM users WHERE LOWER(TRIM(email)) = $1', [s.email]);
    if (!user) {
      const newUserId = `usr-${crypto.randomUUID().slice(0, 12)}`;
      const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.name)}&backgroundColor=10b981`;
      await runNeonQuery(
        `INSERT INTO users (id, email, password_hash, name, role, phone, college, avatar_url, is_active)
         VALUES ($1, $2, $3, $4, 'STUDENT', $5, $6, $7, true)
         ON CONFLICT (id) DO NOTHING`,
        [newUserId, s.email, 'oauth:google_or_firebase', s.name, s.phone || null, s.college || null, avatar]
      );
      user = await queryOneNeon('SELECT * FROM users WHERE id = $1', [newUserId]);
      console.log(`   ✨ Created new student account in Neon: ${user.id}`);
    } else {
      await runNeonQuery(
        `UPDATE users
         SET name = COALESCE(NULLIF(name, ''), $1),
             phone = COALESCE(NULLIF(phone, ''), $2),
             college = COALESCE(NULLIF(college, ''), $3)
         WHERE id = $4`,
        [s.name, s.phone || null, s.college || null, user.id]
      );
      console.log(`   🔄 Existing student account matched in Neon: ${user.id}`);
    }

    // Also mirror to local SQLite if available
    if (localDb) {
      try {
        const localUser = localDb.prepare('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?').get(s.email);
        if (!localUser) {
          localDb.prepare(
            `INSERT INTO users (id, email, password_hash, name, role, phone, college, avatar_url, is_active)
             VALUES (?, ?, ?, ?, 'STUDENT', ?, ?, ?, 1)`
          ).run(user.id, s.email, 'oauth:google_or_firebase', s.name, s.phone || null, s.college || null, user.avatar_url);
        }
      } catch (sqErr) {
        // ignore
      }
    }

    // --- STEP B: Upsert Enrollment (COMPLETED with 100% progress) ---
    let enrollment = await queryOneNeon('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [user.id, s.courseId]);
    if (!enrollment) {
      const newEnrollId = `enr-${crypto.randomUUID().slice(0, 12)}`;
      await runNeonQuery(
        `INSERT INTO enrollments (id, user_id, course_id, status, progress_percent, completed_at)
         VALUES ($1, $2, $3, 'COMPLETED', 100.0, NOW())
         ON CONFLICT (user_id, course_id) DO UPDATE
         SET status = 'COMPLETED', progress_percent = 100.0, completed_at = NOW()`,
        [newEnrollId, user.id, s.courseId]
      );
      enrollment = await queryOneNeon('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [user.id, s.courseId]);
      console.log(`   🎓 Created completed enrollment in Neon: ${enrollment.id}`);
    } else {
      await runNeonQuery(
        `UPDATE enrollments
         SET status = 'COMPLETED', progress_percent = 100.0, completed_at = NOW()
         WHERE id = $1`,
        [enrollment.id]
      );
      console.log(`   🎓 Updated enrollment to COMPLETED (100%): ${enrollment.id}`);
    }

    // Local SQLite mirror
    if (localDb) {
      try {
        localDb.prepare(
          `INSERT INTO enrollments (id, user_id, course_id, status, progress_percent, completed_at)
           VALUES (?, ?, ?, 'COMPLETED', 100.0, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, course_id) DO UPDATE SET status = 'COMPLETED', progress_percent = 100.0`
        ).run(enrollment.id, user.id, s.courseId);
      } catch (sqErr) {
        // ignore
      }
    }

    // --- STEP C: Unlock All Modules in the Course ---
    const modules = await queryAllNeon('SELECT id, title, order_index FROM modules WHERE course_id = $1 ORDER BY order_index ASC', [s.courseId]);
    for (const mod of modules) {
      const mpId = `mp-${crypto.randomUUID().slice(0, 12)}`;
      await runNeonQuery(
        `INSERT INTO module_progress (id, enrollment_id, module_id, user_id, is_unlocked, is_completed, completed_at)
         VALUES ($1, $2, $3, $4, true, true, NOW())
         ON CONFLICT (enrollment_id, module_id) DO UPDATE
         SET is_unlocked = true, is_completed = true, completed_at = NOW()`,
        [mpId, enrollment.id, mod.id, user.id]
      );

      if (localDb) {
        try {
          localDb.prepare(
            `INSERT INTO module_progress (id, enrollment_id, module_id, user_id, is_unlocked, is_completed, completed_at)
             VALUES (?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
             ON CONFLICT(enrollment_id, module_id) DO UPDATE SET is_unlocked = 1, is_completed = 1`
          ).run(mpId, enrollment.id, mod.id, user.id);
        } catch (sqErr) {
          // ignore
        }
      }
    }
    console.log(`   🔓 Unlocked & completed all ${modules.length} modules for course.`);

    // --- STEP D: Complete All Lessons in the Course ---
    const lessons = await queryAllNeon(
      `SELECT l.id, l.title
       FROM lessons l
       JOIN modules m ON l.module_id = m.id
       WHERE m.course_id = $1`,
      [s.courseId]
    );
    for (const les of lessons) {
      const lpId = `lp-${crypto.randomUUID().slice(0, 12)}`;
      await runNeonQuery(
        `INSERT INTO lesson_progress (id, enrollment_id, lesson_id, user_id, status, watched_progress_percent, completed_at)
         VALUES ($1, $2, $3, $4, 'COMPLETED', 100.0, NOW())
         ON CONFLICT (enrollment_id, lesson_id) DO UPDATE
         SET status = 'COMPLETED', watched_progress_percent = 100.0, completed_at = NOW()`,
        [lpId, enrollment.id, les.id, user.id]
      );

      if (localDb) {
        try {
          localDb.prepare(
            `INSERT INTO lesson_progress (id, enrollment_id, lesson_id, user_id, status, watched_progress_percent, completed_at)
             VALUES (?, ?, ?, ?, 'COMPLETED', 100.0, CURRENT_TIMESTAMP)
             ON CONFLICT(enrollment_id, lesson_id) DO UPDATE SET status = 'COMPLETED', watched_progress_percent = 100.0`
          ).run(lpId, enrollment.id, les.id, user.id);
        } catch (sqErr) {
          // ignore
        }
      }
    }
    console.log(`   📖 Completed all ${lessons.length} lessons with 100% progress.`);

    // --- STEP E: Generate Distinct Verified Certificate ---
    let cert = await queryOneNeon('SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2', [user.id, s.courseId]);
    if (!cert) {
      highestCodeNum++;
      const certCode = `CFWD-2026-${highestCodeNum}`;
      const certId = `cert-${crypto.randomUUID().slice(0, 10)}`;
      const verificationUrl = `https://www.codificator.org/verify/${certCode}`;

      await runNeonQuery(
        `INSERT INTO certificates (id, certificate_code, user_id, course_id, enrollment_id, issue_date, completion_date, template_version, verification_url)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), 'v2', $6)
         ON CONFLICT (enrollment_id) DO NOTHING`,
        [certId, certCode, user.id, s.courseId, enrollment.id, verificationUrl]
      );

      cert = await queryOneNeon('SELECT * FROM certificates WHERE id = $1', [certId]);
      console.log(`   📜 Issued Verified Certificate: ${certCode}`);
      console.log(`   🔗 Verification Link: ${verificationUrl}`);
    } else {
      console.log(`   📜 Student already has certificate: ${cert.certificate_code}`);
    }

    if (localDb && cert) {
      try {
        localDb.prepare(
          `INSERT INTO certificates (id, certificate_code, user_id, course_id, enrollment_id, issue_date, completion_date, template_version, verification_url)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'v2', ?)
           ON CONFLICT(id) DO NOTHING`
        ).run(cert.id, cert.certificate_code, user.id, s.courseId, enrollment.id, cert.verification_url || `https://www.codificator.org/verify/${cert.certificate_code}`);
      } catch (sqErr) {
        // ignore
      }
    }

    results.push({
      name: s.name,
      email: s.email,
      courseId: s.courseId,
      certificateCode: cert?.certificate_code,
      verificationUrl: `https://www.codificator.org/verify/${cert?.certificate_code}`
    });
  }

  console.log('\n======================================================');
  console.log(`🎉 ALL ${results.length} STUDENTS IMPORTED AND CERTIFIED SUCCESSFULLY!`);
  console.log('======================================================');
  console.table(results);
}

main().catch(err => {
  console.error('❌ Error executing student import:', err);
  process.exit(1);
});
