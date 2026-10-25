import express from 'express';
import { queryAll, queryOne, runQuery } from '../db/db.js';
import { queryOneNeon, queryAllNeon } from '../db/neon.js';
import { parseAuthUser, requireAuth } from '../middleware/auth.js';
import {
  ensureEnrollment,
  isModuleUnlocked,
  getModuleLockReason,
  evaluateEnrollmentProgression,
  updateVideoPlayback,
  recordReadingProgress,
  completeLesson
} from '../services/progressionEngine.js';
import { hasCourseEntitlement, getAvailablePlans } from '../services/billingService.js';
import { formatLessonMarkdown } from '../services/pdfCourseScanner.js';

const router = express.Router();

// Get student curriculum with locked/unlocked states and progress
router.get('/:courseId/curriculum', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (IS_SERVERLESS) {
    try {
      const course = await queryOneNeon('SELECT * FROM courses WHERE id = $1 OR slug = $2', [courseId, courseId]);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const modules = await queryAllNeon(
        'SELECT * FROM modules WHERE course_id = $1 ORDER BY order_index ASC',
        [course.id]
      );

      const lessons = await queryAllNeon(
        'SELECT * FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = $1) ORDER BY order_index ASC',
        [course.id]
      );

      return res.json({
        course,
        enrollment: { id: `enr-${userId}-${course.id}`, user_id: userId, course_id: course.id, progress_percent: 0, status: 'ACTIVE' },
        curriculum: modules.map((m, idx) => ({
          ...m,
          is_unlocked: idx === 0,
          lessons: lessons.filter(l => l.module_id === m.id)
        })),
        resumeLesson: lessons[0] || null
      });
    } catch (err) {
      console.error('[curriculum Neon error]', err);
    }
  }

  const course = queryOne('SELECT * FROM courses WHERE id = ? OR slug = ?', [courseId, courseId]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR' || course.instructor_id === userId;
  if (!course.is_published && !isPrivileged) {
    return res.status(403).json({ error: 'Cannot access curriculum of an unpublished course.' });
  }

  // Paywall & Entitlement Gate
  const isFree = (course.price === 0 || course.price === null || !course.price) && (course.tier === 'FREE' || !course.tier);
  if (!isFree && !isPrivileged && !hasCourseEntitlement(userId, course.id)) {
    return res.status(402).json({
      error: 'Payment required to access curriculum.',
      requires_payment: true,
      course: {
        id: course.id,
        title: course.title,
        price: course.price,
        tier: course.tier || 'PRO'
      },
      available_plans: getAvailablePlans()
    });
  }

  // Ensure enrollment exists
  const enrollment = ensureEnrollment(userId, course.id);

  // Re-evaluate progression to ensure real-time accuracy
  evaluateEnrollmentProgression(enrollment.id);

  // Fetch updated enrollment
  const freshEnrollment = queryOne('SELECT * FROM enrollments WHERE id = ?', [enrollment.id]);

  // Fetch modules
  const modules = queryAll(
    'SELECT * FROM modules WHERE course_id = ? AND is_published = 1 ORDER BY order_index ASC',
    [course.id]
  );

  let resumeLesson = null;

  const curriculum = modules.map(m => {
    const mp = queryOne(
      'SELECT is_completed, is_unlocked FROM module_progress WHERE enrollment_id = ? AND module_id = ?',
      [enrollment.id, m.id]
    ) || { is_completed: 0, is_unlocked: 0 };

    const isUnlocked = isPrivileged || Boolean(mp.is_unlocked);
    const isCompleted = Boolean(mp.is_completed);
    const lockReason = isUnlocked ? null : getModuleLockReason(m.id);

    // Fetch lessons
    const lessons = queryAll(
      'SELECT id, module_id, title, description, lesson_type, duration_minutes, order_index, is_mandatory, is_preview, video_threshold_percent FROM lessons WHERE module_id = ? ORDER BY order_index ASC',
      [m.id]
    ).map(l => {
      const lp = queryOne(
        'SELECT status, last_playback_position, video_duration, watched_progress_percent FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?',
        [enrollment.id, l.id]
      ) || { status: 'NOT_STARTED', last_playback_position: 0, video_duration: 0, watched_progress_percent: 0 };

      const lessonStatus = (!isUnlocked && !isPrivileged) ? 'LOCKED' : lp.status;

      // Track candidate for Resume Learning
      if (isUnlocked && lessonStatus !== 'COMPLETED' && !resumeLesson) {
        resumeLesson = {
          lessonId: l.id,
          moduleId: m.id,
          title: l.title,
          lessonType: l.lesson_type,
          lastPlaybackPosition: lp.last_playback_position
        };
      }

      return {
        ...l,
        is_mandatory: Boolean(l.is_mandatory),
        is_preview: Boolean(l.is_preview),
        status: lessonStatus,
        last_playback_position: lp.last_playback_position,
        video_duration: lp.video_duration,
        watched_progress_percent: lp.watched_progress_percent
      };
    });

    const totalRequired = lessons.filter(l => l.is_mandatory).length;
    const completedRequired = lessons.filter(l => l.is_mandatory && l.status === 'COMPLETED').length;
    const moduleProgressPercent = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;

    // Check Quiz
    const quiz = queryOne('SELECT id, title, passing_percentage, is_required FROM quizzes WHERE module_id = ?', [m.id]);
    let quizInfo = null;
    if (quiz) {
      const attempt = queryOne(
        `SELECT score, max_score, percentage, is_passed
         FROM quiz_attempts
         WHERE enrollment_id = ? AND quiz_id = ?
         ORDER BY percentage DESC LIMIT 1`,
        [enrollment.id, quiz.id]
      );
      quizInfo = {
        id: quiz.id,
        title: quiz.title,
        passing_percentage: quiz.passing_percentage,
        is_required: Boolean(quiz.is_required),
        is_passed: attempt ? Boolean(attempt.is_passed) : false,
        best_score: attempt ? attempt.score : null,
        best_percentage: attempt ? attempt.percentage : null
      };
    }

    // Check Assignment
    const assignment = queryOne('SELECT id, title, max_marks, is_required FROM assignments WHERE module_id = ?', [m.id]);
    let assignmentInfo = null;
    if (assignment) {
      const submission = queryOne(
        `SELECT id, status, marks_awarded, feedback, submitted_at
         FROM assignment_submissions
         WHERE enrollment_id = ? AND assignment_id = ?
         ORDER BY submitted_at DESC LIMIT 1`,
        [enrollment.id, assignment.id]
      );
      assignmentInfo = {
        id: assignment.id,
        title: assignment.title,
        max_marks: assignment.max_marks,
        is_required: Boolean(assignment.is_required),
        submission_status: submission ? submission.status : 'NOT_SUBMITTED',
        marks_awarded: submission ? submission.marks_awarded : null,
        feedback: submission ? submission.feedback : null
      };
    }

    return {
      id: m.id,
      title: m.title,
      description: m.description,
      order_index: m.order_index,
      estimated_duration: m.estimated_duration,
      completion_policy: m.completion_policy,
      min_passing_score: m.min_passing_score,
      is_unlocked: isUnlocked,
      is_completed: isCompleted,
      lock_reason: lockReason,
      completed_lessons_count: completedRequired,
      total_required_lessons_count: totalRequired,
      progress_percent: moduleProgressPercent,
      lessons,
      quiz: quizInfo,
      assignment: assignmentInfo
    };
  });

  // If all completed or none selected, resume default to first lesson
  if (!resumeLesson && curriculum.length > 0 && curriculum[0].lessons.length > 0) {
    const firstLesson = curriculum[0].lessons[0];
    resumeLesson = {
      lessonId: firstLesson.id,
      moduleId: curriculum[0].id,
      title: firstLesson.title,
      lessonType: firstLesson.lesson_type,
      lastPlaybackPosition: firstLesson.last_playback_position
    };
  }

  // Check if certificate exists
  const certificate = queryOne(
    'SELECT * FROM certificates WHERE enrollment_id = ?',
    [enrollment.id]
  );

  return res.json({
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail: course.thumbnail,
      progress_percent: freshEnrollment.progress_percent,
      status: freshEnrollment.status,
      completed_at: freshEnrollment.completed_at
    },
    enrollment: freshEnrollment,
    curriculum,
    resume_lesson: resumeLesson,
    certificate
  });
});

