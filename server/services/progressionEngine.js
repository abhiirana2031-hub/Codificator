import { queryAll, queryOne, runQuery, transaction } from '../db/db.js';
import crypto from 'node:crypto';

/**
 * Ensures enrollment records and module_progress entries exist for a user in a course.
 */
export function ensureEnrollment(userId, courseId) {
  return transaction(() => {
    let enrollment = queryOne(
      'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );

    if (!enrollment) {
      const enrollId = `enr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      runQuery(
        `INSERT INTO enrollments (id, user_id, course_id, status, progress_percent)
         VALUES (?, ?, ?, 'ACTIVE', 0.0)`,
        [enrollId, userId, courseId]
      );
      enrollment = queryOne('SELECT * FROM enrollments WHERE id = ?', [enrollId]);
    }

    // Get all published modules for the course ordered by order_index
    const modules = queryAll(
      'SELECT * FROM modules WHERE course_id = ? AND is_published = 1 ORDER BY order_index ASC',
      [courseId]
    );

    // Ensure module_progress exists for each module
    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      const existingMp = queryOne(
        'SELECT * FROM module_progress WHERE enrollment_id = ? AND module_id = ?',
        [enrollment.id, m.id]
      );

      if (!existingMp) {
        // Module 1 (first module or module without prerequisite) is unlocked by default
        const isFirst = (i === 0 && !m.prerequisite_module_id);
        const mpId = `mp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        runQuery(
          `INSERT INTO module_progress (id, enrollment_id, module_id, user_id, is_completed, is_unlocked)
           VALUES (?, ?, ?, ?, 0, ?)`,
          [mpId, enrollment.id, m.id, userId, isFirst ? 1 : 0]
        );
      }
    }

    return enrollment;
  });
}

/**
 * Checks if a specific module is unlocked for an enrollment.
 */
export function isModuleUnlocked(enrollmentId, moduleId) {
  const mp = queryOne(
    'SELECT is_unlocked FROM module_progress WHERE enrollment_id = ? AND module_id = ?',
    [enrollmentId, moduleId]
  );
  return mp ? Boolean(mp.is_unlocked) : false;
}

/**
 * Gets a friendly explanation of why a module is locked.
 */
export function getModuleLockReason(moduleId) {
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [moduleId]);
  if (!mod) return 'Module not found.';

  if (mod.prerequisite_module_id) {
    const prereq = queryOne('SELECT title, completion_policy FROM modules WHERE id = ?', [mod.prerequisite_module_id]);
    if (prereq) {
      let requirementText = 'complete all required lessons';
      if (prereq.completion_policy === 'POLICY_B_QUIZ') {
        requirementText = 'complete all lessons and pass the required assessment';
      } else if (prereq.completion_policy === 'POLICY_C_ASSIGNMENT') {
        requirementText = 'complete all lessons, pass the quiz, and receive instructor approval on the assignment';
      } else if (prereq.completion_policy === 'POLICY_D_SCORE') {
        requirementText = 'complete all lessons and achieve the minimum assessment score';
      }
      return `Complete "${prereq.title}" and ${requirementText} to unlock this module.`;
    }
  }

  return 'Complete previous prerequisite modules to unlock this module.';
}

/**
 * Recalculates progress, completion status, and sequential unlocking for an enrollment.
 */
