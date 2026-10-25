import { queryAll, queryOne } from '../db/db.js';
import { canManageCourse } from './courseAuthorization.js';

/**
 * Sanitizes a value for CSV output to prevent spreadsheet formula injection attacks.
 * If a cell begins with =, +, -, @, \t, or \r, it is prefixed with a single quote (').
 * Embedded quotes and commas are strictly escaped in standard RFC-4180 format.
 */
export function sanitizeCsvField(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Strip surrounding spaces while preserving leading tabs/CR for injection checking
  str = str.replace(/^[ \f\v]+|[ \f\v]+$/g, '');
  // Check for dangerous leading spreadsheet formula characters
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Parses time window filters into ISO date strings for SQL queries.
 */
export function parseDateRange(timeWindow = 'all', startDate = null, endDate = null) {
  const now = new Date();
  let startIso = null;
  let endIso = now.toISOString();
  let label = 'All Time';

  if (startDate && endDate) {
    startIso = new Date(startDate).toISOString();
    endIso = new Date(endDate).toISOString();
    label = `${startDate} to ${endDate}`;
  } else if (timeWindow === '7d') {
    startIso = new Date(Date.now() - 7 * 86400000).toISOString();
    label = 'Last 7 Days';
  } else if (timeWindow === '30d') {
    startIso = new Date(Date.now() - 30 * 86400000).toISOString();
    label = 'Last 30 Days';
  } else if (timeWindow === '90d') {
    startIso = new Date(Date.now() - 90 * 86400000).toISOString();
    label = 'Last 90 Days';
  }

  return { startIso, endIso, label };
}

/**
 * Calculates authoritative median from an array of numbers.
 */
export function calculateMedian(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  }
  return Math.round(sorted[mid] * 10) / 10;
}

/**
 * Resolves list of courses authorized for the requesting user.
 * Admins/Operators have platform-wide access; Instructors only access assigned courses.
 */
export function getAuthorizedCourses(user, requestedCourseId = null) {
  if (!user) throw { status: 401, message: 'Authentication required' };

  const isPrivileged = user.role === 'ADMIN' || user.role === 'OPERATOR';

  if (requestedCourseId) {
    const auth = canManageCourse(requestedCourseId, user);
    if (!auth.allowed) {
      throw { status: auth.status || 403, message: auth.error || 'Access denied to this course' };
    }
    const course = queryOne('SELECT * FROM courses WHERE id = ?', [requestedCourseId]);
    if (!course) throw { status: 404, message: 'Course not found' };
    return [course];
  }

  let sql = 'SELECT * FROM courses';
  const params = [];
  if (!isPrivileged) {
    sql += ' WHERE (instructor_id = ? OR id IN (SELECT course_id FROM course_instructors WHERE instructor_id = ?))';
    params.push(user.id, user.id);
  }
  sql += ' ORDER BY created_at DESC';

  return queryAll(sql, params);
}

/**
 * Generates instructor overview analytics with course performance comparisons and KPI cards.
 */
