import express from 'express';
import { queryAll, queryOne, runQuery, transaction } from '../db/db.js';
import { queryAllNeon, queryOneNeon, runNeonQuery } from '../db/neon.js';
import { parseAuthUser, resolveAuthUser, requireAuth, requireRole, logAudit } from '../middleware/auth.js';
import { ensureEnrollment } from '../services/progressionEngine.js';
import { canManageCourse, validateCourseForPublishing } from '../services/courseAuthorization.js';
import { hasCourseEntitlement, getAvailablePlans } from '../services/billingService.js';
import {
  scanCoursePdfBuffer,
  parseCurriculumText,
  formatAs4WeekStructure,
  evaluateCurriculumCriteria,
  fetchGoogleDocText,
  extractGoogleDocId,
  parseQuizQuestionsFromText,
  SYLLABUS_GUIDELINES,
  VALID_CATEGORIES
} from '../services/pdfCourseScanner.js';

const router = express.Router();

// List courses (students see published courses, admins/operators see all)
// Supports ?search=...&category=...&level=...&enrolledOnly=true
router.get('/', async (req, res) => {
  const user = (await resolveAuthUser(req)) || parseAuthUser(req);
  const isOperatorOrAdmin = user && (user.role === 'ADMIN' || user.role === 'OPERATOR');
  const isInstructor = user && user.role === 'INSTRUCTOR';
  const { search, category, level, enrolledOnly } = req.query;

  // On Vercel / serverless: Query Neon Cloud PostgreSQL directly
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (IS_SERVERLESS) {
    try {
      let pgSql = 'SELECT c.*, u.name as instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id = u.id WHERE 1=1 ';
      const pgParams = [];
      let pIdx = 1;

      if (!isOperatorOrAdmin && !isInstructor) {
        pgSql += 'AND c.is_published = true ';
      }

      if (category && category !== 'All') {
        pgSql += `AND c.category = $${pIdx++} `;
        pgParams.push(category);
      }

      if (level && level !== 'All') {
        pgSql += `AND c.level = $${pIdx++} `;
        pgParams.push(level);
      }

      if (search && search.trim()) {
        pgSql += `AND (c.title ILIKE $${pIdx++} OR c.description ILIKE $${pIdx++}) `;
        pgParams.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      pgSql += 'ORDER BY c.created_at DESC';

      const neonCourses = await queryAllNeon(pgSql, pgParams);

      let userEnrollmentsMap = new Map();
      if (user) {
        try {
          const userEnrollments = await queryAllNeon('SELECT course_id, progress_percent FROM enrollments WHERE user_id = $1', [user.id]);
          userEnrollmentsMap = new Map(userEnrollments.map(e => [e.course_id, e.progress_percent]));
        } catch (enrErr) {
          console.warn('[courseRoutes] Failed to fetch enrollments for user:', enrErr.message);
        }
      }

      const enhanced = neonCourses.map(c => ({
        ...c,
        is_published: Boolean(c.is_published),
        learning_objectives: typeof c.learning_objectives === 'string' ? JSON.parse(c.learning_objectives || '[]') : (c.learning_objectives || []),
        prerequisites: typeof c.prerequisites === 'string' ? JSON.parse(c.prerequisites || '[]') : (c.prerequisites || []),
        module_count: Number(c.module_count || 4),
        lesson_count: Number(c.lesson_count || 12),
        enrolled_count: Number(c.enrolled_count || 0),
        is_enrolled: userEnrollmentsMap.has(c.id),
        student_progress: Number(userEnrollmentsMap.get(c.id)) || 0
      }));

      const finalCourses = enrolledOnly === 'true'
        ? enhanced.filter(c => c.is_enrolled)
        : enhanced;

      return res.json({ courses: finalCourses });
    } catch (neonErr) {
      console.error('[courseRoutes Neon fallback error]', neonErr);
    }
  }

  let sql = 'SELECT c.*, u.name as instructor_name FROM courses c LEFT JOIN users u ON c.instructor_id = u.id WHERE 1=1 ';
  const params = [];

  if (!isOperatorOrAdmin && !isInstructor) {
    sql += 'AND c.is_published = 1 ';
  }

  if (category && category !== 'All') {
    sql += 'AND c.category = ? ';
    params.push(category);
  }

  if (level && level !== 'All') {
    sql += 'AND c.level = ? ';
    params.push(level);
  }

  if (search && search.trim()) {
    sql += 'AND (c.title LIKE ? OR c.description LIKE ?) ';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  sql += 'ORDER BY c.created_at DESC';

  const courses = queryAll(sql, params);

  // Enhance each course with module count and enrolled count
  const enhanced = courses.map(c => {
    const moduleCount = queryOne('SELECT COUNT(*) as count FROM modules WHERE course_id = ?', [c.id]).count;
    const lessonCount = queryOne(
      'SELECT COUNT(*) as count FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ?',
      [c.id]
    ).count;
    const enrolledCount = queryOne('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [c.id]).count;
    let isEnrolled = false;
    let studentProgress = 0;

    if (user) {
      const enr = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [user.id, c.id]);
      if (enr) {
        isEnrolled = true;
        studentProgress = enr.progress_percent;
      }
    }

    return {
      ...c,
      is_published: Boolean(c.is_published),
      learning_objectives: c.learning_objectives ? JSON.parse(c.learning_objectives) : [],
      prerequisites: c.prerequisites ? JSON.parse(c.prerequisites) : [],
      module_count: moduleCount,
      lesson_count: lessonCount,
      enrolled_count: enrolledCount,
      is_enrolled: isEnrolled,
      student_progress: studentProgress
    };
  });

  const finalCourses = enrolledOnly === 'true'
    ? enhanced.filter(c => c.is_enrolled)
    : enhanced;

  return res.json({ courses: finalCourses });
});

// ==========================================
// PDF Syllabus Scanner & Course Importer
// ==========================================

// 1. Get official syllabus structure guidelines and sample template
router.get('/syllabus-guidelines', (req, res) => {
  res.json({
    guidelines: SYLLABUS_GUIDELINES,
    validCategories: VALID_CATEGORIES
  });
});

// 2. Scan and evaluate course syllabus from PDF or raw syllabus text
router.post('/scan-pdf', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), async (req, res) => {
  try {
    const { pdfBase64, rawText, fileName } = req.body;

    if (!pdfBase64 && (!rawText || rawText.trim().length < 20)) {
      return res.status(400).json({
        error: 'Please provide either a PDF file (pdfBase64) or syllabus text (rawText).'
      });
    }

    let scanResult;
    if (pdfBase64) {
      scanResult = await scanCoursePdfBuffer(pdfBase64);
    } else {
      let parsed = parseCurriculumText(rawText);
      if (parsed.modules && parsed.modules.length > 4) {
        parsed = formatAs4WeekStructure(parsed);
      }
      const evalRes = evaluateCurriculumCriteria(parsed);
      scanResult = {
        ...evalRes,
        extractedCourse: parsed,
        rawTextLength: rawText.length
      };
    }

    logAudit(req.user.id, 'COURSE_PDF_SCANNED', 'COURSE_SYLLABUS', null, {
      fileName: fileName || 'uploaded_syllabus',
      status: scanResult.status,
      score: scanResult.score,
      modulesCount: scanResult.extractedCourse?.modules?.length || 0
    });

    return res.json({
      success: true,
      scanResult
    });
  } catch (err) {
    console.error('[CourseScanner Route Error]:', err);
    return res.status(500).json({
      error: 'Failed to scan syllabus PDF: ' + err.message
    });
  }
});

// Helper endpoint: Force format any curriculum object into 4-Week Cohort structure
router.post('/format-cohort', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { curriculum } = req.body;
  if (!curriculum) {
    return res.status(400).json({ error: 'Curriculum data is required.' });
  }
  const formatted = formatAs4WeekStructure(curriculum);
  const evaluated = evaluateCurriculumCriteria(formatted);
  return res.json({
    success: true,
    scanResult: {
      ...evaluated,
      extractedCourse: formatted
    }
  });
});