export function evaluateEnrollmentProgression(enrollmentId) {
  return transaction(() => {
    const enrollment = queryOne('SELECT * FROM enrollments WHERE id = ?', [enrollmentId]);
    if (!enrollment) throw new Error('Enrollment not found');

    const courseId = enrollment.course_id;
    const userId = enrollment.user_id;

    const modules = queryAll(
      'SELECT * FROM modules WHERE course_id = ? AND is_published = 1 ORDER BY order_index ASC',
      [courseId]
    );

    // Track module completion mapping
    const moduleCompletionMap = new Map();

    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];

      // 1. Check lessons completion for this module
      const mandatoryLessons = queryAll(
        'SELECT id FROM lessons WHERE module_id = ? AND is_mandatory = 1',
        [mod.id]
      );

      let lessonsSatisfied = true;
      if (mandatoryLessons.length > 0) {
        const completedLessons = queryAll(
          `SELECT lesson_id FROM lesson_progress
           WHERE enrollment_id = ? AND status = 'COMPLETED'
           AND lesson_id IN (${mandatoryLessons.map(() => '?').join(',')})`,
          [enrollmentId, ...mandatoryLessons.map(l => l.id)]
        );
        lessonsSatisfied = (completedLessons.length >= mandatoryLessons.length);
      }

      // 2. Check quiz completion if policy requires it
      let quizSatisfied = true;
      const quiz = queryOne('SELECT * FROM quizzes WHERE module_id = ? AND is_required = 1', [mod.id]);
      if (quiz && (mod.completion_policy === 'POLICY_B_QUIZ' || mod.completion_policy === 'POLICY_C_ASSIGNMENT' || mod.completion_policy === 'POLICY_D_SCORE')) {
        const minPassScore = Math.max(75.0, quiz.passing_percentage || 75.0);
        const passingAttempt = queryOne(
          `SELECT id FROM quiz_attempts
           WHERE enrollment_id = ? AND quiz_id = ? AND is_passed = 1 AND percentage >= ?`,
          [enrollmentId, quiz.id, minPassScore]
        );
        quizSatisfied = Boolean(passingAttempt);
      }

      // 3. Check assignment completion if policy requires it
      let assignmentSatisfied = true;
      const assignment = queryOne('SELECT * FROM assignments WHERE module_id = ? AND is_required = 1', [mod.id]);
      if (assignment && mod.completion_policy === 'POLICY_C_ASSIGNMENT') {
        const approvedSubmission = queryOne(
          `SELECT id FROM assignment_submissions
           WHERE enrollment_id = ? AND assignment_id = ? AND status = 'APPROVED'`,
          [enrollmentId, assignment.id]
        );
        assignmentSatisfied = Boolean(approvedSubmission);
      }

      // Module is complete if all required policy conditions are satisfied
      const isCompleted = lessonsSatisfied && quizSatisfied && assignmentSatisfied;
      moduleCompletionMap.set(mod.id, isCompleted);

      // Update module_progress record for this module
      runQuery(
        `UPDATE module_progress
         SET is_completed = ?, completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END, updated_at = CURRENT_TIMESTAMP
         WHERE enrollment_id = ? AND module_id = ?`,
        [isCompleted ? 1 : 0, isCompleted ? 1 : 0, enrollmentId, mod.id]
      );
    }

    // Now evaluate unlocking of all modules sequentially
    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      let unlock = false;

      if (i === 0 && !mod.prerequisite_module_id) {
        // Module 1 is always unlocked
        unlock = true;
      } else if (mod.prerequisite_module_id) {
        // Unlocked if prerequisite module is completed
        unlock = Boolean(moduleCompletionMap.get(mod.prerequisite_module_id));
      } else if (i > 0) {
        // If no explicit prerequisite_module_id, default to immediate previous module completed
        const prevMod = modules[i - 1];
        unlock = Boolean(moduleCompletionMap.get(prevMod.id));
      }

      runQuery(
        `UPDATE module_progress
         SET is_unlocked = ?, updated_at = CURRENT_TIMESTAMP
         WHERE enrollment_id = ? AND module_id = ?`,
        [unlock ? 1 : 0, enrollmentId, mod.id]
      );
    }

    // Calculate overall course progress percentage
    // Based on completed required lessons / total required lessons
    const totalRequiredLessons = queryOne(
      `SELECT COUNT(*) as count FROM lessons l
       JOIN modules m ON l.module_id = m.id
       WHERE m.course_id = ? AND m.is_published = 1 AND l.is_mandatory = 1`,
      [courseId]
    ).count;

    const completedRequiredLessons = queryOne(
      `SELECT COUNT(DISTINCT lp.lesson_id) as count FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       JOIN modules m ON l.module_id = m.id
       WHERE lp.enrollment_id = ? AND lp.status = 'COMPLETED'
       AND m.course_id = ? AND m.is_published = 1 AND l.is_mandatory = 1`,
      [enrollmentId, courseId]
    ).count;

    const progressPercent = totalRequiredLessons > 0
      ? Math.round((completedRequiredLessons / totalRequiredLessons) * 1000) / 10
      : 100.0;

    // Check if entire course is completed
    const allModulesCompleted = modules.every(m => moduleCompletionMap.get(m.id) === true);

    // Strictly enforce 75% passing score on required quizzes for course completion
    const requiredQuizzes = queryAll(
      `SELECT q.id, q.passing_percentage FROM quizzes q
       JOIN modules m ON q.module_id = m.id
       WHERE m.course_id = ? AND q.is_required = 1`,
      [courseId]
    );
    const quizzesPassed = requiredQuizzes.every(q => {
      const minPass = Math.max(75.0, q.passing_percentage || 75.0);
      const attempt = queryOne(
        `SELECT id FROM quiz_attempts
         WHERE enrollment_id = ? AND quiz_id = ? AND is_passed = 1 AND percentage >= ?`,
        [enrollmentId, q.id, minPass]
      );
      return Boolean(attempt);
    });

    const courseCompleted = allModulesCompleted && quizzesPassed && (progressPercent >= 100.0);

    runQuery(
      `UPDATE enrollments
       SET progress_percent = ?,
           status = CASE WHEN ? = 1 THEN 'COMPLETED' ELSE status END,
           completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = ?`,
      [progressPercent, courseCompleted ? 1 : 0, courseCompleted ? 1 : 0, enrollmentId]
    );

    // Auto-issue certificate if course completed and certificate not already issued
    if (courseCompleted) {
      issueCertificateIfEligible(enrollmentId);
    }

    return {
      enrollmentId,
      courseId,
      userId,
      progressPercent,
      isCourseCompleted: courseCompleted,
      moduleCompletionMap: Object.fromEntries(moduleCompletionMap)
    };
  });
}

