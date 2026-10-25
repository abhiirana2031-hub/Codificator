import express from 'express';
import { queryAll, queryOne, runQuery, transaction } from '../db/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { canManageCourse } from '../services/courseAuthorization.js';
import {
  executeRawScript,
  gradeFunctionSubmission,
  checkRateLimit,
  getExecutionOperationalMetrics
} from '../services/codeExecutionService.js';
import { MAX_CODE_BYTES } from '../services/executionWorker.js';

const router = express.Router();

const ALLOWED_LANGUAGES = ['python', 'javascript'];

// Helper to resolve course ID from course_id or lesson_id
function getExerciseCourseId(courseId, lessonId) {
  if (courseId) return courseId;
  if (lessonId) {
    const row = queryOne(`
      SELECT m.course_id FROM lessons l
      JOIN modules m ON l.module_id = m.id
      WHERE l.id = ?
    `, [lessonId]);
    return row?.course_id || null;
  }
  return null;
}

// 1. Operational metrics endpoint (Restricted to Administrators & Instructors)
router.get('/operational-metrics', requireAuth, requireRole('admin', 'instructor'), (req, res) => {
  const metrics = getExecutionOperationalMetrics();
  res.json({
    metrics,
    supportedLanguages: ALLOWED_LANGUAGES,
    maxCodeBytes: MAX_CODE_BYTES,
    serverTimestamp: new Date().toISOString()
  });
});

// 2. List all coding exercises with student's best status
router.get('/', (req, res) => {
  const userId = req.user?.id || null;

  const exercises = queryAll(`
    SELECT e.id, e.lesson_id, e.course_id, e.title, e.slug, e.description,
           e.difficulty, e.points, e.language, e.function_name, e.starter_code,
           e.sample_input, e.sample_output, e.hints, e.explanation, e.order_index,
           c.title as course_title, l.title as lesson_title
    FROM coding_exercises e
    LEFT JOIN courses c ON e.course_id = c.id
    LEFT JOIN lessons l ON e.lesson_id = l.id
    ORDER BY e.course_id, e.order_index ASC
  `).map(ex => {
    let bestSubmission = null;
    if (userId) {
      bestSubmission = queryOne(`
        SELECT status, passed_tests, total_tests, submitted_at
        FROM coding_submissions
        WHERE exercise_id = ? AND user_id = ?
        ORDER BY passed_tests DESC, submitted_at DESC
        LIMIT 1
      `, [ex.id, userId]);
    }

    return {
      ...ex,
      hints: ex.hints ? JSON.parse(ex.hints) : [],
      bestSubmission: bestSubmission ? {
        status: bestSubmission.status,
        passedTests: bestSubmission.passed_tests,
        totalTests: bestSubmission.total_tests,
        submittedAt: bestSubmission.submitted_at
      } : null
    };
  });

  res.json({ exercises });
});

// 3. Get exercises associated with a specific lesson (for classroom embedding)
router.get('/lesson/:lessonId', (req, res) => {
  const { lessonId } = req.params;

  const exercises = queryAll(`
    SELECT e.id, e.lesson_id, e.course_id, e.title, e.slug, e.description,
           e.difficulty, e.points, e.language, e.function_name, e.starter_code,
           e.sample_input, e.sample_output, e.hints, e.explanation, e.order_index
    FROM coding_exercises e
    WHERE e.lesson_id = ?
    ORDER BY e.order_index ASC
  `, [lessonId]).map(ex => {
    // Only return public test cases for classroom view - NEVER hidden cases
    const publicTestCases = queryAll(`
      SELECT id, input_json, expected_output_json, is_private, order_index
      FROM exercise_test_cases
      WHERE exercise_id = ? AND is_private = 0
      ORDER BY order_index ASC
    `, [ex.id]).map(tc => ({
      id: tc.id,
      input: JSON.parse(tc.input_json),
      expected: JSON.parse(tc.expected_output_json),
      isPrivate: false
    }));

    return {
      ...ex,
      hints: ex.hints ? JSON.parse(ex.hints) : [],
      publicTestCases
    };
  });

  res.json({ exercises });
});

