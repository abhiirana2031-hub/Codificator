import express from 'express';
import { queryAll, queryOne, runQuery } from '../db/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get instructor's assigned courses
router.get('/courses', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR';

  let sql = `
    SELECT DISTINCT c.*, u.name as instructor_name,
      (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count,
      (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as module_count,
      (SELECT COUNT(*) FROM assignment_submissions asub
       JOIN assignments a ON asub.assignment_id = a.id
       JOIN modules m ON a.module_id = m.id
       WHERE m.course_id = c.id AND asub.status = 'SUBMITTED') as pending_submissions_count
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_instructors ci ON c.id = ci.course_id
  `;

  const params = [];
  if (!isPrivileged) {
    sql += 'WHERE c.instructor_id = ? OR ci.instructor_id = ? ';
    params.push(req.user.id, req.user.id);
  }
  sql += 'ORDER BY c.created_at DESC';

  const courses = queryAll(sql, params).map(c => ({
    ...c,
    is_published: Boolean(c.is_published)
  }));

  return res.json({ courses });
});

// Enrolled student list with filtering & pagination
router.get('/courses/:courseId/students', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { courseId } = req.params;
  const {
    search,
    status,
    minProgress,
    maxProgress,
    inactiveDays,
    page = 1,
    limit = 20
  } = req.query;

  // Authorization check for Instructor
  if (req.user.role === 'INSTRUCTOR') {
    const course = queryOne('SELECT instructor_id FROM courses WHERE id = ?', [courseId]);
    const coInstructor = queryOne('SELECT * FROM course_instructors WHERE course_id = ? AND instructor_id = ?', [courseId, req.user.id]);
    if (course?.instructor_id !== req.user.id && !coInstructor) {
      return res.status(403).json({ error: 'You are only authorized to view students in your assigned courses.' });
    }
  }

  let sql = `
    SELECT e.id as enrollment_id, e.user_id, e.course_id, e.status as enrollment_status,
           e.progress_percent, e.enrolled_at, e.completed_at,
           u.name as student_name, u.email as student_email, u.avatar_url,
           (SELECT MAX(updated_at) FROM lesson_progress WHERE enrollment_id = e.id) as last_lesson_activity,
           (SELECT COUNT(*) FROM quiz_attempts WHERE enrollment_id = e.id) as total_quiz_attempts,
           (SELECT AVG(percentage) FROM quiz_attempts WHERE enrollment_id = e.id) as avg_quiz_score,
           (SELECT COUNT(*) FROM assignment_submissions WHERE enrollment_id = e.id) as total_submissions,
           (SELECT COUNT(*) FROM assignment_submissions WHERE enrollment_id = e.id AND status = 'APPROVED') as approved_submissions
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    WHERE e.course_id = ?
  `;
  const params = [courseId];

  if (search) {
    sql += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    sql += ` AND e.status = ?`;
    params.push(status);
  }

  if (minProgress !== undefined && minProgress !== '') {
    sql += ` AND e.progress_percent >= ?`;
    params.push(Number(minProgress));
  }

  if (maxProgress !== undefined && maxProgress !== '') {
    sql += ` AND e.progress_percent <= ?`;
    params.push(Number(maxProgress));
  }

  // Count total for pagination
  const totalCountQuery = `SELECT COUNT(*) as total FROM (${sql})`;
  const totalStudents = queryOne(totalCountQuery, params).total;

  // Pagination
  const offset = (Number(page) - 1) * Number(limit);
  sql += ` ORDER BY e.enrolled_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), offset);

  const students = queryAll(sql, params).map(s => {
    const lastActive = s.last_lesson_activity || s.enrolled_at;
    const daysSinceActive = Math.floor((Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...s,
      last_activity: lastActive,
      is_inactive: daysSinceActive > 14,
      avg_quiz_score: s.avg_quiz_score ? Math.round(s.avg_quiz_score * 10) / 10 : null
    };
  });

  return res.json({
    students,
    pagination: {
      total: totalStudents,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalStudents / Number(limit))
    }
  });
});

// Get student-level activity details
router.get('/students/:userId/activity', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { userId } = req.params;
  const { courseId } = req.query;

  const user = queryOne('SELECT id, name, email, avatar_url, bio FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const enrollments = queryAll(
    `SELECT e.*, c.title as course_title
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     WHERE e.user_id = ? ${courseId ? 'AND e.course_id = ?' : ''}`,
    courseId ? [userId, courseId] : [userId]
  );

  const lessonActivities = queryAll(
    `SELECT lp.*, l.title as lesson_title, m.title as module_title
     FROM lesson_progress lp
     JOIN lessons l ON lp.lesson_id = l.id
     JOIN modules m ON l.module_id = m.id
     WHERE lp.user_id = ?
     ORDER BY lp.updated_at DESC LIMIT 30`,
    [userId]
  );

  const quizAttempts = queryAll(
    `SELECT qa.*, q.title as quiz_title
     FROM quiz_attempts qa
     JOIN quizzes q ON qa.quiz_id = q.id
     WHERE qa.user_id = ?
     ORDER BY qa.submitted_at DESC`,
    [userId]
  ).map(a => ({ ...a, is_passed: Boolean(a.is_passed) }));

  const assignmentSubmissions = queryAll(
    `SELECT asub.*, a.title as assignment_title, a.max_marks
     FROM assignment_submissions asub
     JOIN assignments a ON asub.assignment_id = a.id
     WHERE asub.user_id = ?
     ORDER BY asub.submitted_at DESC`,
    [userId]
  );

  return res.json({
    student: user,
    enrollments,
    lesson_activities: lessonActivities,
    quiz_attempts: quizAttempts,
    assignment_submissions: assignmentSubmissions
  });
});

// Instructor Overview Dashboard Metrics
router.get('/overview', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR';

  let courseFilter = '';
  const filterParams = [];
  if (!isPrivileged) {
    courseFilter = 'WHERE (c.instructor_id = ? OR c.id IN (SELECT course_id FROM course_instructors WHERE instructor_id = ?))';
    filterParams.push(req.user.id, req.user.id);
  }

  // 1. Managed courses with metrics
  const courses = queryAll(`
    SELECT c.id, c.title, c.slug, c.status, c.is_published, c.level, c.category, c.created_at,
           (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count,
           (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND completed_at IS NOT NULL) as completion_count,
           (SELECT AVG(progress_percent) FROM enrollments WHERE course_id = c.id) as avg_progress,
           (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as module_count,
           (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as lesson_count,
           (SELECT COUNT(*) FROM assignment_submissions asub
            JOIN assignments a ON asub.assignment_id = a.id
            JOIN modules m ON a.module_id = m.id
            WHERE m.course_id = c.id AND asub.status IN ('SUBMITTED', 'UNDER_REVIEW')) as pending_reviews
    FROM courses c
    ${courseFilter}
    ORDER BY c.created_at DESC
  `, filterParams).map(c => ({
    ...c,
    is_published: Boolean(c.is_published),
    avg_progress: c.avg_progress ? Math.round(c.avg_progress * 10) / 10 : 0
  }));

  // Aggregated totals
  const totalCourses = courses.length;
  const publishedCourses = courses.filter(c => c.status === 'PUBLISHED' || c.is_published).length;
  const draftCourses = courses.filter(c => c.status === 'DRAFT' && !c.is_published).length;
  const archivedCourses = courses.filter(c => c.status === 'ARCHIVED').length;
  const totalEnrollments = courses.reduce((sum, c) => sum + (c.student_count || 0), 0);
  const totalCompletions = courses.reduce((sum, c) => sum + (c.completion_count || 0), 0);
  const totalPendingReviews = courses.reduce((sum, c) => sum + (c.pending_reviews || 0), 0);
  const overallAvgProgress = totalEnrollments > 0
    ? Math.round((courses.reduce((sum, c) => sum + ((c.avg_progress || 0) * (c.student_count || 0)), 0) / totalEnrollments) * 10) / 10
    : 0;

  // Recent student submissions for instructor's courses
  let submissionSql = `
    SELECT s.id, s.assignment_id, s.enrollment_id, s.user_id, s.status, s.marks_awarded,
           s.submitted_at, a.title as assignment_title, a.max_marks,
           m.title as module_title, c.title as course_title, c.id as course_id,
           u.name as student_name, u.email as student_email, u.avatar_url
    FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN modules m ON a.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    JOIN users u ON s.user_id = u.id
  `;
  const subParams = [];
  if (!isPrivileged) {
    submissionSql += ` WHERE (c.instructor_id = ? OR c.id IN (SELECT course_id FROM course_instructors WHERE instructor_id = ?))`;
    subParams.push(req.user.id, req.user.id);
  }
  submissionSql += ` ORDER BY s.submitted_at DESC LIMIT 10`;
  const recentSubmissions = queryAll(submissionSql, subParams);

  return res.json({
    metrics: {
      totalCourses,
      publishedCourses,
      draftCourses,
      archivedCourses,
      totalEnrollments,
      totalCompletions,
      totalPendingReviews,
      overallAvgProgress,
      completionRate: totalEnrollments > 0 ? Math.round((totalCompletions / totalEnrollments) * 1000) / 10 : 0
    },
    courses,
    recentSubmissions
  });
});

// Pending assignments queue across courses (scoped to instructor's courses)
router.get('/pending-submissions', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const isPrivileged = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR';
  let sql = `
    SELECT s.*, a.title as assignment_title, a.max_marks, m.title as module_title, c.title as course_title,
           u.name as student_name, u.email as student_email
    FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN modules m ON a.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    JOIN users u ON s.user_id = u.id
    WHERE s.status IN ('SUBMITTED', 'UNDER_REVIEW')
  `;
  const params = [];
  if (!isPrivileged) {
    sql += ` AND (c.instructor_id = ? OR c.id IN (SELECT course_id FROM course_instructors WHERE instructor_id = ?))`;
    params.push(req.user.id, req.user.id);
  }
  sql += ` ORDER BY s.submitted_at ASC`;
  const submissions = queryAll(sql, params);

  return res.json({ submissions });
});

// Bulk unenroll students from a course
router.post('/courses/:courseId/students/bulk-remove', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { courseId } = req.params;
  const { enrollmentIds } = req.body;
  if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
    return res.status(400).json({ error: 'enrollmentIds array required' });
  }

  // Permission check for INSTRUCTOR
  if (req.user.role === 'INSTRUCTOR') {
    const course = queryOne('SELECT instructor_id FROM courses WHERE id = ?', [courseId]);
    const coInstructor = queryOne('SELECT * FROM course_instructors WHERE course_id = ? AND instructor_id = ?', [courseId, req.user.id]);
    if (course?.instructor_id !== req.user.id && !coInstructor) {
      return res.status(403).json({ error: 'You are not authorized to manage students for this course' });
    }
  }

  try {
    for (const eid of enrollmentIds) {
      // Clean up progress
      runQuery('DELETE FROM lesson_progress WHERE enrollment_id = ?', [eid]);
      runQuery('DELETE FROM module_progress WHERE enrollment_id = ?', [eid]);
      runQuery('DELETE FROM quiz_attempts WHERE enrollment_id = ?', [eid]);
      runQuery('DELETE FROM assignment_submissions WHERE enrollment_id = ?', [eid]);
      runQuery('DELETE FROM certificates WHERE enrollment_id = ?', [eid]);
      runQuery('DELETE FROM enrollments WHERE id = ? AND course_id = ?', [eid, courseId]);
    }
    return res.json({ success: true, message: `Successfully removed ${enrollmentIds.length} student enrollment(s).` });
  } catch (err) {
    console.error('Failed to bulk remove enrollments:', err);
    return res.status(500).json({ error: 'Failed to remove student enrollments' });
  }
});

export default router;