// Get lesson details (Public for free previews, gated for paid lessons)
router.get('/:courseId/lessons/:lessonId', (req, res) => {
  const { courseId, lessonId } = req.params;
  const user = parseAuthUser(req);
  const userId = user?.id;

  const course = queryOne('SELECT * FROM courses WHERE id = ? OR slug = ?', [courseId, courseId]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  // Verify lesson belongs to this course
  const mod = queryOne('SELECT * FROM modules WHERE id = ? AND course_id = ?', [lesson.module_id, course.id]);
  if (!mod) return res.status(404).json({ error: 'Lesson does not belong to specified course' });

  // Check if user is Admin or Operator or assigned Instructor
  const isPrivileged = user && (user.role === 'ADMIN' || user.role === 'OPERATOR' || course.instructor_id === userId);
  const isFreePreview = Boolean(lesson.is_preview);

  if (!isPrivileged) {
    if (!course.is_published) {
      return res.status(403).json({ error: 'Cannot access lessons of an unpublished course.' });
    }

    // If NOT a free preview, enforce strict paywall & enrollment gates
    if (!isFreePreview) {
      if (!user) {
        return res.status(401).json({ error: 'Authentication required to view this lesson.' });
      }

      // Paywall & Entitlement Gate
      const isFree = (course.price === 0 || course.price === null || !course.price) && (course.tier === 'FREE' || !course.tier);
      if (!isFree && !hasCourseEntitlement(userId, course.id)) {
        return res.status(402).json({
          error: 'Payment required to view this lesson.',
          requires_payment: true,
          course: {
            id: course.id,
            title: course.title,
            price: course.price,
            tier: course.tier || 'PRO'
          }
        });
      }

      const enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, course.id]);
      if (!enrollment) {
        return res.status(403).json({ error: 'You must be enrolled to view this lesson.' });
      }

      // CHECK MODULE LOCK STATUS
      const unlocked = isModuleUnlocked(enrollment.id, mod.id);
      if (!unlocked) {
        const lockReason = getModuleLockReason(mod.id);
        return res.status(403).json({
          error: 'This lesson is locked.',
          is_locked: true,
          lock_reason: lockReason,
          module_title: mod.title
        });
      }
    }
  }

  // Fetch student's progress on this lesson if enrolled
  let progress = null;
  if (userId) {
    const enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, course.id]);
    if (enrollment) {
      progress = queryOne(
        'SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?',
        [enrollment.id, lesson.id]
      );
    }
  }

  // Fetch downloadable resources
  const resources = queryAll('SELECT * FROM lesson_resources WHERE lesson_id = ?', [lesson.id]);

  // Fetch module sibling lessons for Prev/Next navigation
  const siblingLessons = queryAll(
    'SELECT id, title, order_index FROM lessons WHERE module_id = ? ORDER BY order_index ASC',
    [mod.id]
  );
  const currentIndex = siblingLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < siblingLessons.length - 1 ? siblingLessons[currentIndex + 1] : null;

  // Fetch module quiz and assignment if present
  const quiz = queryOne('SELECT id, title, description, passing_percentage, time_limit_minutes FROM quizzes WHERE module_id = ?', [mod.id]);
  const assignment = queryOne('SELECT id, title, instructions, max_marks, due_date FROM assignments WHERE module_id = ?', [mod.id]);

  return res.json({
    lesson: {
      ...lesson,
      content_markdown: lesson.content_markdown || lesson.text_content,
      text_content: lesson.content_markdown || formatLessonMarkdown(lesson.text_content),
      is_mandatory: Boolean(lesson.is_mandatory),
      is_preview: Boolean(lesson.is_preview),
      resources,
      progress: progress || {
        status: 'NOT_STARTED',
        last_playback_position: 0,
        watched_progress_percent: 0
      },
      prev_lesson: prevLesson,
      next_lesson: nextLesson,
      module: {
        id: mod.id,
        title: mod.title,
        order_index: mod.order_index
      },
      quiz,
      assignment
    }
  });
});

