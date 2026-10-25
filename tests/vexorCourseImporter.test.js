import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codificator-vexor-import-'));
process.env.LMS_DB_PATH = path.join(testDirectory, 'lms.db');

const { db, queryAll, queryOne, runQuery } = await import('../server/db/db.js');

try {
  runQuery(
    `INSERT INTO users (id, email, name, role)
     VALUES ('usr-instructor-1', 'instructor@example.test', 'Test Instructor', 'INSTRUCTOR')`
  );

  const { syncVexorCourses } = await import('../server/services/vexorCourseImporter.js');
  const firstRun = syncVexorCourses();
  const editedLessonId = 'vx-vx-vexor-python-1-1';
  runQuery(
    'UPDATE lessons SET text_content = ?, is_admin_modified = 1 WHERE id = ?',
    ['Admin-managed course content', editedLessonId]
  );
  const secondRun = syncVexorCourses();

  assert.deepEqual(firstRun, {
    courseCount: 4,
    moduleCount: 16,
    lessonCount: 112,
    quizQuestionCount: 84
  });
  assert.deepEqual(secondRun, firstRun);

  for (const courseId of ['vexor-python', 'vexor-fullstack', 'vexor-cpp', 'vexor-dsa']) {
    const course = queryOne(
      'SELECT price, original_price, is_published FROM courses WHERE id = ?',
      [courseId]
    );
    assert.deepEqual({ ...course }, { price: 199, original_price: 299, is_published: 1 });
    assert.equal(
      queryOne('SELECT COUNT(*) AS count FROM modules WHERE course_id = ?', [courseId]).count,
      4
    );
    assert.equal(
      queryOne(
        `SELECT COUNT(*) AS count
         FROM lessons l
         JOIN modules m ON m.id = l.module_id
         WHERE m.course_id = ?`,
        [courseId]
      ).count,
      28
    );
    assert.equal(
      queryOne(
        `SELECT COUNT(*) AS count
         FROM quizzes q
         JOIN modules m ON m.id = q.module_id
         WHERE m.course_id = ?`,
        [courseId]
      ).count,
      4
    );
  }

  assert.equal(queryOne('SELECT COUNT(*) AS count FROM courses WHERE id LIKE ?', ['vexor-%']).count, 4);
  assert.equal(queryOne('SELECT COUNT(*) AS count FROM lessons WHERE id LIKE ?', ['vx-vx-vexor-%']).count, 112);
  assert.equal(queryOne('SELECT COUNT(*) AS count FROM quiz_questions WHERE id LIKE ?', ['vx-vx-vexor-%']).count, 84);

  const sampleLesson = queryOne('SELECT text_content, lesson_type FROM lessons WHERE id = ?', [editedLessonId]);
  assert.equal(sampleLesson.lesson_type, 'CODE');
  assert.match(sampleLesson.text_content, /Admin-managed course content/);
  assert.match(
    queryAll(
      'SELECT text_content FROM lessons WHERE id = ?',
      ['vx-vx-vexor-python-1-2']
    )[0].text_content,
    /Topic 1|Expected output/
  );

  const correctOptionCounts = queryAll(
    `SELECT COUNT(*) AS count
     FROM quiz_options o
     JOIN quiz_questions q ON q.id = o.question_id
     WHERE q.id LIKE 'vx-vx-vexor-%' AND o.is_correct = 1
     GROUP BY q.id`
  );
  assert.equal(correctOptionCounts.length, 84);
  assert.ok(correctOptionCounts.every(row => row.count === 1));

  const { default: learningRoutes } = await import('../server/routes/learningRoutes.js');
  const app = express();
  app.use('/api/learning', learningRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const { port } = server.address();
    const headers = { Authorization: 'Bearer usr-instructor-1' };
    const missingCourse = await fetch(`http://127.0.0.1:${port}/api/learning/stale-course/curriculum`, { headers });
    assert.equal(missingCourse.status, 404);
    assert.deepEqual(await missingCourse.json(), { error: 'Course not found' });

    const missingLessonCourse = await fetch(
      `http://127.0.0.1:${port}/api/learning/stale-course/lessons/stale-lesson`,
      { headers }
    );
    assert.equal(missingLessonCourse.status, 404);
    assert.deepEqual(await missingLessonCourse.json(), { error: 'Course not found' });
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }

  console.log('Vexor course importer tests passed.');
} finally {
  db.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
}