/**
 * Issues a verified completion certificate if all requirements are satisfied.
 */
export function issueCertificateIfEligible(enrollmentId) {
  return transaction(() => {
    const existing = queryOne('SELECT * FROM certificates WHERE enrollment_id = ?', [enrollmentId]);
    if (existing) return existing;

    const enrollment = queryOne('SELECT * FROM enrollments WHERE id = ?', [enrollmentId]);
    if (!enrollment) return null;

    // Verify course is completed
    const modules = queryAll(
      'SELECT id FROM modules WHERE course_id = ? AND is_published = 1',
      [enrollment.course_id]
    );
    const completedModules = queryAll(
      `SELECT module_id FROM module_progress
       WHERE enrollment_id = ? AND is_completed = 1`,
      [enrollmentId]
    );

    if (completedModules.length < modules.length) {
      return null; // Not all modules completed
    }

    // Strictly enforce 75% passing percentage on all required quizzes before issuing certificate
    const courseQuizzes = queryAll(
      `SELECT q.id, q.title, q.passing_percentage FROM quizzes q
       JOIN modules m ON q.module_id = m.id
       WHERE m.course_id = ? AND q.is_required = 1`,
      [enrollment.course_id]
    );

    for (const q of courseQuizzes) {
      const minPassPercent = Math.max(75.0, q.passing_percentage || 75.0);
      const passedAttempt = queryOne(
        `SELECT id, percentage, is_passed FROM quiz_attempts
         WHERE enrollment_id = ? AND quiz_id = ? AND is_passed = 1 AND percentage >= ?`,
        [enrollmentId, q.id, minPassPercent]
      );
      if (!passedAttempt) {
        return null; // Certification quiz not passed by at least 75%
      }
    }

    const certId = `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Generate a deterministically unique, cryptographically strong certificate code.
    // Format: CFWD-YYYY-XXXXXXXX where XXXXXXXX is a hash of userId + courseId + timestamp.
    const now = Date.now();
    const hashInput = `${enrollment.user_id}:${enrollment.course_id}:${now}`;
    const hashSuffix = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 8).toUpperCase();
    const certificateCode = `CFWD-${new Date().getFullYear()}-${hashSuffix}`;

    runQuery(
      `INSERT INTO certificates (
        id, certificate_code, user_id, course_id, enrollment_id,
        issue_date, completion_date, template_version, verification_url
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'v1', ?)`,
      [certId, certificateCode, enrollment.user_id, enrollment.course_id, enrollmentId, `/verify/${certificateCode}`]
    );

    return queryOne('SELECT * FROM certificates WHERE id = ?', [certId]);
  });
}

/**
 * Updates video playback position and marks lesson complete if threshold is reached.
 */
export function updateVideoPlayback(enrollmentId, lessonId, userId, positionSeconds, durationSeconds) {
  return transaction(() => {
    const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    if (!lesson) throw new Error('Lesson not found');

    const duration = durationSeconds > 0 ? durationSeconds : (lesson.duration_minutes * 60);
    const watchedPercent = duration > 0 ? Math.min(100, (positionSeconds / duration) * 100) : 0;
    const threshold = lesson.video_threshold_percent || 90;

    let progress = queryOne(
      'SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?',
      [enrollmentId, lessonId]
    );

    // Anti-fraud check: Do not treat a single seek to the end as sufficient evidence of full viewing
    const priorPercent = progress ? (progress.watched_progress_percent || 0) : 0;
    const isInstantSeek = (!progress || priorPercent < (threshold / 2)) && (watchedPercent >= threshold) && (duration > 60);
    const isCompleted = (watchedPercent >= threshold && !isInstantSeek) || (progress && progress.status === 'COMPLETED');

    if (!progress) {
      const lpId = `lp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      runQuery(
        `INSERT INTO lesson_progress (
          id, enrollment_id, lesson_id, user_id, status,
          last_playback_position, video_duration, watched_progress_percent,
          completed_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          lpId,
          enrollmentId,
          lessonId,
          userId,
          isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
          positionSeconds,
          duration,
          watchedPercent,
          isCompleted ? new Date().toISOString() : null
        ]
      );
    } else {
      // Don't downgrade status if already completed
      const newStatus = progress.status === 'COMPLETED' || isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
      const completedAt = progress.completed_at || (isCompleted ? new Date().toISOString() : null);
      // Keep highest watched position/percentage
      const maxWatched = Math.max(progress.watched_progress_percent || 0, watchedPercent);

      runQuery(
        `UPDATE lesson_progress
         SET last_playback_position = ?,
             video_duration = ?,
             watched_progress_percent = ?,
             status = ?,
             completed_at = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [positionSeconds, duration, maxWatched, newStatus, completedAt, progress.id]
      );
    }

    // Trigger re-evaluation of progression
    evaluateEnrollmentProgression(enrollmentId);

    return queryOne(
      'SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?',
      [enrollmentId, lessonId]
    );
  });
}

