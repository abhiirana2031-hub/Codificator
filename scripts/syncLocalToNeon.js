import sqlite3 from 'node:sqlite';
import { runNeonQuery, queryOneNeon, queryAllNeon } from '../server/db/neon.js';

const localDb = new sqlite3.DatabaseSync('./server/db/lms.db');

async function main() {
  console.log('🚀 Starting sync from local SQLite to Neon PostgreSQL...');

  // 1. Sync User Accounts & Fix Roles in Neon
  console.log('--- Step 1: Syncing Admin, Operator, and Student accounts ---');
  const localUsers = localDb.prepare('SELECT * FROM users').all();
  for (const u of localUsers) {
    const existing = await queryOneNeon('SELECT id, email, role FROM users WHERE email = $1', [u.email.toLowerCase()]);
    if (existing) {
      await runNeonQuery(
        `UPDATE users
         SET role = $1, name = $2, firebase_uid = COALESCE($3, firebase_uid), avatar_url = COALESCE($4, avatar_url)
         WHERE id = $5`,
        [u.role, u.name, u.firebase_uid, u.avatar_url, existing.id]
      );
      console.log(`Updated user ${u.email}: role => ${u.role}`);
    } else {
      await runNeonQuery(
        `INSERT INTO users (id, email, password_hash, name, role, firebase_uid, avatar_url, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, firebase_uid = EXCLUDED.firebase_uid`,
        [u.id, u.email.toLowerCase(), u.password_hash || 'oauth:firebase', u.name, u.role, u.firebase_uid, u.avatar_url]
      );
      console.log(`Inserted user ${u.email}: role => ${u.role}`);
    }
  }

  // Double check user roles specifically requested
  await runNeonQuery("UPDATE users SET role = 'ADMIN' WHERE email = 'abhayrana8272@gmail.com'");
  await runNeonQuery("UPDATE users SET role = 'OPERATOR' WHERE email = 'vexoritsolutions@gmail.com'");

  // 2. Sync Courses from local SQLite to Neon
  console.log('--- Step 2: Syncing Vexor Courses ---');
  const localCourses = localDb.prepare('SELECT * FROM courses').all();
  for (const c of localCourses) {
    await runNeonQuery(
      `INSERT INTO courses (
        id, title, slug, description, thumbnail, category, level, instructor_id,
        estimated_duration, price, original_price, is_published, status,
        learning_objectives, prerequisites, completion_requirements
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        thumbnail = EXCLUDED.thumbnail,
        category = EXCLUDED.category,
        level = EXCLUDED.level,
        is_published = EXCLUDED.is_published,
        status = EXCLUDED.status,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        learning_objectives = EXCLUDED.learning_objectives,
        prerequisites = EXCLUDED.prerequisites,
        completion_requirements = EXCLUDED.completion_requirements`,
      [
        c.id, c.title, c.slug, c.description, c.thumbnail, c.category, c.level,
        c.instructor_id || 'usr-instructor-1', c.estimated_duration, c.price || 199,
        c.original_price || 299, Boolean(c.is_published), c.status || 'PUBLISHED',
        c.learning_objectives || '[]', c.prerequisites || '[]', c.completion_requirements || '{}'
      ]
    );
    console.log(`Synced course: ${c.id} - ${c.title}`);
  }

  // 3. Sync Modules
  console.log('--- Step 3: Syncing Modules ---');
  const localModules = localDb.prepare('SELECT * FROM modules').all();
  for (const m of localModules) {
    await runNeonQuery(
      `INSERT INTO modules (
        id, course_id, title, description, order_index, estimated_duration,
        is_published, completion_policy, min_passing_score, prerequisite_module_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        order_index = EXCLUDED.order_index,
        estimated_duration = EXCLUDED.estimated_duration,
        is_published = EXCLUDED.is_published,
        completion_policy = EXCLUDED.completion_policy,
        min_passing_score = EXCLUDED.min_passing_score,
        prerequisite_module_id = EXCLUDED.prerequisite_module_id`,
      [
        m.id, m.course_id, m.title, m.description, m.order_index,
        m.estimated_duration, Boolean(m.is_published), m.completion_policy || 'POLICY_B_QUIZ',
        m.min_passing_score || 70, m.prerequisite_module_id
      ]
    );
  }
  console.log(`Synced ${localModules.length} modules.`);

  // 4. Sync Lessons
  console.log('--- Step 4: Syncing Lessons ---');
  await runNeonQuery('ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_markdown TEXT;');
  await runNeonQuery('ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT FALSE;');
  await runNeonQuery('ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_admin_modified BOOLEAN DEFAULT FALSE;');
  await runNeonQuery("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'IMPORTER';");

  const localLessons = localDb.prepare('SELECT * FROM lessons').all();
  for (const l of localLessons) {
    await runNeonQuery(
      `INSERT INTO lessons (
        id, module_id, title, description, lesson_type, text_content, content_markdown,
        duration_minutes, reading_time_minutes, key_takeaways, order_index,
        is_mandatory, is_preview, is_admin_modified, source_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        lesson_type = EXCLUDED.lesson_type,
        text_content = EXCLUDED.text_content,
        content_markdown = EXCLUDED.content_markdown,
        duration_minutes = EXCLUDED.duration_minutes,
        reading_time_minutes = EXCLUDED.reading_time_minutes,
        key_takeaways = EXCLUDED.key_takeaways,
        order_index = EXCLUDED.order_index,
        is_mandatory = EXCLUDED.is_mandatory,
        is_preview = EXCLUDED.is_preview,
        source_type = EXCLUDED.source_type`,
      [
        l.id, l.module_id, l.title, l.description, l.lesson_type || 'CODE',
        l.text_content, l.content_markdown, l.duration_minutes || 15,
        l.reading_time_minutes || 10, l.key_takeaways || '[]', l.order_index,
        Boolean(l.is_mandatory), Boolean(l.is_preview), Boolean(l.is_admin_modified),
        l.source_type || 'VEXOR_IMPORT'
      ]
    );
  }
  console.log(`Synced ${localLessons.length} lessons.`);

  // 5. Sync Quizzes, Questions, Options
  console.log('--- Step 5: Syncing Quizzes and Questions ---');
  const localQuizzes = localDb.prepare('SELECT * FROM quizzes').all();
  for (const q of localQuizzes) {
    await runNeonQuery(
      `INSERT INTO quizzes (
        id, module_id, title, description, passing_percentage, time_limit_minutes,
        max_attempts, is_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        passing_percentage = EXCLUDED.passing_percentage`,
      [q.id, q.module_id, q.title, q.description, q.passing_percentage || 70, q.time_limit_minutes || 20, q.max_attempts || 3, Boolean(q.is_required)]
    );
  }

  const localQuestions = localDb.prepare('SELECT * FROM quiz_questions').all();
  for (const qq of localQuestions) {
    await runNeonQuery(
      `INSERT INTO quiz_questions (
        id, quiz_id, prompt, question_type, marks, explanation, order_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        prompt = EXCLUDED.prompt,
        explanation = EXCLUDED.explanation,
        order_index = EXCLUDED.order_index`,
      [qq.id, qq.quiz_id, qq.prompt, qq.question_type || 'SINGLE_CHOICE', qq.marks || 1, qq.explanation, qq.order_index]
    );
  }

  const localOptions = localDb.prepare('SELECT * FROM quiz_options').all();
  for (const qo of localOptions) {
    await runNeonQuery(
      `INSERT INTO quiz_options (
        id, question_id, text, is_correct, order_index
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        text = EXCLUDED.text,
        is_correct = EXCLUDED.is_correct,
        order_index = EXCLUDED.order_index`,
      [qo.id, qo.question_id, qo.text, Boolean(qo.is_correct), qo.order_index]
    );
  }
  console.log(`Synced ${localQuizzes.length} quizzes, ${localQuestions.length} questions, ${localOptions.length} options.`);

  // 6. Sync Enrollments for Abhay Rana
  console.log('--- Step 6: Syncing Enrollments ---');
  const targetUserId = 'usr-zL2hlxayqNUI';
  const targetCourseId = 'vexor-fullstack';
  const targetEnrollmentId = 'enr-1792872925535-t0a3w';

  await runNeonQuery(
    `INSERT INTO enrollments (
      id, user_id, course_id, status, enrolled_at, completed_at, progress_percent
    ) VALUES ($1, $2, $3, 'COMPLETED', CURRENT_TIMESTAMP - interval '4 days', CURRENT_TIMESTAMP - interval '4 days', 100)
    ON CONFLICT (user_id, course_id) DO UPDATE SET
      status = 'COMPLETED',
      progress_percent = 100,
      completed_at = CURRENT_TIMESTAMP - interval '4 days'`,
    [targetEnrollmentId, targetUserId, targetCourseId]
  );

  // Also in local sqlite
  try {
    localDb.prepare(`
      INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at, completed_at, progress_percent)
      VALUES (?, ?, ?, 'COMPLETED', datetime('now', '-4 days'), datetime('now', '-4 days'), 100)
      ON CONFLICT(user_id, course_id) DO UPDATE SET status = 'COMPLETED', progress_percent = 100, completed_at = datetime('now', '-4 days')
    `).run(targetEnrollmentId, targetUserId, targetCourseId);
  } catch (e) {
    console.log('SQLite enrollment note:', e.message);
  }

  // 7. Seed Certificate CFWD-2026-10427 for Abhay Rana
  console.log('--- Step 7: Seeding Certificate CFWD-2026-10427 ---');
  const certCode = 'CFWD-2026-10427';
  const certId = 'cert-cfwd-2026-10427';

  await runNeonQuery(
    `INSERT INTO certificates (
      id, certificate_code, user_id, course_id, enrollment_id, issue_date, completion_date, template_version, verification_url
    ) VALUES ($1, $2, $3, $4, $5, '2026-10-21 00:00:00', '2026-10-21 00:00:00', 'v1', $6)
    ON CONFLICT (certificate_code) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      course_id = EXCLUDED.course_id,
      issue_date = EXCLUDED.issue_date,
      completion_date = EXCLUDED.completion_date,
      verification_url = EXCLUDED.verification_url`,
    [certId, certCode, targetUserId, targetCourseId, targetEnrollmentId, `/verify/${certCode}`]
  );

  // Also in local SQLite
  try {
    localDb.prepare(`
      INSERT INTO certificates (id, certificate_code, user_id, course_id, enrollment_id, issue_date, completion_date, template_version, verification_url)
      VALUES (?, ?, ?, ?, ?, '2026-10-21 00:00:00', '2026-10-21 00:00:00', 'v1', ?)
      ON CONFLICT(certificate_code) DO UPDATE SET user_id = excluded.user_id, course_id = excluded.course_id
    `).run(certId, certCode, targetUserId, targetCourseId, targetEnrollmentId, `/verify/${certCode}`);
  } catch (e) {
    console.log('SQLite cert note:', e.message);
  }

  console.log('✅ Sync completed successfully!');
}

main().catch(console.error);
