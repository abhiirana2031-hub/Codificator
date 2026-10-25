import express from 'express';
import { queryAll, queryOne, runQuery, transaction } from '../db/db.js';
import { requireAuth, requireRole, logAudit } from '../middleware/auth.js';
import { canManageCourse } from '../services/courseAuthorization.js';

const router = express.Router();

// Get complete curriculum for course builder (Restricted to Course Operators, Admins, and Instructors)
router.get('/courses/:courseId/curriculum', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { courseId } = req.params;
  const course = queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  if (!canManageCourse(courseId, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to view or edit this course curriculum' });
  }

  const modules = queryAll(
    'SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC',
    [courseId]
  );

  const enhancedModules = modules.map(m => {
    const lessons = queryAll(
      'SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index ASC',
      [m.id]
    ).map(l => {
      const resources = queryAll('SELECT * FROM lesson_resources WHERE lesson_id = ?', [l.id]);
      return {
        ...l,
        is_mandatory: Boolean(l.is_mandatory),
        resources
      };
    });

    const quiz = queryOne('SELECT * FROM quizzes WHERE module_id = ?', [m.id]);
    let quizDetails = null;
    if (quiz) {
      const questions = queryAll('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC', [quiz.id]);
      const enhancedQuestions = questions.map(q => {
        const options = queryAll('SELECT * FROM quiz_options WHERE question_id = ? ORDER BY order_index ASC', [q.id]);
        return {
          ...q,
          options: options.map(o => ({ ...o, is_correct: Boolean(o.is_correct) }))
        };
      });
      quizDetails = {
        ...quiz,
        questions: enhancedQuestions
      };
    }

    const assignment = queryOne('SELECT * FROM assignments WHERE module_id = ?', [m.id]);

    return {
      ...m,
      is_published: Boolean(m.is_published),
      lessons,
      quiz: quizDetails,
      assignment
    };
  });

  return res.json({ course, modules: enhancedModules });
});

// Create Module
router.post('/courses/:courseId/modules', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { courseId } = req.params;
  const { title, description, estimated_duration, completion_policy, min_passing_score, prerequisite_module_id } = req.body;

  if (!title) return res.status(400).json({ error: 'Module title is required' });

  if (!canManageCourse(courseId, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to add modules to this course' });
  }

  const count = queryOne('SELECT COUNT(*) as count FROM modules WHERE course_id = ?', [courseId]).count;
  const moduleId = `mod-${Date.now()}`;

  runQuery(
    `INSERT INTO modules (
      id, course_id, title, description, order_index, estimated_duration,
      is_published, completion_policy, min_passing_score, prerequisite_module_id
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [
      moduleId,
      courseId,
      title,
      description || '',
      count + 1,
      estimated_duration || '2 hours',
      completion_policy || 'POLICY_A_LESSONS',
      min_passing_score ? Number(min_passing_score) : 70.0,
      prerequisite_module_id || null
    ]
  );

  logAudit(req.user.id, 'MODULE_CREATED', 'MODULE', moduleId, { title });
  const created = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  return res.status(201).json({ module: created });
});

// Update Module
router.put('/modules/:moduleId', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { moduleId } = req.params;
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  if (!canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to modify this course module' });
  }

  const { title, description, estimated_duration, completion_policy, min_passing_score, prerequisite_module_id, is_published } = req.body;

  runQuery(
    `UPDATE modules
     SET title = COALESCE(?, title),
         description = COALESCE(?, description),
         estimated_duration = COALESCE(?, estimated_duration),
         completion_policy = COALESCE(?, completion_policy),
         min_passing_score = COALESCE(?, min_passing_score),
         prerequisite_module_id = ?,
         is_published = COALESCE(?, is_published),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title,
      description,
      estimated_duration,
      completion_policy,
      min_passing_score !== undefined ? Number(min_passing_score) : null,
      prerequisite_module_id === '' ? null : prerequisite_module_id,
      is_published !== undefined ? (is_published ? 1 : 0) : null,
      moduleId
    ]
  );

  logAudit(req.user.id, 'MODULE_UPDATED', 'MODULE', moduleId);
  const updated = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  return res.json({ module: updated });
});