export function getInstructorAnalyticsOverview(user, options = {}) {
  const { courseId, timeWindow = 'all', startDate, endDate } = options;
  const { startIso, endIso, label } = parseDateRange(timeWindow, startDate, endDate);

  const authorizedCourses = getAuthorizedCourses(user, courseId);
  if (authorizedCourses.length === 0) {
    return {
      timeFilter: { timeWindow, label, startIso, endIso },
      metrics: {
        totalCourses: 0,
        publishedCourses: 0,
        totalEnrollments: 0,
        newEnrollments: 0,
        completedEnrollments: 0,
        courseCompletionRate: 0,
        activeStudents: 0,
        avgQuizScore: 0,
        medianQuizScore: 0,
        totalQuizAttempts: 0,
        pendingReviews: 0,
        totalCertificatesIssued: 0
      },
      progressBuckets: { '0-25%': 0, '26-50%': 0, '51-75%': 0, '76-100%': 0 },
      courseComparisons: [],
      enrollmentTimeline: []
    };
  }

  const courseIds = authorizedCourses.map(c => c.id);
  const placeholders = courseIds.map(() => '?').join(',');

  // 1. Total & New Enrollments
  const totalEnrollments = queryOne(
    `SELECT COUNT(*) as count FROM enrollments WHERE course_id IN (${placeholders})`,
    courseIds
  ).count;

  let newEnrollmentsSql = `SELECT COUNT(*) as count FROM enrollments WHERE course_id IN (${placeholders})`;
  const newEnrollParams = [...courseIds];
  if (startIso) {
    newEnrollmentsSql += ` AND enrolled_at >= ? AND enrolled_at <= ?`;
    newEnrollParams.push(startIso, endIso);
  }
  const newEnrollments = queryOne(newEnrollmentsSql, newEnrollParams).count;

  // 2. Completed Enrollments
  const completedEnrollments = queryOne(
    `SELECT COUNT(*) as count FROM enrollments WHERE course_id IN (${placeholders}) AND status = 'COMPLETED'`,
    courseIds
  ).count;

  const courseCompletionRate = totalEnrollments > 0
    ? Math.round((completedEnrollments / totalEnrollments) * 1000) / 10
    : 0;

  // 3. Active Students in the configured time window
  // Distinct users with activity in lesson progress, quiz attempts, assignments, or coding submissions
  let activeSql = `
    SELECT COUNT(DISTINCT user_id) as count FROM (
      SELECT lp.user_id FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id IN (${placeholders}) ${startIso ? 'AND lp.updated_at >= ? AND lp.updated_at <= ?' : ''}
      UNION
      SELECT qa.user_id FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN modules m ON q.module_id = m.id
      WHERE m.course_id IN (${placeholders}) ${startIso ? 'AND qa.submitted_at >= ? AND qa.submitted_at <= ?' : ''}
      UNION
      SELECT asub.user_id FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      JOIN modules m ON a.module_id = m.id
      WHERE m.course_id IN (${placeholders}) ${startIso ? 'AND asub.submitted_at >= ? AND asub.submitted_at <= ?' : ''}
      UNION
      SELECT cs.user_id FROM coding_submissions cs
      JOIN coding_exercises ce ON cs.exercise_id = ce.id
      WHERE ce.course_id IN (${placeholders}) ${startIso ? 'AND cs.submitted_at >= ? AND cs.submitted_at <= ?' : ''}
    )
  `;
  const activeParams = [];
  // Add params for 4 UNION clauses
  for (let i = 0; i < 4; i++) {
    activeParams.push(...courseIds);
    if (startIso) activeParams.push(startIso, endIso);
  }
  const activeStudents = queryOne(activeSql, activeParams).count;

  // 4. Quiz Scores (Mean & Median)
  let quizSql = `
    SELECT qa.percentage FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN modules m ON q.module_id = m.id
    WHERE m.course_id IN (${placeholders})
  `;
  const quizParams = [...courseIds];
  if (startIso) {
    quizSql += ` AND qa.submitted_at >= ? AND qa.submitted_at <= ?`;
    quizParams.push(startIso, endIso);
  }
  const quizRows = queryAll(quizSql, quizParams);
  const quizPercentages = quizRows.map(r => r.percentage);
  const totalQuizAttempts = quizPercentages.length;
  const avgQuizScore = totalQuizAttempts > 0
    ? Math.round((quizPercentages.reduce((a, b) => a + b, 0) / totalQuizAttempts) * 10) / 10
    : 0;
  const medianQuizScore = calculateMedian(quizPercentages);

  // 5. Pending Reviews
  const pendingReviews = queryOne(
    `SELECT COUNT(*) as count FROM assignment_submissions asub
     JOIN assignments a ON asub.assignment_id = a.id
     JOIN modules m ON a.module_id = m.id
     WHERE m.course_id IN (${placeholders}) AND asub.status IN ('SUBMITTED', 'UNDER_REVIEW')`,
    courseIds
  ).count;

  // 6. Certificates Issued
  const totalCertificatesIssued = queryOne(
    `SELECT COUNT(*) as count FROM certificates WHERE course_id IN (${placeholders})`,
    courseIds
  ).count;

  // 7. Progress Distribution Buckets
  const progressBuckets = {
    '0-25%': queryOne(`SELECT COUNT(*) as count FROM enrollments WHERE course_id IN (${placeholders}) AND progress_percent BETWEEN 0 AND 25`, courseIds).count,
    '26-50%': queryOne(`SELECT COUNT(*) as count FROM enrollments WHERE course_id IN (${placeholders}) AND progress_percent > 25 AND progress_percent <= 50`, courseIds).count,
    '51-75%': queryOne(`SELECT COUNT(*) as count FROM enrollments WHERE course_id IN (${placeholders}) AND progress_percent > 50 AND progress_percent <= 75`, courseIds).count,
    '76-100%': queryOne(`SELECT COUNT(*) as count FROM enrollments WHERE course_id IN (${placeholders}) AND progress_percent > 75`, courseIds).count
  };

  // 8. Course-by-Course Comparisons
  const courseComparisons = authorizedCourses.map(c => {
    const enrolled = queryOne('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [c.id]).count;
    const completed = queryOne("SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND status = 'COMPLETED'", [c.id]).count;
    const compRate = enrolled > 0 ? Math.round((completed / enrolled) * 1000) / 10 : 0;

    const courseActive = queryOne(`
      SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT lp.user_id FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE m.course_id = ? ${startIso ? 'AND lp.updated_at >= ?' : ''}
        UNION
        SELECT qa.user_id FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id JOIN modules m ON q.module_id = m.id WHERE m.course_id = ? ${startIso ? 'AND qa.submitted_at >= ?' : ''}
      )
    `, startIso ? [c.id, startIso, c.id, startIso] : [c.id, c.id]).count;

    const avgQuiz = queryOne(`
      SELECT AVG(qa.percentage) as score FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN modules m ON q.module_id = m.id
      WHERE m.course_id = ?
    `, [c.id]).score;

    const coursePending = queryOne(`
      SELECT COUNT(*) as count FROM assignment_submissions asub
      JOIN assignments a ON asub.assignment_id = a.id
      JOIN modules m ON a.module_id = m.id
      WHERE m.course_id = ? AND asub.status IN ('SUBMITTED', 'UNDER_REVIEW')
    `, [c.id]).count;

    // Detect module with highest drop-off
    const modules = queryAll('SELECT id, title, order_index FROM modules WHERE course_id = ? ORDER BY order_index ASC', [c.id]);
    let highestDropoffModule = null;
    let maxDrop = -1;

    let prevCompleted = enrolled;
    modules.forEach(m => {
      const mCompleted = queryOne('SELECT COUNT(*) as count FROM module_progress WHERE module_id = ? AND is_completed = 1', [m.id]).count;
      const drop = prevCompleted - mCompleted;
      if (drop > maxDrop && enrolled > 0) {
        maxDrop = drop;
        highestDropoffModule = {
          id: m.id,
          title: m.title,
          dropCount: drop,
          dropRatePercent: prevCompleted > 0 ? Math.round((drop / prevCompleted) * 100) : 0
        };
      }
      prevCompleted = mCompleted;
    });

    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      status: c.status || (c.is_published ? 'PUBLISHED' : 'DRAFT'),
      is_published: Boolean(c.is_published),
      category: c.category,
      level: c.level,
      enrolledCount: enrolled,
      activeCount: courseActive,
      completedCount: completed,
      completionRate: compRate,
      avgQuizScore: avgQuiz ? Math.round(avgQuiz * 10) / 10 : 0,
      pendingReviews: coursePending,
      highestDropoffModule
    };
  });

  return {
    timeFilter: { timeWindow, label, startIso, endIso },
    metrics: {
      totalCourses: authorizedCourses.length,
      publishedCourses: authorizedCourses.filter(c => c.status === 'PUBLISHED' || c.is_published).length,
      totalEnrollments,
      newEnrollments,
      completedEnrollments,
      courseCompletionRate,
      activeStudents,
      avgQuizScore,
      medianQuizScore,
      totalQuizAttempts,
      pendingReviews,
      totalCertificatesIssued
    },
    progressBuckets,
    courseComparisons
  };
}