// 4. Get full exercise with private test cases (Authoring endpoint restricted to course owners and admins)
router.get('/:exerciseId/admin', requireAuth, requireRole('admin', 'operator', 'instructor'), (req, res) => {
  const { exerciseId } = req.params;
  const ex = queryOne(`
    SELECT e.*, c.title as course_title, l.title as lesson_title
    FROM coding_exercises e
    LEFT JOIN courses c ON e.course_id = c.id
    LEFT JOIN lessons l ON e.lesson_id = l.id
    WHERE e.id = ? OR e.slug = ?
  `, [exerciseId, exerciseId]);

  if (!ex) {
    return res.status(404).json({ error: 'Coding exercise not found' });
  }

  const cid = getExerciseCourseId(ex.course_id, ex.lesson_id);
  if (cid) {
    if (!canManageCourse(cid, req.user)) {
      return res.status(403).json({ error: 'You are not authorized to view test cases for this course exercise' });
    }
  } else {
    const isGlobal = ['admin', 'operator'].includes(String(req.user.role).toLowerCase());
    if (!isGlobal) {
      return res.status(403).json({ error: 'You are not authorized to view this exercise' });
    }
  }

  const testCases = queryAll(`
    SELECT id, input_json, expected_output_json, is_private, order_index
    FROM exercise_test_cases
    WHERE exercise_id = ?
    ORDER BY order_index ASC
  `, [ex.id]).map(tc => ({
    id: tc.id,
    input: JSON.parse(tc.input_json),
    expected: JSON.parse(tc.expected_output_json),
    is_private: Boolean(tc.is_private)
  }));

  res.json({
    exercise: {
      ...ex,
      hints: ex.hints ? JSON.parse(ex.hints) : [],
      testCases
    }
  });
});

// 5. Create Coding Exercise (Restricted to course owners & admins)
router.post('/', requireAuth, requireRole('admin', 'operator', 'instructor'), (req, res) => {
  const {
    title,
    slug,
    description,
    difficulty,
    points,
    language,
    function_name,
    starter_code,
    sample_input,
    sample_output,
    hints,
    explanation,
    lesson_id,
    course_id,
    testCases
  } = req.body;

  if (!title || !description || !function_name || !starter_code) {
    return res.status(400).json({ error: 'Title, description, function_name, and starter_code are required' });
  }

  const targetLang = (language || 'python').toLowerCase().trim();
  if (!ALLOWED_LANGUAGES.includes(targetLang)) {
    return res.status(400).json({ error: `Language must be one of: ${ALLOWED_LANGUAGES.join(', ')}` });
  }

  const cid = getExerciseCourseId(course_id, lesson_id);
  if (cid) {
    if (!canManageCourse(cid, req.user)) {
      return res.status(403).json({ error: 'You are not authorized to create exercises in this course' });
    }
  } else {
    const isGlobal = ['admin', 'operator'].includes(String(req.user.role).toLowerCase());
    if (!isGlobal) {
      return res.status(403).json({ error: 'Course or lesson must be specified for instructor exercises' });
    }
  }

  const exerciseId = `ex-${Date.now()}`;
  const generatedSlug = slug || (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36));
  const count = queryOne('SELECT COUNT(*) as count FROM coding_exercises WHERE course_id = ?', [cid || null]).count;

  transaction(() => {
    runQuery(`
      INSERT INTO coding_exercises (
        id, lesson_id, course_id, title, slug, description, difficulty,
        points, language, function_name, starter_code, sample_input, sample_output,
        hints, explanation, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      exerciseId,
      lesson_id || null,
      course_id || cid || null,
      title,
      generatedSlug,
      description,
      difficulty || 'Easy',
      points ? Number(points) : 5,
      targetLang,
      function_name,
      starter_code,
      sample_input || '',
      sample_output || '',
      hints ? (typeof hints === 'string' ? hints : JSON.stringify(hints)) : '[]',
      explanation || '',
      count + 1
    ]);

    if (Array.isArray(testCases)) {
      testCases.forEach((tc, idx) => {
        const tcId = `tc-${Date.now()}-${idx}`;
        const inputJson = typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input);
        const expectedJson = typeof tc.expected === 'string' ? tc.expected : JSON.stringify(tc.expected);
        runQuery(`
          INSERT INTO exercise_test_cases (id, exercise_id, input_json, expected_output_json, is_private, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          tcId,
          exerciseId,
          inputJson,
          expectedJson,
          tc.is_private ? 1 : 0,
          idx + 1
        ]);
      });
    }
  });

  const created = queryOne('SELECT * FROM coding_exercises WHERE id = ?', [exerciseId]);
  return res.status(201).json({ exercise: created });
});