// Fetch and structure course directly from a Google Docs link
router.post('/fetch-google-doc', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), async (req, res) => {
  const { docUrl } = req.body;
  if (!docUrl || typeof docUrl !== 'string') {
    return res.status(400).json({ error: 'A valid Google Docs URL is required.' });
  }

  try {
    const { docId, text } = await fetchGoogleDocText(docUrl);
    let parsed = parseCurriculumText(text);

    // If more than 4 modules or scattered topics, automatically structure into 4-week cohort
    if (parsed.modules && parsed.modules.length > 4) {
      parsed = formatAs4WeekStructure(parsed);
    }

    const evaluation = evaluateCurriculumCriteria(parsed);

    logAudit(req.user.id, 'COURSE_GOOGLE_DOC_FETCHED', 'COURSE_SYLLABUS', null, {
      docId,
      status: evaluation.status,
      score: evaluation.score,
      modulesCount: evaluation.extractedCourse?.modules?.length || 0
    });

    return res.json({
      success: true,
      scanResult: {
        ...evaluation,
        extractedCourse: parsed,
        rawTextLength: text.length,
        docId
      }
    });
  } catch (err) {
    console.error('[FetchGoogleDoc Error]:', err.message);
    return res.status(400).json({
      error: err.message || 'Failed to fetch course content from Google Docs.'
    });
  }
});