/**
 * Calculates progression funnel and granular module/lesson drop-off analysis.
 */
export function getCourseFunnelAnalytics(courseId, user, options = {}) {
  const auth = canManageCourse(courseId, user);
  if (!auth.allowed) {
    throw { status: auth.status || 403, message: auth.error || 'Access denied' };
  }

  const course = queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) throw { status: 404, message: 'Course not found' };

  // 1. Total Enrolled
  const totalEnrolled = queryOne('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [courseId]).count;

  // 2. Course Started (>= 1 lesson with progress recorded or progress_percent > 0)
  const studentsStartedCourse = queryOne(`
    SELECT COUNT(DISTINCT user_id) as count FROM (
      SELECT lp.user_id FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = ? AND (lp.watched_progress_percent > 0 OR lp.status IN ('IN_PROGRESS', 'COMPLETED'))
      UNION
      SELECT e.user_id FROM enrollments e
      WHERE e.course_id = ? AND e.progress_percent > 0
    )
  `, [courseId, courseId]).count;

  // 3. Module Stages
  const modules = queryAll('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC', [courseId]);
  let prevModuleCompleted = studentsStartedCourse;

  const moduleStages = modules.map(m => {
    const startedCount = queryOne(`
      SELECT COUNT(DISTINCT lp.user_id) as count FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      WHERE l.module_id = ? AND (lp.watched_progress_percent > 0 OR lp.status IN ('IN_PROGRESS', 'COMPLETED'))
    `, [m.id]).count;

    const completedCount = queryOne(
      'SELECT COUNT(*) as count FROM module_progress WHERE module_id = ? AND is_completed = 1',
      [m.id]
    ).count;

    const dropoffFromPrev = Math.max(0, prevModuleCompleted - completedCount);
    const dropoffRatePercent = prevModuleCompleted > 0
      ? Math.round((dropoffFromPrev / prevModuleCompleted) * 1000) / 10
      : 0;

    prevModuleCompleted = completedCount;

    return {
      id: m.id,
      title: m.title,
      orderIndex: m.order_index,
      completionPolicy: m.completion_policy,
      studentsStarted: startedCount,
      studentsCompleted: completedCount,
      completionRate: totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 1000) / 10 : 0,
      dropoffFromPrev,
      dropoffRatePercent
    };
  });

  // 4. Assessments Completed (Passed all quizzes & approved assignments)
  const requiredQuizzes = queryAll(`
    SELECT q.id FROM quizzes q
    JOIN modules m ON q.module_id = m.id
    WHERE m.course_id = ? AND q.is_required = 1
  `, [courseId]);

  let assessmentsCompletedCount = 0;
  if (requiredQuizzes.length > 0) {
    const qPlaceholders = requiredQuizzes.map(() => '?').join(',');
    const qIds = requiredQuizzes.map(q => q.id);
    assessmentsCompletedCount = queryOne(`
      SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT user_id, COUNT(DISTINCT quiz_id) as passed_quizzes
        FROM quiz_attempts
        WHERE quiz_id IN (${qPlaceholders}) AND is_passed = 1
        GROUP BY user_id
        HAVING passed_quizzes >= ?
      )
    `, [...qIds, requiredQuizzes.length]).count;
  } else {
    // If no quizzes, fallback to module completions
    assessmentsCompletedCount = moduleStages.length > 0
      ? moduleStages[moduleStages.length - 1].studentsCompleted
      : 0;
  }

  // 5. Course Completed
  const completedCourse = queryOne(
    "SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND status = 'COMPLETED'",
    [courseId]
  ).count;

  // 6. Lesson-by-Lesson Progression Table
  const allLessons = queryAll(`
    SELECT l.id, l.title, l.lesson_type, l.order_index as lesson_order,
           m.id as module_id, m.title as module_title, m.order_index as module_order
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    WHERE m.course_id = ?
    ORDER BY m.order_index ASC, l.order_index ASC
  `, [courseId]);

  let maxLessonDrop = -1;
  let highestDropoffLesson = null;

  const lessonProgression = allLessons.map((l, idx) => {
    const started = queryOne(`
      SELECT COUNT(DISTINCT user_id) as count FROM lesson_progress
      WHERE lesson_id = ? AND (watched_progress_percent > 0 OR status IN ('IN_PROGRESS', 'COMPLETED'))
    `, [l.id]).count;

    const completed = queryOne(
      "SELECT COUNT(*) as count FROM lesson_progress WHERE lesson_id = ? AND status = 'COMPLETED'",
      [l.id]
    ).count;

    const dropoffCount = Math.max(0, started - completed);
    const dropoffPercent = started > 0 ? Math.round((dropoffCount / started) * 1000) / 10 : 0;
    const completionRate = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 1000) / 10 : 0;
    const retentionRate = started > 0 ? Math.round((completed / started) * 1000) / 10 : 0;

    if (dropoffCount > maxLessonDrop && started > 0) {
      maxLessonDrop = dropoffCount;
      highestDropoffLesson = {
        lessonId: l.id,
        title: l.title,
        moduleTitle: l.module_title,
        started,
        completed,
        dropoffCount,
        dropoffPercent
      };
    }

    return {
      sequence: idx + 1,
      lessonId: l.id,
      title: l.title,
      lessonType: l.lesson_type,
      moduleId: l.module_id,
      moduleTitle: l.module_title,
      startedCount: started,
      completedCount: completed,
      completionRate,
      retentionRate,
      dropoffCount,
      dropoffPercent,
      isHighestDropoff: false
    };
  });

  if (highestDropoffLesson) {
    const target = lessonProgression.find(lp => lp.lessonId === highestDropoffLesson.lessonId);
    if (target) target.isHighestDropoff = true;
  }

  // 7. Assessment Abandonment (Measurable checkpoint drop-off)
  const assessmentAbandonment = modules.map(m => {
    const quiz = queryOne('SELECT id, title FROM quizzes WHERE module_id = ?', [m.id]);
    if (!quiz) return null;

    // Students who completed all lessons in this module
    const lessonsInModule = queryAll('SELECT id FROM lessons WHERE module_id = ?', [m.id]);
    const moduleLessonCount = lessonsInModule.length;

    let studentsFinishedLessons = 0;
    if (moduleLessonCount > 0) {
      const lPlaceholders = lessonsInModule.map(() => '?').join(',');
      const lIds = lessonsInModule.map(l => l.id);
      studentsFinishedLessons = queryOne(`
        SELECT COUNT(DISTINCT user_id) as count FROM (
          SELECT user_id, COUNT(DISTINCT lesson_id) as completed_count
          FROM lesson_progress
          WHERE lesson_id IN (${lPlaceholders}) AND status = 'COMPLETED'
          GROUP BY user_id
          HAVING completed_count >= ?
        )
      `, [...lIds, moduleLessonCount]).count;
    }

    const quizAttemptedCount = queryOne(
      'SELECT COUNT(DISTINCT user_id) as count FROM quiz_attempts WHERE quiz_id = ?',
      [quiz.id]
    ).count;

    const quizPassedCount = queryOne(
      'SELECT COUNT(DISTINCT user_id) as count FROM quiz_attempts WHERE quiz_id = ? AND is_passed = 1',
      [quiz.id]
    ).count;

    const abandonedCount = Math.max(0, studentsFinishedLessons - quizAttemptedCount);
    const abandonmentRate = studentsFinishedLessons > 0
      ? Math.round((abandonedCount / studentsFinishedLessons) * 1000) / 10
      : 0;

    return {
      moduleId: m.id,
      moduleTitle: m.title,
      quizId: quiz.id,
      quizTitle: quiz.title,
      moduleLessonsCompletedCount: studentsFinishedLessons,
      quizAttemptedCount,
      quizPassedCount,
      abandonedBeforeAttempt: abandonedCount,
      abandonmentRate
    };
  }).filter(Boolean);

  // Highest drop-off module
  let highestDropoffModule = null;
  let maxModDrop = -1;
  moduleStages.forEach(ms => {
    if (ms.dropoffFromPrev > maxModDrop && totalEnrolled > 0) {
      maxModDrop = ms.dropoffFromPrev;
      highestDropoffModule = ms;
    }
  });

  return {
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      status: course.status || (course.is_published ? 'PUBLISHED' : 'DRAFT'),
      totalEnrolled
    },
    funnel: {
      enrolled: totalEnrolled,
      startedCourse: studentsStartedCourse,
      startedPercent: totalEnrolled > 0 ? Math.round((studentsStartedCourse / totalEnrolled) * 1000) / 10 : 0,
      modules: moduleStages,
      assessmentsCompleted: assessmentsCompletedCount,
      completedCourse,
      completionRate: totalEnrolled > 0 ? Math.round((completedCourse / totalEnrolled) * 1000) / 10 : 0
    },
    lessonProgression,
    assessmentAbandonment,
    highestDropoffLesson,
    highestDropoffModule
  };
}