// Delete Module (with safe progress check)
router.delete('/modules/:moduleId', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { moduleId } = req.params;
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  if (!canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to delete this module' });
  }

  // Safe check
  const hasProgress = queryOne(
    `SELECT lp.id FROM lesson_progress lp
     JOIN lessons l ON lp.lesson_id = l.id
     WHERE l.module_id = ? AND lp.status = 'COMPLETED' LIMIT 1`,
    [moduleId]
  );

  if (hasProgress && req.query.force !== 'true') {
    return res.status(400).json({
      error: 'Cannot delete module with completed student lessons. Please archive or unpublish instead.'
    });
  }

  runQuery('DELETE FROM modules WHERE id = ?', [moduleId]);
  logAudit(req.user.id, 'MODULE_DELETED', 'MODULE', moduleId, { title: mod.title });
  return res.json({ success: true, message: `Module "${mod.title}" was deleted.` });
});

// Duplicate Module (and its nested lessons, quizzes, assignments)
router.post('/courses/:courseId/modules/:moduleId/duplicate', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { courseId, moduleId } = req.params;
  if (!canManageCourse(courseId, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to duplicate modules in this course' });
  }

  const sourceMod = queryOne('SELECT * FROM modules WHERE id = ? AND course_id = ?', [moduleId, courseId]);
  if (!sourceMod) return res.status(404).json({ error: 'Module not found in this course' });

  const modCount = queryOne('SELECT COUNT(*) as count FROM modules WHERE course_id = ?', [courseId]).count;
  const newModuleId = `mod-${Date.now()}`;

  transaction(() => {
    runQuery(
      `INSERT INTO modules (
        id, course_id, title, description, order_index, estimated_duration,
        is_published, completion_policy, min_passing_score, prerequisite_module_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newModuleId,
        courseId,
        `${sourceMod.title} (Copy)`,
        sourceMod.description,
        modCount + 1,
        sourceMod.estimated_duration,
        sourceMod.is_published,
        sourceMod.completion_policy,
        sourceMod.min_passing_score,
        sourceMod.prerequisite_module_id
      ]
    );

    // Duplicate lessons
    const sourceLessons = queryAll('SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index ASC', [moduleId]);
    for (let lIdx = 0; lIdx < sourceLessons.length; lIdx++) {
      const l = sourceLessons[lIdx];
      const newLessonId = `les-${Date.now()}-${lIdx}`;
      runQuery(
        `INSERT INTO lessons (
          id, module_id, title, description, lesson_type, video_asset_id,
          video_url, text_content, pdf_url, duration_minutes, reading_time_minutes,
          key_takeaways, order_index, is_mandatory, video_threshold_percent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newLessonId,
          newModuleId,
          l.title,
          l.description,
          l.lesson_type,
          l.video_asset_id,
          l.video_url,
          l.text_content,
          l.pdf_url,
          l.duration_minutes,
          l.reading_time_minutes,
          l.key_takeaways,
          l.order_index,
          l.is_mandatory,
          l.video_threshold_percent
        ]
      );

      // Duplicate resources
      const resources = queryAll('SELECT * FROM lesson_resources WHERE lesson_id = ?', [l.id]);
      for (let rIdx = 0; rIdx < resources.length; rIdx++) {
        const r = resources[rIdx];
        runQuery(
          `INSERT INTO lesson_resources (id, lesson_id, title, file_url, file_type, file_size)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [`res-${Date.now()}-${lIdx}-${rIdx}`, newLessonId, r.title, r.file_url, r.file_type, r.file_size]
        );
      }
    }

    // Duplicate quiz
    const sourceQuiz = queryOne('SELECT * FROM quizzes WHERE module_id = ?', [moduleId]);
    if (sourceQuiz) {
      const newQuizId = `quiz-${Date.now()}`;
      runQuery(
        `INSERT INTO quizzes (
          id, module_id, title, description, passing_percentage, time_limit_minutes, max_attempts, is_required
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newQuizId,
          newModuleId,
          sourceQuiz.title,
          sourceQuiz.description,
          sourceQuiz.passing_percentage,
          sourceQuiz.time_limit_minutes,
          sourceQuiz.max_attempts,
          sourceQuiz.is_required
        ]
      );

      const questions = queryAll('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC', [sourceQuiz.id]);
      for (let qIdx = 0; qIdx < questions.length; qIdx++) {
        const q = questions[qIdx];
        const newQId = `q-${Date.now()}-${qIdx}`;
        runQuery(
          `INSERT INTO quiz_questions (id, quiz_id, prompt, question_type, marks, explanation, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [newQId, newQuizId, q.prompt, q.question_type, q.marks, q.explanation, q.order_index]
        );

        const options = queryAll('SELECT * FROM quiz_options WHERE question_id = ? ORDER BY order_index ASC', [q.id]);
        for (let oIdx = 0; oIdx < options.length; oIdx++) {
          const opt = options[oIdx];
          runQuery(
            `INSERT INTO quiz_options (id, question_id, text, is_correct, order_index)
             VALUES (?, ?, ?, ?, ?)`,
            [`opt-${Date.now()}-${qIdx}-${oIdx}`, newQId, opt.text, opt.is_correct, opt.order_index]
          );
        }
      }
    }

    // Duplicate assignment
    const sourceAsg = queryOne('SELECT * FROM assignments WHERE module_id = ?', [moduleId]);
    if (sourceAsg) {
      runQuery(
        `INSERT INTO assignments (
          id, module_id, title, instructions, max_marks, due_date, is_required, accepted_types, rubric
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `asg-${Date.now()}`,
          newModuleId,
          sourceAsg.title,
          sourceAsg.instructions,
          sourceAsg.max_marks,
          sourceAsg.due_date,
          sourceAsg.is_required,
          sourceAsg.accepted_types,
          sourceAsg.rubric
        ]
      );
    }
  });

  logAudit(req.user.id, 'MODULE_DUPLICATED', 'MODULE', newModuleId, { sourceModuleId: moduleId });
  const duplicated = queryOne('SELECT * FROM modules WHERE id = ?', [newModuleId]);
  return res.status(201).json({ module: duplicated });
});

// Reorder Modules (Persisted to Database)
router.post('/courses/:courseId/modules/reorder', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { courseId } = req.params;
  const { moduleIds } = req.body; // Array of module IDs in new order

  if (!canManageCourse(courseId, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to reorder modules in this course' });
  }

  if (!Array.isArray(moduleIds)) {
    return res.status(400).json({ error: 'moduleIds array required' });
  }

  transaction(() => {
    moduleIds.forEach((id, index) => {
      runQuery('UPDATE modules SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [index + 1, id]);
    });
  });

  logAudit(req.user.id, 'MODULES_REORDERED', 'COURSE', req.params.courseId, { order: moduleIds });
  return res.json({ success: true, message: 'Module order updated successfully.' });
});

// Create Lesson
router.post('/modules/:moduleId/lessons', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { moduleId } = req.params;
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  if (!canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to add lessons to this course' });
  }

  const {
    title,
    description,
    lesson_type,
    video_asset_id,
    video_url,
    text_content,
    pdf_url,
    duration_minutes,
    reading_time_minutes,
    key_takeaways,
    is_mandatory,
    is_preview,
    content_markdown,
    video_threshold_percent
  } = req.body;

  if (!title) return res.status(400).json({ error: 'Lesson title is required' });

  const canonicalMarkdown = content_markdown !== undefined ? content_markdown : (text_content || '');
  const canonicalText = text_content !== undefined ? text_content : canonicalMarkdown;

  const count = queryOne('SELECT COUNT(*) as count FROM lessons WHERE module_id = ?', [moduleId]).count;
  const lessonId = `les-${Date.now()}`;

  // Calculate reading time from text content if not provided
  let calculatedReadingTime = reading_time_minutes ? Number(reading_time_minutes) : null;
  if (!calculatedReadingTime && canonicalMarkdown) {
    const withoutCode = canonicalMarkdown.replace(/```[\s\S]*?```/g, ' ');
    const clean = withoutCode.replace(/!\[.*?\]\(.*?\)/g, ' ').replace(/[#*_`>~-]/g, ' ');
    const words = clean.trim().split(/\s+/).filter(Boolean).length;
    calculatedReadingTime = Math.max(3, Math.ceil(words / 225));
  }

  runQuery(
    `INSERT INTO lessons (
      id, module_id, title, description, lesson_type, video_asset_id,
      video_url, text_content, content_markdown, is_preview, is_admin_modified,
      source_type, pdf_url, duration_minutes, reading_time_minutes,
      key_takeaways, order_index, is_mandatory, video_threshold_percent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ADMIN', ?, ?, ?, ?, ?, ?, ?)`,
    [
      lessonId,
      moduleId,
      title,
      description || '',
      lesson_type || 'TEXT',
      video_asset_id || null,
      video_url || null,
      canonicalText,
      canonicalMarkdown,
      is_preview ? 1 : 0,
      pdf_url || null,
      duration_minutes ? Number(duration_minutes) : (calculatedReadingTime || 15),
      calculatedReadingTime || 15,
      key_takeaways ? (typeof key_takeaways === 'string' ? key_takeaways : JSON.stringify(key_takeaways)) : null,
      count + 1,
      is_mandatory !== undefined ? (is_mandatory ? 1 : 0) : 1,
      video_threshold_percent ? Number(video_threshold_percent) : 90
    ]
  );

  logAudit(req.user.id, 'LESSON_CREATED', 'LESSON', lessonId, { title, is_preview: Boolean(is_preview) });
  const created = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  return res.status(201).json({ lesson: created });
});

// Update Lesson
router.put('/lessons/:lessonId', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { lessonId } = req.params;
  const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [lesson.module_id]);
  if (!mod || !canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to edit lessons in this course' });
  }

  const {
    title,
    description,
    lesson_type,
    video_asset_id,
    video_url,
    text_content,
    content_markdown,
    is_preview,
    pdf_url,
    duration_minutes,
    reading_time_minutes,
    key_takeaways,
    is_mandatory,
    video_threshold_percent
  } = req.body;

  const rawMarkdown = content_markdown !== undefined ? content_markdown : text_content;
  const resolvedMarkdown = rawMarkdown !== undefined ? rawMarkdown : lesson.content_markdown;
  const resolvedText = text_content !== undefined ? text_content : resolvedMarkdown;

  let calculatedReadingTime = reading_time_minutes !== undefined ? Number(reading_time_minutes) : null;
  if (calculatedReadingTime === null && resolvedMarkdown) {
    const withoutCode = resolvedMarkdown.replace(/```[\s\S]*?```/g, ' ');
    const clean = withoutCode.replace(/!\[.*?\]\(.*?\)/g, ' ').replace(/[#*_`>~-]/g, ' ');
    const words = clean.trim().split(/\s+/).filter(Boolean).length;
    calculatedReadingTime = Math.max(3, Math.ceil(words / 225));
  }

  runQuery(
    `UPDATE lessons
     SET title = COALESCE(?, title),
         description = COALESCE(?, description),
         lesson_type = COALESCE(?, lesson_type),
         video_asset_id = COALESCE(?, video_asset_id),
         video_url = COALESCE(?, video_url),
         text_content = COALESCE(?, text_content),
         content_markdown = COALESCE(?, content_markdown),
         is_preview = COALESCE(?, is_preview),
         is_admin_modified = 1,
         source_type = 'ADMIN',
         pdf_url = COALESCE(?, pdf_url),
         duration_minutes = COALESCE(?, duration_minutes),
         reading_time_minutes = COALESCE(?, reading_time_minutes),
         key_takeaways = COALESCE(?, key_takeaways),
         is_mandatory = COALESCE(?, is_mandatory),
         video_threshold_percent = COALESCE(?, video_threshold_percent),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title,
      description,
      lesson_type,
      video_asset_id,
      video_url,
      resolvedText,
      resolvedMarkdown,
      is_preview !== undefined ? (is_preview ? 1 : 0) : null,
      pdf_url,
      duration_minutes !== undefined ? Number(duration_minutes) : null,
      calculatedReadingTime,
      key_takeaways !== undefined ? (typeof key_takeaways === 'string' ? key_takeaways : JSON.stringify(key_takeaways)) : null,
      is_mandatory !== undefined ? (is_mandatory ? 1 : 0) : null,
      video_threshold_percent !== undefined ? Number(video_threshold_percent) : null,
      lessonId
    ]
  );

  logAudit(req.user.id, 'LESSON_UPDATED', 'LESSON', lessonId);
  const updated = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  return res.json({ lesson: updated });
});

// Delete Lesson (with safe progress check)
router.delete('/lessons/:lessonId', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { lessonId } = req.params;
  const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [lesson.module_id]);
  if (!mod || !canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to delete lessons in this course' });
  }

  const hasProgress = queryOne(
    `SELECT id FROM lesson_progress WHERE lesson_id = ? AND status = 'COMPLETED' LIMIT 1`,
    [lessonId]
  );

  if (hasProgress && req.query.force !== 'true') {
    return res.status(400).json({
      error: 'Cannot delete lesson with completed student progress. Archive or unpublish the module instead.'
    });
  }

  runQuery('DELETE FROM lessons WHERE id = ?', [lessonId]);
  logAudit(req.user.id, 'LESSON_DELETED', 'LESSON', lessonId, { title: lesson.title });
  return res.json({ success: true, message: `Lesson "${lesson.title}" was deleted.` });
});

// Duplicate Lesson
router.post('/modules/:moduleId/lessons/:lessonId/duplicate', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { moduleId, lessonId } = req.params;
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  if (!canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to duplicate lessons in this course' });
  }

  const sourceLesson = queryOne('SELECT * FROM lessons WHERE id = ? AND module_id = ?', [lessonId, moduleId]);
  if (!sourceLesson) return res.status(404).json({ error: 'Lesson not found in this module' });

  const count = queryOne('SELECT COUNT(*) as count FROM lessons WHERE module_id = ?', [moduleId]).count;
  const newLessonId = `les-${Date.now()}`;

  transaction(() => {
    runQuery(
      `INSERT INTO lessons (
        id, module_id, title, description, lesson_type, video_asset_id,
        video_url, text_content, pdf_url, duration_minutes, reading_time_minutes,
        key_takeaways, order_index, is_mandatory, video_threshold_percent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newLessonId,
        moduleId,
        `${sourceLesson.title} (Copy)`,
        sourceLesson.description,
        sourceLesson.lesson_type,
        sourceLesson.video_asset_id,
        sourceLesson.video_url,
        sourceLesson.text_content,
        sourceLesson.pdf_url,
        sourceLesson.duration_minutes,
        sourceLesson.reading_time_minutes,
        sourceLesson.key_takeaways,
        count + 1,
        sourceLesson.is_mandatory,
        sourceLesson.video_threshold_percent
      ]
    );

    const resources = queryAll('SELECT * FROM lesson_resources WHERE lesson_id = ?', [lessonId]);
    resources.forEach((r, idx) => {
      runQuery(
        `INSERT INTO lesson_resources (id, lesson_id, title, file_url, file_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`res-${Date.now()}-${idx}`, newLessonId, r.title, r.file_url, r.file_type, r.file_size]
      );
    });
  });

  logAudit(req.user.id, 'LESSON_DUPLICATED', 'LESSON', newLessonId, { sourceLessonId: lessonId });
  const created = queryOne('SELECT * FROM lessons WHERE id = ?', [newLessonId]);
  return res.status(201).json({ lesson: created });
});

// Reorder Lessons (Persisted to Database)
router.post('/modules/:moduleId/lessons/reorder', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { moduleId } = req.params;
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  if (!canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to reorder lessons in this course' });
  }

  const { lessonIds } = req.body; // Array of lesson IDs in new order
  if (!Array.isArray(lessonIds)) {
    return res.status(400).json({ error: 'lessonIds array required' });
  }

  transaction(() => {
    lessonIds.forEach((id, index) => {
      runQuery('UPDATE lessons SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [index + 1, id]);
    });
  });

  logAudit(req.user.id, 'LESSONS_REORDERED', 'MODULE', moduleId, { order: lessonIds });
  return res.json({ success: true, message: 'Lesson order updated successfully.' });
});

// Get Quiz for Module (Instructor Authoring view - includes is_correct)
router.get('/modules/:moduleId/quizzes', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { moduleId } = req.params;
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  if (!canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to view quizzes in this course' });
  }

  const quiz = queryOne('SELECT * FROM quizzes WHERE module_id = ?', [moduleId]);
  if (!quiz) return res.json({ quiz: null });

  const questions = queryAll('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC', [quiz.id]);
  const enhancedQuestions = questions.map(q => {
    const options = queryAll('SELECT * FROM quiz_options WHERE question_id = ? ORDER BY order_index ASC', [q.id]);
    return {
      ...q,
      options: options.map(o => ({ ...o, is_correct: Boolean(o.is_correct) }))
    };
  });

  return res.json({ quiz: { ...quiz, questions: enhancedQuestions } });
});

// Create or Update Quiz for a Module
router.post('/modules/:moduleId/quizzes', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { moduleId } = req.params;
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  if (!canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to manage quizzes in this course' });
  }

  const { title, description, passing_percentage, time_limit_minutes, max_attempts, is_required, questions } = req.body;

  let quiz = queryOne('SELECT * FROM quizzes WHERE module_id = ?', [moduleId]);
  const quizId = quiz ? quiz.id : `quiz-${Date.now()}`;

  transaction(() => {
    if (quiz) {
      runQuery(
        `UPDATE quizzes
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             passing_percentage = COALESCE(?, passing_percentage),
             time_limit_minutes = COALESCE(?, time_limit_minutes),
             max_attempts = COALESCE(?, max_attempts),
             is_required = COALESCE(?, is_required)
         WHERE id = ?`,
        [
          title,
          description,
          passing_percentage !== undefined ? Number(passing_percentage) : null,
          time_limit_minutes !== undefined ? Number(time_limit_minutes) : null,
          max_attempts !== undefined ? Number(max_attempts) : null,
          is_required !== undefined ? (is_required ? 1 : 0) : null,
          quizId
        ]
      );
    } else {
      runQuery(
        `INSERT INTO quizzes (
          id, module_id, title, description, passing_percentage, time_limit_minutes, max_attempts, is_required
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quizId,
          moduleId,
          title || `${mod.title} Assessment`,
          description || 'Module Checkpoint Quiz',
          passing_percentage !== undefined ? Number(passing_percentage) : 70.0,
          time_limit_minutes !== undefined ? Number(time_limit_minutes) : 20,
          max_attempts !== undefined ? Number(max_attempts) : 3,
          is_required !== undefined ? (is_required ? 1 : 0) : 1
        ]
      );
    }

    // Insert or replace questions if provided
    if (Array.isArray(questions)) {
      // Remove existing questions and options
      const oldQuestions = queryAll('SELECT id FROM quiz_questions WHERE quiz_id = ?', [quizId]);
      for (const q of oldQuestions) {
        runQuery('DELETE FROM quiz_options WHERE question_id = ?', [q.id]);
      }
      runQuery('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);

      questions.forEach((q, qIdx) => {
        const qId = q.id || `q-${Date.now()}-${qIdx}`;
        runQuery(
          `INSERT INTO quiz_questions (id, quiz_id, prompt, question_type, marks, explanation, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [qId, quizId, q.prompt, q.question_type || 'SINGLE_CHOICE', q.marks || 1.0, q.explanation || '', qIdx + 1]
        );

        if (Array.isArray(q.options)) {
          q.options.forEach((opt, oIdx) => {
            const optId = opt.id || `opt-${Date.now()}-${qIdx}-${oIdx}`;
            runQuery(
              `INSERT INTO quiz_options (id, question_id, text, is_correct, order_index)
               VALUES (?, ?, ?, ?, ?)`,
              [optId, qId, opt.text, opt.is_correct ? 1 : 0, oIdx + 1]
            );
          });
        }
      });
    }

    logAudit(req.user.id, quiz ? 'QUIZ_UPDATED' : 'QUIZ_CREATED', 'QUIZ', quizId);
  });

  const updatedQuiz = queryOne('SELECT * FROM quizzes WHERE id = ?', [quizId]);
  return res.json({ quiz: updatedQuiz });
});

// Get Assignment for Module
router.get('/modules/:moduleId/assignments', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { moduleId } = req.params;
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  if (!canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to view assignments in this course' });
  }

  const assignment = queryOne('SELECT * FROM assignments WHERE module_id = ?', [moduleId]);
  return res.json({ assignment: assignment || null });
});

// Create or Update Assignment for a Module
router.post('/modules/:moduleId/assignments', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { moduleId } = req.params;
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  if (!canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to manage assignments in this course' });
  }

  const { title, instructions, max_marks, due_date, is_required, accepted_types, rubric } = req.body;

  let asg = queryOne('SELECT * FROM assignments WHERE module_id = ?', [moduleId]);
  const asgId = asg ? asg.id : `asg-${Date.now()}`;

  transaction(() => {
    if (asg) {
      runQuery(
        `UPDATE assignments
         SET title = COALESCE(?, title),
             instructions = COALESCE(?, instructions),
             max_marks = COALESCE(?, max_marks),
             due_date = COALESCE(?, due_date),
             is_required = COALESCE(?, is_required),
             accepted_types = COALESCE(?, accepted_types),
             rubric = COALESCE(?, rubric)
         WHERE id = ?`,
        [
          title,
          instructions,
          max_marks !== undefined ? Number(max_marks) : null,
          due_date || null,
          is_required !== undefined ? (is_required ? 1 : 0) : null,
          accepted_types || null,
          rubric || null,
          asgId
        ]
      );
    } else {
      runQuery(
        `INSERT INTO assignments (
          id, module_id, title, instructions, max_marks, due_date, is_required, accepted_types, rubric
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          asgId,
          moduleId,
          title || `${mod.title} Practical Assignment`,
          instructions || 'Submit project link or solution file for review.',
          max_marks !== undefined ? Number(max_marks) : 100.0,
          due_date || null,
          is_required !== undefined ? (is_required ? 1 : 0) : 1,
          accepted_types || 'text,github,zip',
          rubric || 'Accuracy, Code Quality, and Testing'
        ]
      );
    }

    logAudit(req.user.id, asg ? 'ASSIGNMENT_UPDATED' : 'ASSIGNMENT_CREATED', 'ASSIGNMENT', asgId);
  });

  const updatedAsg = queryOne('SELECT * FROM assignments WHERE id = ?', [asgId]);
  return res.json({ assignment: updatedAsg });
});

// Attach Downloadable Resource to a Lesson
router.post('/lessons/:lessonId/resources', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { lessonId } = req.params;
  const { title, file_url, file_type, file_size } = req.body;

  if (!title || !file_url) {
    return res.status(400).json({ error: 'Resource title and file_url are required' });
  }

  const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [lesson.module_id]);
  if (!mod || !canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to add resources in this course' });
  }

  const resourceId = `res-${Date.now()}`;
  runQuery(
    `INSERT INTO lesson_resources (id, lesson_id, title, file_url, file_type, file_size)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [resourceId, lessonId, title, file_url, file_type || 'application/pdf', file_size || '1.5 MB']
  );

  logAudit(req.user.id, 'LESSON_RESOURCE_ADDED', 'LESSON', lessonId, { title, file_url });
  const created = queryOne('SELECT * FROM lesson_resources WHERE id = ?', [resourceId]);
  return res.status(201).json({ resource: created });
});

// Delete Lesson Resource
router.delete('/lessons/:lessonId/resources/:resourceId', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { lessonId, resourceId } = req.params;
  const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [lesson.module_id]);
  if (!mod || !canManageCourse(mod.course_id, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to delete resources in this course' });
  }

  runQuery('DELETE FROM lesson_resources WHERE id = ?', [resourceId]);
  return res.json({ success: true, message: 'Resource removed.' });
});

// Explicit Synchronize Curriculum from Source Notes (ADMIN only)
router.post('/sync-source', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { courseId, force = false } = req.body;
  try {
    const { importFullStackNotes } = await import('../services/curriculumImporter.js');
    let result = null;

    if (courseId === 'course-fullstack-web' || !courseId) {
      result = importFullStackNotes({ force });
    } else {
      return res.status(400).json({ error: `No source file mapping defined for course: ${courseId}` });
    }

    logAudit(req.user.id, 'CURRICULUM_SYNCED_FROM_SOURCE', 'COURSE', courseId, { force, result });
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