// 3. Import an approved scanned syllabus directly into LMS as a structured Course with Modules & Lessons
router.post('/import-scanned', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { course, publishImmediately } = req.body;

  if (!course || !course.title) {
    return res.status(400).json({ error: 'Invalid course data provided for import.' });
  }

  // Ensure minimum structure
  if (!Array.isArray(course.modules) || course.modules.length === 0) {
    return res.status(400).json({ error: 'Cannot import a course without modules.' });
  }

  try {
    const instructorId = (req.user.role === 'ADMIN' || req.user.role === 'OPERATOR')
      ? (course.instructor_id || req.user.id)
      : req.user.id;

    const baseSlug = course.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    const courseId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const isPublished = publishImmediately ? 1 : 0;
    const courseStatus = isPublished ? 'PUBLISHED' : 'DRAFT';

    let totalLessonsCount = 0;

    transaction(() => {
      // 1. Insert Course
      runQuery(
        `INSERT INTO courses (
          id, title, slug, description, category, level, estimated_duration,
          price, original_price, is_published, status,
          learning_objectives, prerequisites, instructor_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          courseId,
          course.title.trim(),
          uniqueSlug,
          course.description || `Comprehensive course on ${course.title}`,
          course.category || 'Computer Science',
          course.level || 'Beginner to Intermediate',
          course.estimated_duration || '40 hours',
          course.price || 0,
          course.original_price || 0,
          isPublished,
          courseStatus,
          JSON.stringify(course.learning_objectives || []),
          JSON.stringify(course.prerequisites || []),
          instructorId,
          now,
          now
        ]
      );

      // 2. Insert Modules & Lessons with sequential prerequisite locking
      let previousModuleId = null;

      course.modules.forEach((mod, modIdx) => {
        const moduleId = `m_${Date.now()}_${modIdx + 1}_${Math.random().toString(36).substring(2, 6)}`;
        const modOrder = modIdx + 1;
        const modTitle = mod.title || `Module ${modOrder}`;
        const prereqId = previousModuleId; // Automatically locks Module 2..N until previous module is completed

        runQuery(
          `INSERT INTO modules (
            id, course_id, title, description, order_index, estimated_duration, is_published,
            prerequisite_module_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
          [
            moduleId,
            courseId,
            modTitle,
            mod.description || '',
            modOrder,
            mod.estimated_duration || '2 hours',
            prereqId,
            now,
            now
          ]
        );

        previousModuleId = moduleId;

        const lessonsToInsert = (Array.isArray(mod.lessons) && mod.lessons.length > 0)
          ? mod.lessons
          : [{
              title: `Lesson ${modOrder}.1: ${modTitle.replace(/^Module\s*\d*[:.-]*\s*/i, '') || 'Overview'}`,
              lesson_type: 'TEXT',
              reading_time_minutes: 10,
              text_content: mod.description || `# ${modTitle}\n\nWelcome to this module. Content can be enriched via the Course Builder.`
            }];

        lessonsToInsert.forEach((les, lesIdx) => {
          const lessonId = `les_${Date.now()}_${modIdx + 1}_${lesIdx + 1}_${Math.random().toString(36).substring(2, 6)}`;
          const lesOrder = lesIdx + 1;
          const lesTitle = les.title || `Lesson ${modOrder}.${lesOrder}`;
          const lesType = ['TEXT', 'CODE', 'PDF', 'VIDEO'].includes(les.lesson_type) ? les.lesson_type : 'TEXT';
          const duration = les.reading_time_minutes || 10;
          const content = les.text_content || `# ${lesTitle}\n\nWelcome to this lesson. Review the curriculum guidelines to add detailed content.`;

          runQuery(
            `INSERT INTO lessons (
              id, module_id, title, description, lesson_type, text_content,
              reading_time_minutes, duration_minutes, order_index, is_mandatory
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              lessonId,
              moduleId,
              lesTitle,
              les.description || '',
              lesType,
              content,
              duration,
              duration,
              lesOrder
            ]
          );
          totalLessonsCount++;
        });
      });

      // 3. Insert Certification Quiz (75% passing percentage required for certificate)
      const quizPayload = course.certificationQuiz || req.body.certificationQuiz;
      if (quizPayload && previousModuleId) {
        let questionsToInsert = Array.isArray(quizPayload.questions) ? quizPayload.questions : [];
        if (questionsToInsert.length === 0 && quizPayload.rawQuizText) {
          questionsToInsert = parseQuizQuestionsFromText(quizPayload.rawQuizText);
        }

        if (questionsToInsert.length > 0) {
          const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const quizTitle = quizPayload.title || `${course.title} - Final Certification Assessment`;
          const passingPercent = 75.0; // Strictly 75% required to pass for certificate

          runQuery(
            `INSERT INTO quizzes (
              id, module_id, title, description, passing_percentage,
              time_limit_minutes, max_attempts, is_required, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [
              quizId,
              previousModuleId,
              quizTitle,
              quizPayload.description || 'Mandatory certification exam. You must score 75% or higher to unlock and earn your verified certificate of completion.',
              passingPercent,
              quizPayload.time_limit_minutes || 30,
              quizPayload.max_attempts || 5,
              now
            ]
          );

          // Update module completion policy so the quiz is enforced
          runQuery(
            `UPDATE modules SET completion_policy = 'POLICY_B_QUIZ' WHERE id = ?`,
            [previousModuleId]
          );

          questionsToInsert.forEach((q, qIdx) => {
            const questionId = `qq_${Date.now()}_${qIdx + 1}_${Math.random().toString(36).substring(2, 6)}`;
            const qOrder = qIdx + 1;
            const prompt = q.prompt || q.question || `Question ${qOrder}`;
            const qType = q.question_type || (q.options?.filter(o => o.is_correct)?.length > 1 ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE');
            const marks = q.marks || 1.0;
            const explanation = q.explanation || '';

            runQuery(
              `INSERT INTO quiz_questions (
                id, quiz_id, prompt, question_type, marks, explanation, order_index
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [questionId, quizId, prompt, qType, marks, explanation, qOrder]
            );

            const options = Array.isArray(q.options) ? q.options : [];
            options.forEach((opt, optIdx) => {
              const optId = `qo_${Date.now()}_${qIdx + 1}_${optIdx + 1}_${Math.random().toString(36).substring(2, 6)}`;
              const optOrder = optIdx + 1;
              const optText = typeof opt === 'string' ? opt : (opt.text || `Option ${optOrder}`);
              const isCorrect = typeof opt === 'object' ? (opt.is_correct ? 1 : 0) : (optIdx === 0 ? 1 : 0);

              runQuery(
                `INSERT INTO quiz_options (
                  id, question_id, text, is_correct, order_index
                ) VALUES (?, ?, ?, ?, ?)`,
                [optId, questionId, optText, isCorrect, optOrder]
              );
            });
          });
        }
      }

      logAudit(req.user.id, 'COURSE_IMPORTED_FROM_PDF', 'COURSE', courseId, {
        title: course.title,
        modulesCount: course.modules.length,
        lessonsCount: totalLessonsCount,
        hasQuiz: Boolean(quizPayload),
        published: Boolean(isPublished)
      });
    });

    const insertedCourse = queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);

    return res.status(201).json({
      success: true,
      courseId,
      course: insertedCourse,
      message: `Course "${course.title}" imported successfully with ${course.modules.length} modules and ${totalLessonsCount} lessons!`
    });
  } catch (err) {
    console.error('[ImportScannedCourse Error]:', err);
    return res.status(500).json({ error: 'Failed to import scanned course: ' + err.message });
  }
});

// 4. Bulk delete courses (Admin, Operator, Instructor for their own)
router.post('/bulk-delete', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), async (req, res) => {
  const { courseIds, force } = req.body;

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return res.status(400).json({ error: 'No course IDs provided for bulk deletion.' });
  }

  // Validate permission for each course
  for (const id of courseIds) {
    const check = canManageCourse(id, req.user);
    if (!check.allowed) {
      return res.status(check.status).json({
        error: `Permission denied for course ID ${id}: ${check.error}`
      });
    }
  }

  // Safe deletion check: Check for active student progress unless force=true
  if (force !== true) {
    const coursesWithProgress = [];
    for (const id of courseIds) {
      const studentWithProgress = queryOne(
        `SELECT lp.id FROM lesson_progress lp
         JOIN lessons l ON lp.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         WHERE m.course_id = ? AND (lp.status = 'COMPLETED' OR lp.last_playback_position > 0)
         LIMIT 1`,
        [id]
      );
      if (studentWithProgress) {
        const c = queryOne('SELECT title FROM courses WHERE id = ?', [id]);
        coursesWithProgress.push(c ? c.title : id);
      }
    }

    if (coursesWithProgress.length > 0) {
      return res.status(400).json({
        error: `Cannot delete courses with active student progress: "${coursesWithProgress.join('", "')}". Provide force=true to override and delete anyway.`
      });
    }
  }

  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (IS_SERVERLESS) {
    try {
      const result = await runNeonQuery('DELETE FROM courses WHERE id = ANY(?)', [courseIds]);
      logAudit(req.user.id, 'COURSE_BULK_DELETED', 'COURSE', courseIds.join(','), { count: result.rowCount });
      return res.json({
        success: true,
        deletedCount: result.rowCount,
        message: `Successfully deleted ${result.rowCount} course(s).`
      });
    } catch (neonErr) {
      console.error('⚠️ [Neon course bulk delete error]:', neonErr.message);
      return res.status(500).json({ error: 'Failed to bulk delete courses from Neon' });
    }
  }

  let deletedCount = 0;
  transaction(() => {
    for (const id of courseIds) {
      const course = queryOne('SELECT title FROM courses WHERE id = ?', [id]);
      if (course) {
        runQuery('DELETE FROM courses WHERE id = ?', [id]);
        logAudit(req.user.id, 'COURSE_BULK_DELETED', 'COURSE', id, { title: course.title });
        deletedCount++;
      }
    }
  });

  return res.json({
    success: true,
    deletedCount,
    message: `Successfully deleted ${deletedCount} course(s).`
  });
});

// Get single course details
router.get('/:id', async (req, res) => {
  const user = (await resolveAuthUser(req)) || parseAuthUser(req);

  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (IS_SERVERLESS) {
    try {
      const course = await queryOneNeon(
        `SELECT c.*, u.name as instructor_name, u.email as instructor_email, u.bio as instructor_bio, u.avatar_url as instructor_avatar
         FROM courses c
         LEFT JOIN users u ON c.instructor_id = u.id
         WHERE c.id = $1 OR c.slug = $2`,
        [req.params.id, req.params.id]
      );

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const modules = await queryAllNeon(
        'SELECT * FROM modules WHERE course_id = $1 ORDER BY order_index ASC',
        [course.id]
      );

      let enrollment = null;
      if (user) {
        enrollment = await queryOneNeon('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [user.id, course.id]);
      }

      return res.json({
        course: {
          ...course,
          is_published: Boolean(course.is_published),
          learning_objectives: typeof course.learning_objectives === 'string' ? JSON.parse(course.learning_objectives || '[]') : (course.learning_objectives || []),
          prerequisites: typeof course.prerequisites === 'string' ? JSON.parse(course.prerequisites || '[]') : (course.prerequisites || []),
          completion_requirements: typeof course.completion_requirements === 'string' ? JSON.parse(course.completion_requirements || '{}') : (course.completion_requirements || {}),
          modules: modules.map(m => ({
            ...m,
            is_published: Boolean(m.is_published),
            lesson_count: 7,
            has_quiz: false,
            has_assignment: false
          })),
          enrollment
        }
      });
    } catch (err) {
      console.error('[courseRoutes getById Neon error]', err);
    }
  }

  const course = queryOne(
    `SELECT c.*, u.name as instructor_name, u.email as instructor_email, u.bio as instructor_bio, u.avatar_url as instructor_avatar
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     WHERE c.id = ? OR c.slug = ?`,
    [req.params.id, req.params.id]
  );

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  // Access check: If unpublished, only Admin, Operator, or assigned Instructor can view
  if (!course.is_published) {
    const isAuthorized = user && (
      user.role === 'ADMIN' ||
      user.role === 'OPERATOR' ||
      course.instructor_id === user.id
    );
    if (!isAuthorized) {
      return res.status(403).json({ error: 'This course is currently in draft mode and not accessible.' });
    }
  }

  // Fetch modules
  const modules = queryAll(
    'SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC',
    [course.id]
  ).map(m => {
    const lessonCount = queryOne('SELECT COUNT(*) as count FROM lessons WHERE module_id = ?', [m.id]).count;
    const hasQuiz = Boolean(queryOne('SELECT id FROM quizzes WHERE module_id = ?', [m.id]));
    const hasAssignment = Boolean(queryOne('SELECT id FROM assignments WHERE module_id = ?', [m.id]));
    return {
      ...m,
      is_published: Boolean(m.is_published),
      lesson_count: lessonCount,
      has_quiz: hasQuiz,
      has_assignment: hasAssignment
    };
  });

  // Check enrollment if student is logged in
  let enrollment = null;
  if (user) {
    enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [user.id, course.id]);
  }

  return res.json({
    course: {
      ...course,
      is_published: Boolean(course.is_published),
      learning_objectives: course.learning_objectives ? JSON.parse(course.learning_objectives) : [],
      prerequisites: course.prerequisites ? JSON.parse(course.prerequisites) : [],
      completion_requirements: course.completion_requirements ? JSON.parse(course.completion_requirements) : {},
      modules,
      enrollment
    }
  });
});

// Create new course (Admin / Operator / Instructor)
router.post('/', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const {
    title,
    slug,
    description,
    thumbnail,
    category,
    level,
    instructor_id,
    estimated_duration,
    price,
    original_price,
    learning_objectives,
    prerequisites
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Course title is required' });
  }

  const courseId = `course-${Date.now()}`;
  const courseSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Math.random().toString(36).slice(2, 6)}`;
  const assignedInstructor = (req.user.role === 'INSTRUCTOR') ? req.user.id : (instructor_id || req.user.id);

  try {
    runQuery(
      `INSERT INTO courses (
        id, title, slug, description, thumbnail, category, level, instructor_id,
        estimated_duration, price, original_price, is_published, status, learning_objectives, prerequisites
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'DRAFT', ?, ?)`,
      [
        courseId,
        title.trim(),
        courseSlug,
        description || '',
        thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
        category || 'Computer Science',
        level || 'Beginner to Intermediate',
        assignedInstructor,
        estimated_duration || '4 Weeks',
        Number(price) || 0,
        Number(original_price) || 0,
        JSON.stringify(learning_objectives || []),
        JSON.stringify(prerequisites || [])
      ]
    );

    logAudit(req.user.id, 'COURSE_CREATED', 'COURSE', courseId, { title, slug: courseSlug });

    const newCourse = queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
    return res.status(201).json({
      course: {
        ...newCourse,
        is_published: Boolean(newCourse.is_published),
        learning_objectives: newCourse.learning_objectives ? JSON.parse(newCourse.learning_objectives) : [],
        prerequisites: newCourse.prerequisites ? JSON.parse(newCourse.prerequisites) : []
      }
    });
  } catch (err) {
    return res.status(400).json({ error: 'Failed to create course. Ensure slug is unique.', details: err.message });
  }
});

// Update course details
router.put('/:id', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const check = canManageCourse(req.params.id, req.user);
  if (!check.allowed) return res.status(check.status).json({ error: check.error });

  const course = queryOne('SELECT * FROM courses WHERE id = ?', [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const {
    title,
    description,
    thumbnail,
    category,
    level,
    instructor_id,
    estimated_duration,
    price,
    original_price,
    status,
    learning_objectives,
    prerequisites,
    completion_requirements
  } = req.body;

  let newStatus = status || course.status;
  let newPublished = course.is_published;
  if (status === 'PUBLISHED') {
    newPublished = 1;
  } else if (status === 'DRAFT' || status === 'ARCHIVED') {
    newPublished = 0;
  }

  // Instructors cannot reassign instructor_id
  const updatedInstructor = (req.user.role === 'INSTRUCTOR') ? course.instructor_id : (instructor_id || course.instructor_id);

  runQuery(
    `UPDATE courses
     SET title = COALESCE(?, title),
         description = COALESCE(?, description),
         thumbnail = COALESCE(?, thumbnail),
         category = COALESCE(?, category),
         level = COALESCE(?, level),
         instructor_id = COALESCE(?, instructor_id),
         estimated_duration = COALESCE(?, estimated_duration),
         price = COALESCE(?, price),
         original_price = COALESCE(?, original_price),
         status = COALESCE(?, status),
         is_published = COALESCE(?, is_published),
         learning_objectives = COALESCE(?, learning_objectives),
         prerequisites = COALESCE(?, prerequisites),
         completion_requirements = COALESCE(?, completion_requirements),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title !== undefined ? title : null,
      description !== undefined ? description : null,
      thumbnail !== undefined ? thumbnail : null,
      category !== undefined ? category : null,
      level !== undefined ? level : null,
      updatedInstructor !== undefined ? updatedInstructor : null,
      estimated_duration !== undefined ? estimated_duration : null,
      price !== undefined ? Number(price) : null,
      original_price !== undefined ? Number(original_price) : null,
      newStatus !== undefined ? newStatus : null,
      newPublished !== undefined ? newPublished : null,
      learning_objectives !== undefined ? JSON.stringify(learning_objectives) : null,
      prerequisites !== undefined ? JSON.stringify(prerequisites) : null,
      completion_requirements !== undefined ? JSON.stringify(completion_requirements) : null,
      req.params.id
    ]
  );

  logAudit(req.user.id, 'COURSE_UPDATED', 'COURSE', req.params.id);
  const updated = queryOne('SELECT * FROM courses WHERE id = ?', [req.params.id]);
  return res.json({
    course: {
      ...updated,
      is_published: Boolean(updated.is_published),
      learning_objectives: updated.learning_objectives ? JSON.parse(updated.learning_objectives) : [],
      prerequisites: updated.prerequisites ? JSON.parse(updated.prerequisites) : []
    }
  });
});

// Pre-flight publishing validation endpoint
router.get('/:id/validate-publish', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const check = canManageCourse(req.params.id, req.user);
  if (!check.allowed) return res.status(check.status).json({ error: check.error });

  const validation = validateCourseForPublishing(req.params.id);
  return res.json(validation);
});

// Toggle or update course publication status
router.patch('/:id/publish', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const check = canManageCourse(req.params.id, req.user);
  if (!check.allowed) return res.status(check.status).json({ error: check.error });

  const course = queryOne('SELECT * FROM courses WHERE id = ?', [req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  // If publishing, run pre-flight validation!
  if (!course.is_published) {
    const validation = validateCourseForPublishing(course.id);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Cannot publish course. Course does not meet publishing requirements.',
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
  }

  const newStatus = course.is_published ? 0 : 1;
  const statusStr = newStatus ? 'PUBLISHED' : 'DRAFT';
  runQuery('UPDATE courses SET is_published = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, statusStr, req.params.id]);

  logAudit(req.user.id, newStatus ? 'COURSE_PUBLISHED' : 'COURSE_UNPUBLISHED', 'COURSE', req.params.id);
  return res.json({ id: req.params.id, is_published: Boolean(newStatus), status: statusStr });
});

// Duplicate course (deep clone modules, lessons, quizzes, assignments)
router.post('/:id/duplicate', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const check = canManageCourse(req.params.id, req.user);
  if (!check.allowed) return res.status(check.status).json({ error: check.error });

  const orig = queryOne('SELECT * FROM courses WHERE id = ?', [req.params.id]);
  if (!orig) return res.status(404).json({ error: 'Course not found' });

  const newId = `course-${Date.now()}`;
  const newSlug = `${orig.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
  const newTitle = `${orig.title} (Copy)`;

  transaction(() => {
    // 1. Course
    runQuery(
      `INSERT INTO courses (
        id, title, slug, description, thumbnail, category, level, instructor_id,
        estimated_duration, price, is_published, status, learning_objectives, prerequisites, completion_requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'DRAFT', ?, ?, ?)`,
      [
        newId,
        newTitle,
        newSlug,
        orig.description,
        orig.thumbnail,
        orig.category,
        orig.level,
        req.user.id,
        orig.estimated_duration,
        orig.price,
        orig.learning_objectives,
        orig.prerequisites,
        orig.completion_requirements
      ]
    );

    // 2. Modules
    const origModules = queryAll('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC', [orig.id]);
    for (const mod of origModules) {
      const newModId = `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      runQuery(
        `INSERT INTO modules (
          id, course_id, title, description, order_index, estimated_duration, is_published, completion_policy, min_passing_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newModId, newId, mod.title, mod.description, mod.order_index, mod.estimated_duration, mod.is_published, mod.completion_policy, mod.min_passing_score]
      );

      // Lessons
      const origLessons = queryAll('SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index ASC', [mod.id]);
      for (const les of origLessons) {
        const newLesId = `les-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        runQuery(
          `INSERT INTO lessons (
            id, module_id, title, description, lesson_type, text_content, duration_minutes, reading_time_minutes, key_takeaways, order_index, is_mandatory
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newLesId, newModId, les.title, les.description, les.lesson_type, les.text_content, les.duration_minutes, les.reading_time_minutes, les.key_takeaways, les.order_index, les.is_mandatory]
        );
      }

      // Quiz
      const origQuiz = queryOne('SELECT * FROM quizzes WHERE module_id = ?', [mod.id]);
      if (origQuiz) {
        const newQuizId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        runQuery(
          `INSERT INTO quizzes (
            id, module_id, title, description, passing_percentage, time_limit_minutes, max_attempts, is_required
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [newQuizId, newModId, origQuiz.title, origQuiz.description, origQuiz.passing_percentage, origQuiz.time_limit_minutes, origQuiz.max_attempts, origQuiz.is_required]
        );

        const origQuestions = queryAll('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC', [origQuiz.id]);
        for (const q of origQuestions) {
          const newQId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          runQuery(
            `INSERT INTO quiz_questions (id, quiz_id, prompt, question_type, marks, explanation, order_index)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newQId, newQuizId, q.prompt, q.question_type, q.marks, q.explanation, q.order_index]
          );

          const origOptions = queryAll('SELECT * FROM quiz_options WHERE question_id = ? ORDER BY order_index ASC', [q.id]);
          for (const opt of origOptions) {
            const newOptId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            runQuery(
              `INSERT INTO quiz_options (id, question_id, text, is_correct, order_index)
               VALUES (?, ?, ?, ?, ?)`,
              [newOptId, newQId, opt.text, opt.is_correct, opt.order_index]
            );
          }
        }
      }

      // Assignment
      const origAsg = queryOne('SELECT * FROM assignments WHERE module_id = ?', [mod.id]);
      if (origAsg) {
        const newAsgId = `asg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        runQuery(
          `INSERT INTO assignments (
            id, module_id, title, instructions, max_marks, due_date, is_required, accepted_types, rubric
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newAsgId, newModId, origAsg.title, origAsg.instructions, origAsg.max_marks, origAsg.due_date, origAsg.is_required, origAsg.accepted_types, origAsg.rubric]
        );
      }
    }

    logAudit(req.user.id, 'COURSE_DUPLICATED', 'COURSE', newId, { fromCourseId: orig.id, newTitle });
  });

  const duplicated = queryOne('SELECT * FROM courses WHERE id = ?', [newId]);
  return res.status(201).json({ course: duplicated });
});

// Delete course (Safe Deletion Check & Neon PostgreSQL Sync!)
router.delete('/:id', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), async (req, res) => {
  const courseId = req.params.id;
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

  let course = null;
  if (IS_SERVERLESS) {
    course = await queryOneNeon('SELECT * FROM courses WHERE id = $1', [courseId]);
  } else {
    course = queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
  }

  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Safe deletion rule: Prevent deletion if any enrolled student has completed progress (unless forced)
  if (req.query.force !== 'true') {
    let studentWithProgress = null;
    if (IS_SERVERLESS) {
      studentWithProgress = await queryOneNeon(
        `SELECT lp.id FROM lesson_progress lp
         JOIN lessons l ON lp.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         WHERE m.course_id = $1 AND (lp.status = 'COMPLETED' OR lp.last_playback_position > 0)
         LIMIT 1`,
        [courseId]
      );
    } else {
      studentWithProgress = queryOne(
        `SELECT lp.id FROM lesson_progress lp
         JOIN lessons l ON lp.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         WHERE m.course_id = ? AND (lp.status = 'COMPLETED' OR lp.last_playback_position > 0)
         LIMIT 1`,
        [courseId]
      );
    }

    if (studentWithProgress) {
      return res.status(400).json({
        error: 'Cannot delete course with active student progress. Deleting will corrupt enrolled student records. Archive or unpublish the course instead, or provide ?force=true to override.'
      });
    }
  }

  // Always delete from Neon Cloud PostgreSQL
  try {
    await runNeonQuery('DELETE FROM courses WHERE id = ?', [courseId]);
    console.log(`[Neon] Course ${courseId} and all associated records permanently deleted from Neon.`);
  } catch (neonDelErr) {
    console.error('⚠️ [Neon course deletion error]:', neonDelErr.message);
  }

  // Also delete from local SQLite if running in local environment
  if (!IS_SERVERLESS) {
    try {
      transaction(() => {
        runQuery('DELETE FROM courses WHERE id = ?', [courseId]);
        logAudit(req.user.id, 'COURSE_DELETED', 'COURSE', courseId, { title: course.title });
      });
    } catch (sqliteErr) {
      console.warn('SQLite course deletion note:', sqliteErr.message);
    }
  }

  return res.json({ success: true, message: `Course "${course.title}" was permanently deleted.` });
});

// Enroll current student in course
router.post('/:id/enroll', requireAuth, (req, res) => {
  const course = queryOne('SELECT * FROM courses WHERE id = ? OR slug = ?', [req.params.id, req.params.id]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  if (!course.is_published && req.user.role === 'STUDENT') {
    return res.status(403).json({ error: 'Cannot enroll in an unpublished course.' });
  }

  // Paywall & Entitlement Gate: Check if course is paid and user is entitled
  const isFree = (course.price === 0 || course.price === null || !course.price) && (course.tier === 'FREE' || !course.tier);
  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR' || course.instructor_id === req.user.id;

  if (!isFree && !isPrivileged && !hasCourseEntitlement(req.user.id, course.id)) {
    return res.status(402).json({
      error: 'Payment required to enroll in this course.',
      requires_payment: true,
      course: {
        id: course.id,
        title: course.title,
        price: course.price,
        tier: course.tier || 'PRO'
      },
      available_plans: getAvailablePlans(),
      checkout_options: {
        one_time_purchase: {
          amount: course.price,
          currency: 'INR'
        },
        subscription_plans: ['PRO_MONTHLY', 'PRO_ANNUAL', 'ENTERPRISE']
      }
    });
  }

  const enrollment = ensureEnrollment(req.user.id, course.id);
  logAudit(req.user.id, 'STUDENT_ENROLLED', 'COURSE', course.id);

  return res.json({
    success: true,
    message: `Enrolled successfully in ${course.title}`,
    enrollment
  });
});

export default router;