/**
 * Calculates in-depth assessment outcomes, score distributions, and question-level difficulty.
 */
export function getCourseAssessmentAnalytics(courseId, user, options = {}) {
  const auth = canManageCourse(courseId, user);
  if (!auth.allowed) {
    throw { status: auth.status || 403, message: auth.error || 'Access denied' };
  }

  const course = queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) throw { status: 404, message: 'Course not found' };

  // 1. Quizzes & Question Performance
  const quizzes = queryAll(`
    SELECT q.*, m.title as module_title
    FROM quizzes q
    JOIN modules m ON q.module_id = m.id
    WHERE m.course_id = ?
    ORDER BY m.order_index ASC
  `, [courseId]);

  const allQuestionsAcrossQuizzes = [];

  const quizAnalytics = quizzes.map(q => {
    const attempts = queryAll('SELECT percentage, is_passed FROM quiz_attempts WHERE quiz_id = ?', [q.id]);
    const totalAttempts = attempts.length;
    const uniqueStudents = queryOne('SELECT COUNT(DISTINCT user_id) as count FROM quiz_attempts WHERE quiz_id = ?', [q.id]).count;
    const passedAttempts = attempts.filter(a => a.is_passed === 1 || a.is_passed === true).length;
    const passRate = uniqueStudents > 0
      ? Math.round((queryOne('SELECT COUNT(DISTINCT user_id) as count FROM quiz_attempts WHERE quiz_id = ? AND is_passed = 1', [q.id]).count / uniqueStudents) * 1000) / 10
      : 0;

    const scores = attempts.map(a => a.percentage);
    const avgScore = totalAttempts > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / totalAttempts) * 10) / 10 : 0;
    const medianScore = calculateMedian(scores);

    // Distribution
    const scoreDistribution = {
      '0-49%': attempts.filter(a => a.percentage < 50).length,
      '50-69%': attempts.filter(a => a.percentage >= 50 && a.percentage < 70).length,
      '70-84%': attempts.filter(a => a.percentage >= 70 && a.percentage < 85).length,
      '85-100%': attempts.filter(a => a.percentage >= 85).length
    };

    // Question-level metrics
    const questions = queryAll(
      'SELECT id, prompt, question_type, marks, concept_to_review, order_index FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC',
      [q.id]
    ).map(quest => {
      const answers = queryAll('SELECT is_correct FROM quiz_answers WHERE question_id = ?', [quest.id]);
      const totalAnswers = answers.length;
      const correctAnswers = answers.filter(ans => ans.is_correct === 1 || ans.is_correct === true).length;
      const correctnessRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 1000) / 10 : 0;

      const qObj = {
        id: quest.id,
        quizId: q.id,
        quizTitle: q.title,
        moduleTitle: q.module_title,
        prompt: quest.prompt,
        questionType: quest.question_type,
        marks: quest.marks,
        conceptToReview: quest.concept_to_review,
        totalAnswers,
        correctAnswers,
        correctnessRate,
        isFrequentlyMissed: totalAnswers >= 2 && correctnessRate < 60
      };

      allQuestionsAcrossQuizzes.push(qObj);
      return qObj;
    });

    return {
      id: q.id,
      title: q.title,
      moduleTitle: q.module_title,
      passingPercentage: q.passing_percentage,
      maxAttempts: q.max_attempts,
      totalAttempts,
      uniqueStudents,
      passRatePercent: passRate,
      avgScore,
      medianScore,
      scoreDistribution,
      questions
    };
  });

  // Frequently Missed Questions across all course quizzes (lowest correctness rate)
  const frequentlyMissedQuestions = allQuestionsAcrossQuizzes
    .filter(q => q.totalAnswers >= 1)
    .sort((a, b) => a.correctnessRate - b.correctnessRate)
    .slice(0, 8);

  // 2. Coding Exercises Analytics
  const codingExercises = queryAll(
    'SELECT id, title, difficulty, points, language, slug FROM coding_exercises WHERE course_id = ? ORDER BY order_index ASC',
    [courseId]
  ).map(ce => {
    const submissions = queryAll('SELECT status, passed_tests, total_tests, runtime_ms FROM coding_submissions WHERE exercise_id = ?', [ce.id]);
    const totalSubmissions = submissions.length;
    const uniqueStudents = queryOne('SELECT COUNT(DISTINCT user_id) as count FROM coding_submissions WHERE exercise_id = ?', [ce.id]).count;
    const acceptedCount = submissions.filter(s => s.status === 'ACCEPTED').length;
    const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedCount / totalSubmissions) * 1000) / 10 : 0;

    const runtimes = submissions.filter(s => s.runtime_ms > 0).map(s => s.runtime_ms);
    const avgRuntimeMs = runtimes.length > 0 ? Math.round((runtimes.reduce((a, b) => a + b, 0) / runtimes.length) * 10) / 10 : 0;

    const statusBreakdown = {
      ACCEPTED: submissions.filter(s => s.status === 'ACCEPTED').length,
      WRONG_ANSWER: submissions.filter(s => s.status === 'WRONG_ANSWER').length,
      RUNTIME_ERROR: submissions.filter(s => s.status === 'RUNTIME_ERROR').length,
      TIME_LIMIT_EXCEEDED: submissions.filter(s => s.status === 'TIME_LIMIT_EXCEEDED').length
    };

    return {
      id: ce.id,
      title: ce.title,
      difficulty: ce.difficulty,
      points: ce.points,
      language: ce.language,
      totalSubmissions,
      uniqueStudents,
      acceptedCount,
      acceptanceRatePercent: acceptanceRate,
      avgRuntimeMs,
      statusBreakdown
    };
  });

  // 3. Assignments Analytics
  const assignments = queryAll(`
    SELECT a.*, m.title as module_title
    FROM assignments a
    JOIN modules m ON a.module_id = m.id
    WHERE m.course_id = ?
    ORDER BY m.order_index ASC
  `, [courseId]).map(asg => {
    const submissions = queryAll('SELECT status, marks_awarded FROM assignment_submissions WHERE assignment_id = ?', [asg.id]);
    const totalSubmissions = submissions.length;
    const uniqueSubmitters = queryOne('SELECT COUNT(DISTINCT user_id) as count FROM assignment_submissions WHERE assignment_id = ?', [asg.id]).count;
    const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;
    const underReviewCount = submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW').length;
    const resubmissionCount = submissions.filter(s => s.status === 'RESUBMISSION_REQUIRED').length;

    const marksGiven = submissions.filter(s => s.marks_awarded !== null && s.marks_awarded !== undefined).map(s => s.marks_awarded);
    const avgMarks = marksGiven.length > 0 ? Math.round((marksGiven.reduce((a, b) => a + b, 0) / marksGiven.length) * 10) / 10 : 0;

    return {
      id: asg.id,
      title: asg.title,
      moduleTitle: asg.module_title,
      maxMarks: asg.max_marks,
      dueDate: asg.due_date,
      totalSubmissions,
      uniqueSubmitters,
      approvedCount,
      underReviewCount,
      resubmissionCount,
      avgMarksAwarded: avgMarks
    };
  });

  return {
    course: { id: course.id, title: course.title },
    quizzes: quizAnalytics,
    frequentlyMissedQuestions,
    codingExercises,
    assignments
  };
}