/**
 * Records student reading progress without prematurely auto-completing the lesson.
 * (Scrolling or reading is treated as an estimate; completion requires explicit action or quiz).
 */
export function recordReadingProgress(enrollmentId, lessonId, userId, readingPercent) {
  return transaction(() => {
    const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    if (!lesson) throw new Error('Lesson not found');

    const percent = Math.max(0, Math.min(100, Math.round(Number(readingPercent) || 0)));

    let progress = queryOne(
      'SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?',
      [enrollmentId, lessonId]
    );

    if (!progress) {
      const lpId = `lp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      runQuery(
        `INSERT INTO lesson_progress (
          id, enrollment_id, lesson_id, user_id, status,
          watched_progress_percent, updated_at
        ) VALUES (?, ?, ?, ?, 'IN_PROGRESS', ?, CURRENT_TIMESTAMP)`,
        [lpId, enrollmentId, lessonId, userId, percent]
      );
    } else {
      const maxPercent = Math.max(progress.watched_progress_percent || 0, percent);
      runQuery(
        `UPDATE lesson_progress
         SET watched_progress_percent = ?,
             status = CASE WHEN status = 'COMPLETED' THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [maxPercent, progress.id]
      );
    }

    return queryOne(
      'SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?',
      [enrollmentId, lessonId]
    );
  });
}

/**
 * Marks a text lesson as completed upon explicit student action or requirement satisfaction.
 */
export function completeLesson(enrollmentId, lessonId, userId) {
  return transaction(() => {
    let progress = queryOne(
      'SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?',
      [enrollmentId, lessonId]
    );

    if (!progress) {
      const lpId = `lp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      runQuery(
        `INSERT INTO lesson_progress (
          id, enrollment_id, lesson_id, user_id, status,
          watched_progress_percent, completed_at, updated_at
        ) VALUES (?, ?, ?, ?, 'COMPLETED', 100.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [lpId, enrollmentId, lessonId, userId]
      );
    } else {
      runQuery(
        `UPDATE lesson_progress
         SET status = 'COMPLETED',
             watched_progress_percent = 100.0,
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [progress.id]
      );
    }

    // Trigger re-evaluation of progression
    const result = evaluateEnrollmentProgression(enrollmentId);
    return result;
  });
}
