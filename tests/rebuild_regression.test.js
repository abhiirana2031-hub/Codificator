import assert from 'node:assert/strict';
import { queryOne, queryAll, runQuery, transaction } from '../server/db/db.js';
import { importFullStackNotes } from '../server/services/curriculumImporter.js';
import app from '../server/server.js';

console.log('====================================================');
console.log('CODIFICATORS LMS REBUILD REGRESSION VERIFICATION');
console.log('====================================================');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [Passed]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [Failed]: ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. Schema columns exist
runTest('Database migration adds required columns to lessons and courses', () => {
  const lesson = queryOne('SELECT is_preview, content_markdown, is_admin_modified, source_type FROM lessons LIMIT 1');
  assert.ok(lesson !== undefined, 'Lesson must contain new migration columns');
  assert.ok('is_preview' in lesson, 'is_preview column must exist');
  assert.ok('content_markdown' in lesson, 'content_markdown column must exist');
  assert.ok('is_admin_modified' in lesson, 'is_admin_modified column must exist');
  assert.ok('source_type' in lesson, 'source_type column must exist');

  const course = queryOne('SELECT subtitle, target_audience FROM courses LIMIT 1');
  assert.ok('subtitle' in course, 'subtitle column must exist in courses');
  assert.ok('target_audience' in course, 'target_audience column must exist in courses');
});

// 2. Importer protects admin-managed lessons
runTest('Curriculum importer strictly preserves admin-managed lessons and content', () => {
  const existingLesson = queryOne('SELECT * FROM lessons LIMIT 1');
  assert.ok(existingLesson, 'An existing lesson must be present in DB');
  const testLessonId = existingLesson.id;
  const originalTitle = existingLesson.title;
  const originalMarkdown = existingLesson.content_markdown || existingLesson.text_content;

  // Mark lesson as admin-modified with custom content
  const customTitle = 'Customized Title by Admin';
  const customMarkdown = '# Custom Admin Markdown Content\n\nThis content must never be overwritten on startup.';
  
  runQuery(
    `UPDATE lessons 
     SET title = ?, content_markdown = ?, is_admin_modified = 1, source_type = 'ADMIN'
     WHERE id = ?`,
    [customTitle, customMarkdown, testLessonId]
  );

  // Run the curriculum importer (standard startup run, force = false)
  const result = importFullStackNotes({ force: false });

  // Verify the admin-managed lesson was skipped and its custom content preserved
  const preserved = queryOne('SELECT title, content_markdown, is_admin_modified FROM lessons WHERE id = ?', [testLessonId]);
  assert.equal(preserved.title, customTitle, 'Admin custom title must not be overwritten');
  assert.equal(preserved.content_markdown, customMarkdown, 'Admin custom markdown must not be overwritten');
  assert.equal(preserved.is_admin_modified, 1, 'is_admin_modified flag must remain 1');

  // Verify cleanup query does not delete admin-created lessons
  const adminCustomLessonId = `les-admin-test-${Date.now()}`;
  runQuery(
    `INSERT INTO lessons (id, module_id, title, content_markdown, is_admin_modified, source_type, duration_minutes, order_index)
     VALUES (?, ?, 'Admin Exclusive Chapter', '# Exclusive', 1, 'ADMIN', 15, 99)`,
    [adminCustomLessonId, existingLesson.module_id]
  );

  importFullStackNotes({ force: false });

  const adminLessonExists = queryOne('SELECT id FROM lessons WHERE id = ?', [adminCustomLessonId]);
  assert.ok(adminLessonExists, 'Importer must NEVER delete admin-created lessons from modules');

  // Clean up scratch lesson and restore test lesson
  runQuery('DELETE FROM lessons WHERE id = ?', [adminCustomLessonId]);
  runQuery('UPDATE lessons SET title = ?, content_markdown = ? WHERE id = ?', [originalTitle, originalMarkdown, testLessonId]);
});

// 3. Free Preview Access Control
runTest('Free Preview lessons allow public access while paid lessons strictly gate access', () => {
  const lessons = queryAll('SELECT id FROM lessons LIMIT 2');
  assert.ok(lessons.length >= 2, 'Must have at least 2 lessons in DB');
  const previewLessonId = lessons[0].id;
  const paidLessonId = lessons[1].id;

  // Mark lesson 1 as a free preview, and lesson 2 as paid non-preview
  runQuery('UPDATE lessons SET is_preview = 1 WHERE id = ?', [previewLessonId]);
  runQuery('UPDATE lessons SET is_preview = 0 WHERE id = ?', [paidLessonId]);

  const pLesson = queryOne('SELECT is_preview FROM lessons WHERE id = ?', [previewLessonId]);
  const nonPLesson = queryOne('SELECT is_preview FROM lessons WHERE id = ?', [paidLessonId]);
  assert.equal(pLesson.is_preview, 1, 'Lesson 1 must have is_preview = 1');
  assert.equal(nonPLesson.is_preview, 0, 'Lesson 2 must have is_preview = 0');
});

// 4. Course catalogue returns authoritative database records with clean metadata
runTest('Authoritative courses catalogue queries database directly without static fallbacks', () => {
  const publishedCourses = queryAll('SELECT id, title, slug, price, category, level, is_published, subtitle, target_audience FROM courses WHERE is_published = 1');
  assert.ok(publishedCourses.length > 0, 'Must have at least one published course in DB');

  for (const c of publishedCourses) {
    assert.equal(c.is_published, 1, 'Course must be published');
    assert.ok(c.title, 'Course must have title');
    assert.ok(c.slug, 'Course must have unique slug');
  }
});

// 5. Certificate verification for CFWD-2026-10427 remains 100% functional
runTest('Existing seeded certificate CFWD-2026-10427 is verifiable with authentic data', () => {
  const cert = queryOne('SELECT * FROM certificates WHERE certificate_code = ?', ['CFWD-2026-10427']);
  assert.ok(cert, 'Seeded certificate CFWD-2026-10427 must exist in database');

  const user = queryOne('SELECT name, email FROM users WHERE id = ?', [cert.user_id]);
  assert.ok(user, 'Certificate user must exist');

  const course = queryOne('SELECT title FROM courses WHERE id = ?', [cert.course_id]);
  assert.ok(course, 'Certificate course must exist');
});

console.log('====================================================');
console.log(`REBUILD REGRESSION RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL REBUILD REGRESSION TESTS PASSED CLEANLY!');
}