/**
 * Server-side paginated and filterable student roster with learning metrics.
 */
export function getCourseStudentsAnalytics(courseId, user, options = {}) {
  const auth = canManageCourse(courseId, user);
  if (!auth.allowed) {
    throw { status: auth.status || 403, message: auth.error || 'Access denied' };
  }

  const {
    search,
    status,
    minProgress,
    maxProgress,
    page = 1,
    limit = 15,
    sortBy = 'enrolled_at',
    sortOrder = 'DESC'
  } = options;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * pageSize;

  let baseSql = `
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    WHERE e.course_id = ?
  `;
  const params = [courseId];

  if (search && search.trim()) {
    baseSql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  if (status && status !== 'ALL') {
    baseSql += ' AND e.status = ?';
    params.push(status);
  }

  if (minProgress !== undefined && minProgress !== '') {
    baseSql += ' AND e.progress_percent >= ?';
    params.push(Number(minProgress));
  }

  if (maxProgress !== undefined && maxProgress !== '') {
    baseSql += ' AND e.progress_percent <= ?';
    params.push(Number(maxProgress));
  }

  const total = queryOne(`SELECT COUNT(*) as count ${baseSql}`, params).count;

  // Safe sorting columns
  const allowedSorts = {
    enrolled_at: 'e.enrolled_at',
    progress_percent: 'e.progress_percent',
    name: 'u.name'
  };
  const sortCol = allowedSorts[sortBy] || 'e.enrolled_at';
  const orderDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const selectSql = `
    SELECT e.id as enrollment_id, e.user_id, e.status as enrollment_status,
           e.progress_percent, e.enrolled_at, e.completed_at,
           u.name as student_name, u.email as student_email, u.avatar_url,
           (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE m.course_id = ? AND lp.enrollment_id = e.id AND lp.status = 'COMPLETED') as completed_lessons,
           (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ?) as total_lessons,
           (SELECT COUNT(*) FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id JOIN modules m ON q.module_id = m.id WHERE m.course_id = ? AND qa.enrollment_id = e.id) as quiz_attempts_count,
           (SELECT AVG(qa.percentage) FROM quiz_attempts qa JOIN quizzes q ON qa.quiz_id = q.id JOIN modules m ON q.module_id = m.id WHERE m.course_id = ? AND qa.enrollment_id = e.id) as avg_quiz_score,
           (SELECT COUNT(*) FROM assignment_submissions asub JOIN assignments a ON asub.assignment_id = a.id JOIN modules m ON a.module_id = m.id WHERE m.course_id = ? AND asub.enrollment_id = e.id) as assignment_submissions_count,
           (SELECT MAX(updated_at) FROM lesson_progress WHERE enrollment_id = e.id) as last_lesson_activity
    ${baseSql}
    ORDER BY ${sortCol} ${orderDirection}
    LIMIT ? OFFSET ?
  `;

  const queryParams = [courseId, courseId, courseId, courseId, courseId, ...params, pageSize, offset];
  const rows = queryAll(selectSql, queryParams);

  const students = rows.map(r => {
    const lastActive = r.last_lesson_activity || r.enrolled_at;
    const daysSinceActive = Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));
    return {
      enrollmentId: r.enrollment_id,
      userId: r.user_id,
      name: r.student_name,
      email: r.student_email,
      avatarUrl: r.avatar_url,
      status: r.enrollment_status,
      progressPercent: r.progress_percent || 0,
      completedLessons: r.completed_lessons || 0,
      totalLessons: r.total_lessons || 0,
      quizAttemptsCount: r.quiz_attempts_count || 0,
      avgQuizScore: r.avg_quiz_score ? Math.round(r.avg_quiz_score * 10) / 10 : null,
      assignmentSubmissionsCount: r.assignment_submissions_count || 0,
      enrolledAt: r.enrolled_at,
      completedAt: r.completed_at,
      lastActivity: lastActive,
      isInactive: daysSinceActive > 14
    };
  });

  return {
    students,
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Privacy-preserving drill-down for a single student inside a specific course.
 * Avoids exposing private notes, bookmarks, or unrelated course enrollments.
 */
export function getStudentCourseDetail(courseId, studentUserId, user) {
  const auth = canManageCourse(courseId, user);
  if (!auth.allowed) {
    throw { status: auth.status || 403, message: auth.error || 'Access denied' };
  }

  const student = queryOne('SELECT id, name, email, avatar_url, bio FROM users WHERE id = ?', [studentUserId]);
  if (!student) throw { status: 404, message: 'Student not found' };

  const enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [studentUserId, courseId]);
  if (!enrollment) throw { status: 404, message: 'Student is not enrolled in this course' };

  // Lessons progress in this course
  const lessons = queryAll(`
    SELECT l.id, l.title, l.lesson_type, l.order_index as lesson_order,
           m.id as module_id, m.title as module_title,
           lp.status as progress_status, lp.watched_progress_percent, lp.completed_at, lp.updated_at
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.enrollment_id = ?
    WHERE m.course_id = ?
    ORDER BY m.order_index ASC, l.order_index ASC
  `, [enrollment.id, courseId]).map(l => ({
    id: l.id,
    title: l.title,
    moduleTitle: l.module_title,
    lessonType: l.lesson_type,
    status: l.progress_status || 'NOT_STARTED',
    watchedPercent: l.watched_progress_percent || 0,
    completedAt: l.completed_at,
    updatedAt: l.updated_at
  }));

  // Quiz attempts for this course
  const quizAttempts = queryAll(`
    SELECT qa.*, q.title as quiz_title, m.title as module_title
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN modules m ON q.module_id = m.id
    WHERE m.course_id = ? AND qa.enrollment_id = ?
    ORDER BY qa.submitted_at DESC
  `, [courseId, enrollment.id]).map(a => ({
    id: a.id,
    quizTitle: a.quiz_title,
    moduleTitle: a.module_title,
    score: a.score,
    maxScore: a.max_score,
    percentage: a.percentage,
    isPassed: Boolean(a.is_passed),
    submittedAt: a.submitted_at
  }));

  // Assignment submissions for this course
  const assignmentSubmissions = queryAll(`
    SELECT asub.*, a.title as assignment_title, a.max_marks, m.title as module_title
    FROM assignment_submissions asub
    JOIN assignments a ON asub.assignment_id = a.id
    JOIN modules m ON a.module_id = m.id
    WHERE m.course_id = ? AND asub.enrollment_id = ?
    ORDER BY asub.submitted_at DESC
  `, [courseId, enrollment.id]).map(asg => ({
    id: asg.id,
    assignmentTitle: asg.assignment_title,
    moduleTitle: asg.module_title,
    status: asg.status,
    maxMarks: asg.max_marks,
    marksAwarded: asg.marks_awarded,
    feedback: asg.feedback,
    submittedAt: asg.submitted_at,
    reviewedAt: asg.reviewed_at
  }));

  // Coding submissions for this course
  const codingSubmissions = queryAll(`
    SELECT cs.*, ce.title as exercise_title, ce.difficulty
    FROM coding_submissions cs
    JOIN coding_exercises ce ON cs.exercise_id = ce.id
    WHERE ce.course_id = ? AND cs.user_id = ?
    ORDER BY cs.submitted_at DESC
    LIMIT 20
  `, [courseId, studentUserId]).map(cs => ({
    id: cs.id,
    exerciseTitle: cs.exercise_title,
    difficulty: cs.difficulty,
    language: cs.language,
    status: cs.status,
    passedTests: cs.passed_tests,
    totalTests: cs.total_tests,
    runtimeMs: cs.runtime_ms,
    submittedAt: cs.submitted_at
  }));

  return {
    student,
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      progressPercent: enrollment.progress_percent || 0,
      enrolledAt: enrollment.enrolled_at,
      completedAt: enrollment.completed_at
    },
    lessons,
    quizAttempts,
    assignmentSubmissions,
    codingSubmissions
  };
}

