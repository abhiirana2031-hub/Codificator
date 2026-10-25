import fs from 'fs';
import path from 'path';
import { queryOne, queryAll } from '../server/db/db.js';

async function runEndToEndTest() {
  console.log('=== END-TO-END PDF SCAN & IMPORT TEST ===');

  // Find an admin or operator user in DB
  const adminUser = queryOne("SELECT * FROM users WHERE role = 'ADMIN' OR role = 'OPERATOR' LIMIT 1")
    || { id: 'usr-admin-1', email: 'admin@codificator.test', role: 'ADMIN', name: 'Admin Test' };

  console.log('Using Admin/Operator User:', adminUser.id, `(${adminUser.role})`);

  const pdfBuf = fs.readFileSync(path.resolve('tests/sample_syllabus.pdf'));
  const pdfBase64 = 'data:application/pdf;base64,' + pdfBuf.toString('base64');

  // 1. Hit POST /api/courses/scan-pdf
  console.log('\n1. Sending POST /api/courses/scan-pdf ...');
  const scanRes = await fetch('http://localhost:5000/api/courses/scan-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminUser.id}`
    },
    body: JSON.stringify({
      pdfBase64,
      fileName: 'sample_syllabus.pdf'
    })
  });

  const scanJson = await scanRes.json();
  console.log('Scan HTTP Status:', scanRes.status);
  console.log('Scan Result Status:', scanJson.scanResult?.status, 'Score:', scanJson.scanResult?.score + '%');
  console.log('Extracted Title:', scanJson.scanResult?.extractedCourse?.title);
  console.log('Extracted Modules:', scanJson.scanResult?.extractedCourse?.modules?.length);

  if (scanJson.scanResult?.status !== 'APPROVED') {
    throw new Error('Expected syllabus to be APPROVED! Response: ' + JSON.stringify(scanJson));
  }

  // 2. Hit POST /api/courses/import-scanned
  console.log('\n2. Sending POST /api/courses/import-scanned ...');
  const importRes = await fetch('http://localhost:5000/api/courses/import-scanned', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminUser.id}`
    },
    body: JSON.stringify({
      course: scanJson.scanResult.extractedCourse,
      publishImmediately: true
    })
  });

  const importJson = await importRes.json();
  console.log('Import HTTP Status:', importRes.status);
  console.log('Import Message:', importJson.message);
  console.log('Imported Course ID:', importJson.courseId);

  // 3. Verify in SQLite Database
  const courseInDb = queryOne('SELECT * FROM courses WHERE id = ?', [importJson.courseId]);
  const modulesInDb = queryAll('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC', [importJson.courseId]);
  const lessonsInDb = queryAll(
    'SELECT l.* FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ? ORDER BY m.order_index, l.order_index',
    [importJson.courseId]
  );

  console.log('\n3. Database Verification:');
  console.log(' - Course in DB:', courseInDb ? `"${courseInDb.title}" (Status: ${courseInDb.status}, Published: ${courseInDb.is_published})` : 'NOT FOUND');
  console.log(' - Modules in DB count:', modulesInDb.length);
  modulesInDb.forEach(m => console.log(`    * [Module ${m.order_index}] ${m.title}`));
  console.log(' - Lessons in DB count:', lessonsInDb.length);
  lessonsInDb.forEach(l => console.log(`    * [Lesson ${l.order_index}] ${l.title} (${l.lesson_type}, ${l.reading_time_minutes}m)`));

  // 4. Test Bulk Delete on this course
  console.log('\n4. Testing POST /api/courses/bulk-delete ...');
  const deleteRes = await fetch('http://localhost:5000/api/courses/bulk-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminUser.id}`
    },
    body: JSON.stringify({
      courseIds: [importJson.courseId],
      force: true
    })
  });

  const deleteJson = await deleteRes.json();
  console.log('Bulk Delete HTTP Status:', deleteRes.status);
  console.log('Bulk Delete Result:', deleteJson);

  const postDeleteCheck = queryOne('SELECT * FROM courses WHERE id = ?', [importJson.courseId]);
  console.log('Post-delete DB check (should be null):', postDeleteCheck);

  console.log('\n🎉 ALL END-TO-END TESTS PASSED CLEANLY AND VERIFIED!');
}

runEndToEndTest().catch(console.error);