// 6. Update Coding Exercise (Restricted to course owners & admins)
router.put('/:exerciseId', requireAuth, requireRole('admin', 'operator', 'instructor'), (req, res) => {
  const { exerciseId } = req.params;
  const ex = queryOne('SELECT * FROM coding_exercises WHERE id = ?', [exerciseId]);
  if (!ex) return res.status(404).json({ error: 'Exercise not found' });

  const currentCid = getExerciseCourseId(ex.course_id, ex.lesson_id);
  if (currentCid && !canManageCourse(currentCid, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to update this exercise' });
  }

  const {
    title,
    description,
    difficulty,
    points,
    language,
    function_name,
    starter_code,
    sample_input,
    sample_output,
    hints,
    explanation,
    lesson_id,
    course_id,
    testCases
  } = req.body;

  transaction(() => {
    runQuery(`
      UPDATE coding_exercises
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          difficulty = COALESCE(?, difficulty),
          points = COALESCE(?, points),
          language = COALESCE(?, language),
          function_name = COALESCE(?, function_name),
          starter_code = COALESCE(?, starter_code),
          sample_input = COALESCE(?, sample_input),
          sample_output = COALESCE(?, sample_output),
          hints = COALESCE(?, hints),
          explanation = COALESCE(?, explanation),
          lesson_id = COALESCE(?, lesson_id),
          course_id = COALESCE(?, course_id)
      WHERE id = ?
    `, [
      title,
      description,
      difficulty,
      points !== undefined ? Number(points) : null,
      language,
      function_name,
      starter_code,
      sample_input,
      sample_output,
      hints ? (typeof hints === 'string' ? hints : JSON.stringify(hints)) : null,
      explanation,
      lesson_id,
      course_id,
      exerciseId
    ]);

    if (Array.isArray(testCases)) {
      runQuery('DELETE FROM exercise_test_cases WHERE exercise_id = ?', [exerciseId]);
      testCases.forEach((tc, idx) => {
        const tcId = tc.id || `tc-${Date.now()}-${idx}`;
        const inputJson = typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input);
        const expectedJson = typeof tc.expected === 'string' ? tc.expected : JSON.stringify(tc.expected);
        runQuery(`
          INSERT INTO exercise_test_cases (id, exercise_id, input_json, expected_output_json, is_private, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          tcId,
          exerciseId,
          inputJson,
          expectedJson,
          tc.is_private ? 1 : 0,
          idx + 1
        ]);
      });
    }
  });

  const updated = queryOne('SELECT * FROM coding_exercises WHERE id = ?', [exerciseId]);
  return res.json({ exercise: updated });
});

// 7. Delete Coding Exercise (Restricted to course owners & admins)
router.delete('/:exerciseId', requireAuth, requireRole('admin', 'operator', 'instructor'), (req, res) => {
  const { exerciseId } = req.params;
  const ex = queryOne('SELECT * FROM coding_exercises WHERE id = ?', [exerciseId]);
  if (!ex) return res.status(404).json({ error: 'Exercise not found' });

  const currentCid = getExerciseCourseId(ex.course_id, ex.lesson_id);
  if (currentCid && !canManageCourse(currentCid, req.user)) {
    return res.status(403).json({ error: 'You are not authorized to delete this exercise' });
  }

  const hasSubmissions = queryOne('SELECT id FROM coding_submissions WHERE exercise_id = ? LIMIT 1', [exerciseId]);
  if (hasSubmissions && req.query.force !== 'true') {
    return res.status(400).json({
      error: 'Cannot delete exercise with existing student submissions. Use force=true to confirm permanent removal.'
    });
  }

  runQuery('DELETE FROM coding_exercises WHERE id = ?', [exerciseId]);
  return res.json({ success: true, message: `Exercise "${ex.title}" deleted.` });
});

// 8. Get single exercise details (strictly hides private test cases)
router.get('/:exerciseId', (req, res) => {
  const { exerciseId } = req.params;

  const ex = queryOne(`
    SELECT e.*, c.title as course_title, l.title as lesson_title
    FROM coding_exercises e
    LEFT JOIN courses c ON e.course_id = c.id
    LEFT JOIN lessons l ON e.lesson_id = l.id
    WHERE e.id = ? OR e.slug = ?
  `, [exerciseId, exerciseId]);

  if (!ex) {
    return res.status(404).json({ error: 'Coding exercise not found' });
  }

  // Strictly query public test cases only to protect answer keys
  const publicTestCases = queryAll(`
    SELECT id, input_json, expected_output_json, is_private, order_index
    FROM exercise_test_cases
    WHERE exercise_id = ? AND is_private = 0
    ORDER BY order_index ASC
  `, [ex.id]).map(tc => ({
    id: tc.id,
    input: JSON.parse(tc.input_json),
    expected: JSON.parse(tc.expected_output_json),
    isPrivate: false
  }));

  const totalTestsCount = queryOne(`
    SELECT COUNT(*) as count FROM exercise_test_cases WHERE exercise_id = ?
  `, [ex.id]).count;

  res.json({
    exercise: {
      ...ex,
      hints: ex.hints ? JSON.parse(ex.hints) : [],
      publicTestCases,
      totalTestCasesCount: totalTestsCount
    }
  });
});

// Helper to verify course enrollment, publishing status, and instructor scoping
function verifyExerciseAccess(user, courseId) {
  if (!courseId) return { allowed: true, enrollment: null };

  const course = queryOne('SELECT id, is_published, instructor_id FROM courses WHERE id = ?', [courseId]);
  if (!course) {
    return { allowed: false, reason: 'Course not found' };
  }

  // Admins have full access across all courses
  if (user.role === 'admin' || user.role === 'ADMIN') {
    return { allowed: true, enrollment: null };
  }

  // Instructors have access to courses they teach
  if (user.role === 'instructor' || user.role === 'INSTRUCTOR') {
    if (course.instructor_id === user.id) {
      return { allowed: true, enrollment: null };
    }
  }

  // Unpublished courses cannot be accessed by students
  if (!course.is_published) {
    return { allowed: false, reason: 'Course is not published' };
  }

  const enrollment = queryOne(
    'SELECT id, status FROM enrollments WHERE user_id = ? AND course_id = ?',
    [user.id, courseId]
  );

  if (!enrollment || enrollment.status === 'DROPPED' || enrollment.status === 'REVOKED') {
    return { allowed: false, reason: 'Active enrollment required' };
  }

  return { allowed: true, enrollment };
}

// 5. Run code against sample/public test cases (Practice / Playground)
router.post('/:exerciseId/run', requireAuth, async (req, res) => {
  const { exerciseId } = req.params;
  const { code, language } = req.body;
  const user = req.user;

  // Input validation
  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid code payload: string expected.' });
  }

  if (code.length > MAX_CODE_BYTES) {
    return res.status(413).json({
      error: `Code size exceeds maximum limit of ${MAX_CODE_BYTES / 1024} KB.`
    });
  }

  const targetLang = (language || '').toLowerCase().trim();
  if (targetLang && !ALLOWED_LANGUAGES.includes(targetLang)) {
    return res.status(400).json({
      error: `Unsupported language "${language}". Supported: ${ALLOWED_LANGUAGES.join(', ')}`
    });
  }

  // Rate limiting check
  const rate = checkRateLimit(user.id, 20);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Rate limit reached. Please wait ${rate.retryAfter} seconds before executing again.`
    });
  }

  const ex = queryOne('SELECT * FROM coding_exercises WHERE id = ?', [exerciseId]);
  if (!ex) return res.status(404).json({ error: 'Exercise not found' });

  // Enrollment verification
  const access = verifyExerciseAccess(user, ex.course_id);
  if (!access.allowed) {
    return res.status(403).json({
      error: 'Enrollment required',
      message: 'You must be enrolled in this course to practice or execute exercises.'
    });
  }

  // Load public test cases only for interactive running
  const publicTestCases = queryAll(`
    SELECT id, input_json, expected_output_json, is_private
    FROM exercise_test_cases
    WHERE exercise_id = ? AND is_private = 0
    ORDER BY order_index ASC
  `, [ex.id]);

  try {
    const gradingResult = await gradeFunctionSubmission(
      targetLang || ex.language,
      code,
      ex.function_name,
      publicTestCases,
      3000,
      { userId: user.id, exerciseId: ex.id }
    );

    if (gradingResult.status === 'EXECUTION_DISABLED') {
      return res.status(503).json({
        error: 'Execution Service Unavailable',
        code: 'EXECUTION_DISABLED',
        message: gradingResult.errorMessage
      });
    }

    if (gradingResult.status === 'CAPACITY_EXCEEDED') {
      return res.status(503).json({
        error: 'Execution capacity exceeded',
        message: gradingResult.errorMessage
      });
    }

    if (gradingResult.status === 'QUEUE_TIMEOUT') {
      return res.status(504).json({
        error: 'Execution queue timeout',
        message: gradingResult.errorMessage
      });
    }

    return res.json({
      success: true,
      result: gradingResult
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Execution failed',
      details: err.message
    });
  }
});

// 6. Submit solution for official grading against ALL test cases (public + private)
router.post('/:exerciseId/submit', requireAuth, async (req, res) => {
  const { exerciseId } = req.params;
  const { code, language } = req.body;
  const user = req.user;

  // Input validation
  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid code payload: string expected.' });
  }

  if (code.length > MAX_CODE_BYTES) {
    return res.status(413).json({
      error: `Code size exceeds maximum limit of ${MAX_CODE_BYTES / 1024} KB.`
    });
  }

  const targetLang = (language || '').toLowerCase().trim();
  if (targetLang && !ALLOWED_LANGUAGES.includes(targetLang)) {
    return res.status(400).json({
      error: `Unsupported language "${language}". Supported: ${ALLOWED_LANGUAGES.join(', ')}`
    });
  }

  // Rate limiting (15 submissions/minute)
  const rate = checkRateLimit(user.id, 15);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Submission rate limit reached. Please wait ${rate.retryAfter} seconds before submitting again.`
    });
  }

  const ex = queryOne('SELECT * FROM coding_exercises WHERE id = ?', [exerciseId]);
  if (!ex) return res.status(404).json({ error: 'Exercise not found' });

  // Enrollment verification
  const access = verifyExerciseAccess(user, ex.course_id);
  if (!access.allowed) {
    return res.status(403).json({
      error: 'Enrollment required',
      message: 'You must be enrolled in this course to submit solutions.'
    });
  }

  // Load ALL test cases (public and hidden private)
  const allTestCases = queryAll(`
    SELECT id, input_json, expected_output_json, is_private, order_index
    FROM exercise_test_cases
    WHERE exercise_id = ?
    ORDER BY order_index ASC
  `, [ex.id]);

  try {
    const gradeResult = await gradeFunctionSubmission(
      targetLang || ex.language,
      code,
      ex.function_name,
      allTestCases,
      3000,
      { userId: user.id, exerciseId: ex.id }
    );

    // Infrastructure failures, disabled execution, or capacity exceeded must NOT be persisted as student submissions!
    if (gradeResult.status === 'EXECUTION_DISABLED') {
      return res.status(503).json({
        error: 'Execution Service Unavailable',
        code: 'EXECUTION_DISABLED',
        message: gradeResult.errorMessage
      });
    }

    if (gradeResult.status === 'CAPACITY_EXCEEDED') {
      return res.status(503).json({
        error: 'Execution capacity exceeded',
        message: gradeResult.errorMessage
      });
    }

    if (gradeResult.status === 'QUEUE_TIMEOUT') {
      return res.status(504).json({
        error: 'Execution queue timeout',
        message: gradeResult.errorMessage
      });
    }

    if (gradeResult.status === 'INFRASTRUCTURE_ERROR') {
      return res.status(500).json({
        error: 'Execution infrastructure error',
        message: gradeResult.errorMessage
      });
    }

    const submissionId = `csub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Sanitize feedback details: strip secret input and expected output from private test cases
    const sanitizedDetails = (gradeResult.testResults || []).map(r => {
      if (r.isPrivate) {
        return {
          index: r.index,
          isPrivate: true,
          passed: r.passed,
          error: r.error || (r.passed ? null : 'Hidden test case output mismatch')
        };
      }
      return r;
    });

    // Record submission atomically
    transaction(() => {
      runQuery(`
        INSERT INTO coding_submissions (
          id, exercise_id, user_id, enrollment_id, language, code, status,
          passed_tests, total_tests, runtime_ms, error_message, feedback_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        submissionId,
        ex.id,
        user.id,
        access.enrollment ? access.enrollment.id : null,
        targetLang || ex.language,
        code,
        gradeResult.status,
        gradeResult.passedTests,
        gradeResult.totalTests,
        gradeResult.runtimeMs,
        gradeResult.errorMessage || null,
        JSON.stringify(sanitizedDetails)
      ]);
    });

    return res.json({
      success: true,
      submission: {
        id: submissionId,
        status: gradeResult.status,
        passedTests: gradeResult.passedTests,
        totalTests: gradeResult.totalTests,
        runtimeMs: gradeResult.runtimeMs,
        errorMessage: gradeResult.errorMessage,
        testResults: sanitizedDetails,
        submittedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Grading failed',
      details: err.message
    });
  }
});

// 7. Get student's submission history (Strict Student Isolation)
router.get('/:exerciseId/submissions', requireAuth, (req, res) => {
  const { exerciseId } = req.params;
  const userId = req.user.id;

  const submissions = queryAll(`
    SELECT id, exercise_id, language, status, passed_tests, total_tests,
           runtime_ms, error_message, submitted_at, feedback_details
    FROM coding_submissions
    WHERE exercise_id = ? AND user_id = ?
    ORDER BY submitted_at DESC
    LIMIT 30
  `, [exerciseId, userId]).map(sub => ({
    ...sub,
    feedbackDetails: sub.feedback_details ? JSON.parse(sub.feedback_details) : []
  }));

  res.json({ submissions });
});

// 8. Standalone raw script execution endpoint (For IDE Playground)
router.post('/run-raw', requireAuth, async (req, res) => {
  const { language, code, stdin } = req.body;
  const user = req.user;

  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Invalid code payload: string expected.' });
  }

  if (code.length > MAX_CODE_BYTES) {
    return res.status(413).json({
      error: `Code size exceeds maximum limit of ${MAX_CODE_BYTES / 1024} KB.`
    });
  }

  const targetLang = (language || '').toLowerCase().trim();
  if (!ALLOWED_LANGUAGES.includes(targetLang)) {
    return res.status(400).json({
      error: `Unsupported language "${language}". Supported: ${ALLOWED_LANGUAGES.join(', ')}`
    });
  }

  const rate = checkRateLimit(user.id, 20);
  if (!rate.allowed) {
    return res.status(429).json({
      error: `Rate limit reached. Please wait ${rate.retryAfter} seconds before executing again.`
    });
  }

  const result = await executeRawScript(targetLang, code, stdin || '', 3000, { userId: user.id });

  if (result.status === 'EXECUTION_DISABLED') {
    return res.status(503).json({
      error: 'Execution Service Unavailable',
      code: 'EXECUTION_DISABLED',
      message: result.stderr
    });
  }

  if (result.status === 'CAPACITY_EXCEEDED') {
    return res.status(503).json({
      error: 'Execution capacity exceeded',
      message: result.stderr
    });
  }

  if (result.status === 'QUEUE_TIMEOUT') {
    return res.status(504).json({
      error: 'Execution queue timeout',
      message: result.stderr
    });
  }

  res.json({ result });
});

export default router;