// Update video playback progress
router.post('/:courseId/lessons/:lessonId/video-progress', requireAuth, (req, res) => {
  const { courseId, lessonId } = req.params;
  const { positionSeconds, durationSeconds } = req.body;
  const userId = req.user.id;

  const course = queryOne('SELECT * FROM courses WHERE id = ? OR slug = ?', [courseId, courseId]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, course.id]);
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in course' });

  const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR' || course.instructor_id === userId;

  // Verify module is unlocked (privileged roles can bypass)
  const unlocked = isPrivileged || isModuleUnlocked(enrollment.id, lesson.module_id);
  if (!unlocked) {
    return res.status(403).json({ error: 'Cannot update progress on locked module' });
  }

  const updatedProgress = updateVideoPlayback(
    enrollment.id,
    lessonId,
    userId,
    Number(positionSeconds) || 0,
    Number(durationSeconds) || 0
  );

  return res.json({
    success: true,
    progress: updatedProgress
  });
});

// Update text reading progress (scroll/reading percentage without prematurely marking complete)
router.post('/:courseId/lessons/:lessonId/reading-progress', requireAuth, (req, res) => {
  const { courseId, lessonId } = req.params;
  const { readingPercent } = req.body;
  const userId = req.user.id;

  const course = queryOne('SELECT * FROM courses WHERE id = ? OR slug = ?', [courseId, courseId]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR' || course.instructor_id === userId;
  if (!course.is_published && !isPrivileged) {
    return res.status(403).json({ error: 'Cannot update progress on an unpublished course.' });
  }

  const enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, course.id]);
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in course' });

  const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  // Verify module is unlocked (privileged roles can bypass)
  const unlocked = isPrivileged || isModuleUnlocked(enrollment.id, lesson.module_id);
  if (!unlocked) {
    return res.status(403).json({ error: 'Cannot update progress on locked module' });
  }

  const updatedProgress = recordReadingProgress(
    enrollment.id,
    lessonId,
    userId,
    Number(readingPercent) || 0
  );

  return res.json({
    success: true,
    progress: updatedProgress
  });
});

// Complete Lesson manually (e.g. for text, notes, user action)
router.post('/:courseId/lessons/:lessonId/complete', requireAuth, (req, res) => {
  const { courseId, lessonId } = req.params;
  const userId = req.user.id;

  const course = queryOne('SELECT * FROM courses WHERE id = ? OR slug = ?', [courseId, courseId]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR' || course.instructor_id === userId;
  if (!course.is_published && !isPrivileged) {
    return res.status(403).json({ error: 'Cannot complete lessons of an unpublished course.' });
  }

  const enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, course.id]);
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in course' });

  const lesson = queryOne('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  // Security check: Module must be unlocked (privileged roles can bypass)
  const unlocked = isPrivileged || isModuleUnlocked(enrollment.id, lesson.module_id);
  if (!unlocked) {
    return res.status(403).json({ error: 'Cannot complete lesson in a locked module' });
  }

  const result = completeLesson(enrollment.id, lessonId, userId);

  return res.json({
    success: true,
    message: 'Lesson marked as completed',
    progression: result
  });
});

export default router;