/**
 * Generates CSV report with sanitized fields preventing formula injection.
 */
export function generateAnalyticsCsv(courseId, reportType, user, filters = {}) {
  const auth = canManageCourse(courseId, user);
  if (!auth.allowed) {
    throw { status: auth.status || 403, message: auth.error || 'Access denied' };
  }

  const course = queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) throw { status: 404, message: 'Course not found' };

  const timestamp = new Date().toISOString();
  let csvContent = '';

  // Metadata block
  csvContent += `# Codificators E-Learning — Analytics Report\n`;
  csvContent += `# Report Type: ${reportType.toUpperCase()}\n`;
  csvContent += `# Course: ${course.title} (ID: ${course.id})\n`;
  csvContent += `# Generated: ${timestamp}\n`;
  csvContent += `# Generated By: ${user.name || user.email} (Role: ${user.role})\n`;
  csvContent += `# Notice: Export sanitized against spreadsheet formula injection\n\n`;

  if (reportType === 'students') {
    // Student progression roster
    const { students } = getCourseStudentsAnalytics(courseId, user, { ...filters, limit: 1000 });
    const headers = [
      'Student Name',
      'Email',
      'Enrollment Status',
      'Progress Percent',
      'Completed Lessons',
      'Total Lessons',
      'Quiz Attempts',
      'Avg Quiz Score',
      'Assignments Submitted',
      'Enrolled At',
      'Last Activity'
    ];
    csvContent += headers.map(sanitizeCsvField).join(',') + '\n';

    students.forEach(s => {
      const row = [
        s.name,
        s.email,
        s.status,
        `${s.progressPercent}%`,
        s.completedLessons,
        s.totalLessons,
        s.quizAttemptsCount,
        s.avgQuizScore !== null ? `${s.avgQuizScore}%` : 'N/A',
        s.assignmentSubmissionsCount,
        s.enrolledAt,
        s.lastActivity
      ];
      csvContent += row.map(sanitizeCsvField).join(',') + '\n';
    });
  } else if (reportType === 'curriculum-funnel') {
    // Drop-off funnel report
    const funnelData = getCourseFunnelAnalytics(courseId, user, filters);
    const headers = [
      'Sequence',
      'Module Title',
      'Lesson Title',
      'Lesson Type',
      'Students Started',
      'Students Completed',
      'Completion Rate',
      'Retention Rate',
      'Drop-off Count',
      'Drop-off Percent'
    ];
    csvContent += headers.map(sanitizeCsvField).join(',') + '\n';

    funnelData.lessonProgression.forEach(lp => {
      const row = [
        lp.sequence,
        lp.moduleTitle,
        lp.title,
        lp.lessonType,
        lp.startedCount,
        lp.completedCount,
        `${lp.completionRate}%`,
        `${lp.retentionRate}%`,
        lp.dropoffCount,
        `${lp.dropoffPercent}%`
      ];
      csvContent += row.map(sanitizeCsvField).join(',') + '\n';
    });
  } else if (reportType === 'assessments') {
    // Quiz & question outcomes report
    const assessmentData = getCourseAssessmentAnalytics(courseId, user, filters);
    const headers = [
      'Quiz Title',
      'Module',
      'Question Prompt',
      'Question Type',
      'Total Answers',
      'Correct Answers',
      'Correctness Rate',
      'Concept To Review',
      'Frequently Missed Flag'
    ];
    csvContent += headers.map(sanitizeCsvField).join(',') + '\n';

    assessmentData.quizzes.forEach(q => {
      q.questions.forEach(quest => {
        const row = [
          q.title,
          q.moduleTitle,
          quest.prompt,
          quest.questionType,
          quest.totalAnswers,
          quest.correctAnswers,
          `${quest.correctnessRate}%`,
          quest.conceptToReview || 'N/A',
          quest.isFrequentlyMissed ? 'YES' : 'NO'
        ];
        csvContent += row.map(sanitizeCsvField).join(',') + '\n';
      });
    });
  } else {
    throw { status: 400, message: 'Invalid reportType. Allowed: students, curriculum-funnel, assessments' };
  }

  return csvContent;
}
