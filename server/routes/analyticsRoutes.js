import express from 'express';
import { queryAll, queryOne } from '../db/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  getInstructorAnalyticsOverview,
  getCourseFunnelAnalytics,
  getCourseAssessmentAnalytics,
  getCourseStudentsAnalytics,
  getStudentCourseDetail,
  generateAnalyticsCsv
} from '../services/analyticsService.js';

const router = express.Router();

// System-wide overview analytics for Admins & Operators
router.get('/overview', requireAuth, requireRole('ADMIN', 'OPERATOR'), (req, res) => {
  const totalCourses = queryOne('SELECT COUNT(*) as count FROM courses').count;
  const publishedCourses = queryOne('SELECT COUNT(*) as count FROM courses WHERE is_published = 1').count;
  const totalStudents = queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'STUDENT'").count;
  const totalEnrollments = queryOne('SELECT COUNT(*) as count FROM enrollments').count;

  // Completed courses
  const completedEnrollments = queryOne("SELECT COUNT(*) as count FROM enrollments WHERE status = 'COMPLETED'").count;
  const courseCompletionRate = totalEnrollments > 0
    ? Math.round((completedEnrollments / totalEnrollments) * 1000) / 10
    : 0;

  // Active learners (had activity in the last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const activeLearners = queryOne(
    `SELECT COUNT(DISTINCT user_id) as count FROM lesson_progress WHERE updated_at >= ?`,
    [sevenDaysAgo]
  ).count;

  // Inactive learners (> 14 days without activity)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const inactiveLearners = queryOne(
    `SELECT COUNT(DISTINCT e.user_id) as count FROM enrollments e
     WHERE e.id NOT IN (SELECT DISTINCT enrollment_id FROM lesson_progress WHERE updated_at >= ?)`,
    [fourteenDaysAgo]
  ).count;

  // Students falling behind (enrolled > 3 days ago but progress < 20%)
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  const fallingBehind = queryOne(
    `SELECT COUNT(*) as count FROM enrollments WHERE enrolled_at <= ? AND progress_percent < 20`,
    [threeDaysAgo]
  ).count;

  // Average quiz score
  const avgQuiz = queryOne('SELECT AVG(percentage) as avg_score FROM quiz_attempts').avg_score;
  const avgQuizScore = avgQuiz ? Math.round(avgQuiz * 10) / 10 : 0;

  // Assignment submissions stats
  const totalSubmissions = queryOne('SELECT COUNT(*) as count FROM assignment_submissions').count;
  const approvedSubmissions = queryOne("SELECT COUNT(*) as count FROM assignment_submissions WHERE status = 'APPROVED'").count;
  const pendingSubmissions = queryOne("SELECT COUNT(*) as count FROM assignment_submissions WHERE status = 'SUBMITTED'").count;

  // Total certificates issued
  const certificatesIssued = queryOne('SELECT COUNT(*) as count FROM certificates').count;

  // Course-by-course breakdown
  const courseBreakdown = queryAll(
    `SELECT c.id, c.title, c.category, c.is_published,
            (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
            (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'COMPLETED') as completed_count,
            (SELECT AVG(progress_percent) FROM enrollments WHERE course_id = c.id) as avg_progress
     FROM courses c
     ORDER BY enrolled_count DESC`
  ).map(c => ({
    ...c,
    is_published: Boolean(c.is_published),
    avg_progress: c.avg_progress ? Math.round(c.avg_progress * 10) / 10 : 0,
    completion_rate: c.enrolled_count > 0 ? Math.round((c.completed_count / c.enrolled_count) * 1000) / 10 : 0
  }));

  // Progress Distribution buckets
  const progressBuckets = {
    '0-25%': queryOne('SELECT COUNT(*) as count FROM enrollments WHERE progress_percent BETWEEN 0 AND 25').count,
    '26-50%': queryOne('SELECT COUNT(*) as count FROM enrollments WHERE progress_percent > 25 AND progress_percent <= 50').count,
    '51-75%': queryOne('SELECT COUNT(*) as count FROM enrollments WHERE progress_percent > 50 AND progress_percent <= 75').count,
    '76-100%': queryOne('SELECT COUNT(*) as count FROM enrollments WHERE progress_percent > 75').count
  };

  return res.json({
    metrics: {
      totalCourses,
      publishedCourses,
      totalStudents,
      totalEnrollments,
      completedEnrollments,
      courseCompletionRate,
      activeLearners,
      inactiveLearners,
      fallingBehind,
      avgQuizScore,
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      certificatesIssued
    },
    progressBuckets,
    courseBreakdown
  });
});

// Course-specific analytics
router.get('/course/:courseId', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { courseId } = req.params;
  const course = queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const modules = queryAll(
    'SELECT id, title, order_index FROM modules WHERE course_id = ? ORDER BY order_index ASC',
    [courseId]
  );

  const totalEnrolled = queryOne('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?', [courseId]).count;

  const moduleStats = modules.map(m => {
    const completedCount = queryOne(
      'SELECT COUNT(*) as count FROM module_progress WHERE module_id = ? AND is_completed = 1',
      [m.id]
    ).count;
    const unlockedCount = queryOne(
      'SELECT COUNT(*) as count FROM module_progress WHERE module_id = ? AND is_unlocked = 1',
      [m.id]
    ).count;

    return {
      id: m.id,
      title: m.title,
      order_index: m.order_index,
      completedCount,
      unlockedCount,
      completionRate: totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0
    };
  });

  return res.json({
    course: { id: course.id, title: course.title },
    totalEnrolled,
    moduleStats
  });
});

// Student's personal verified learning analytics
router.get('/student/me', requireAuth, (req, res) => {
  const userId = req.user.id;

  const lessonsCompleted = queryOne(
    `SELECT COUNT(DISTINCT lesson_id) as count FROM lesson_progress WHERE user_id = ? AND status = 'COMPLETED'`,
    [userId]
  ).count;

  const modulesCompleted = queryOne(
    `SELECT COUNT(*) as count FROM module_progress WHERE user_id = ? AND is_completed = 1`,
    [userId]
  ).count;

  const coursesEnrolled = queryOne(
    `SELECT COUNT(*) as count FROM enrollments WHERE user_id = ?`,
    [userId]
  ).count;

  const coursesCompleted = queryOne(
    `SELECT COUNT(*) as count FROM enrollments WHERE user_id = ? AND status = 'COMPLETED'`,
    [userId]
  ).count;

  const quizStats = queryOne(
    `SELECT COUNT(*) as attempts_count,
            COUNT(CASE WHEN is_passed = 1 THEN 1 END) as passed_count,
            AVG(percentage) as avg_score
     FROM quiz_attempts
     WHERE user_id = ?`,
    [userId]
  );

  const certificatesEarned = queryOne(
    `SELECT COUNT(*) as count FROM certificates WHERE user_id = ?`,
    [userId]
  ).count;

  // Recent verified learning activity
  const recentActivity = queryAll(
    `SELECT 'LESSON_COMPLETED' as activity_type, l.title as activity_title, lp.completed_at as timestamp, c.title as course_title
     FROM lesson_progress lp
     JOIN lessons l ON lp.lesson_id = l.id
     JOIN modules m ON l.module_id = m.id
     JOIN courses c ON m.course_id = c.id
     WHERE lp.user_id = ? AND lp.status = 'COMPLETED'
     UNION ALL
     SELECT 'QUIZ_ATTEMPT' as activity_type, q.title as activity_title, qa.submitted_at as timestamp, c.title as course_title
     FROM quiz_attempts qa
     JOIN quizzes q ON qa.quiz_id = q.id
     JOIN modules m ON q.module_id = m.id
     JOIN courses c ON m.course_id = c.id
     WHERE qa.user_id = ?
     UNION ALL
     SELECT 'CERTIFICATE_ISSUED' as activity_type, c.title as activity_title, cert.issue_date as timestamp, c.title as course_title
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     WHERE cert.user_id = ?
     ORDER BY timestamp DESC LIMIT 10`,
    [userId, userId, userId]
  );

  return res.json({
    metrics: {
      lessonsCompleted,
      modulesCompleted,
      coursesEnrolled,
      coursesCompleted,
      certificatesEarned,
      quizAttempts: quizStats.attempts_count || 0,
      quizzesPassed: quizStats.passed_count || 0,
      avgQuizScore: quizStats.avg_score ? Math.round(quizStats.avg_score * 10) / 10 : 0
    },
    recentActivity
  });
});

// ============================================================================
// PHASE 10: INSTRUCTOR & ADMIN LEARNING ANALYTICS ENDPOINTS
// ============================================================================

// 1. Instructor KPI overview with configurable time windows & course comparison
router.get('/instructor/overview', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  try {
    const data = getInstructorAnalyticsOverview(req.user, req.query);
    return res.json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Failed to fetch analytics overview' });
  }
});

// 2. Progression funnel & module/lesson drop-off breakdown
router.get('/instructor/courses/:courseId/funnel', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  try {
    const data = getCourseFunnelAnalytics(req.params.courseId, req.user, req.query);
    return res.json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Failed to fetch progression funnel' });
  }
});

// 3. Assessment outcomes, score distributions, and question difficulty
router.get('/instructor/courses/:courseId/assessments', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  try {
    const data = getCourseAssessmentAnalytics(req.params.courseId, req.user, req.query);
    return res.json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Failed to fetch assessment analytics' });
  }
});

// 4. Paginated student progress roster with search and filters
router.get('/instructor/courses/:courseId/students', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  try {
    const data = getCourseStudentsAnalytics(req.params.courseId, req.user, req.query);
    return res.json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Failed to fetch student analytics' });
  }
});

// 5. Privacy-preserving individual student drill-down within a specific course
router.get('/instructor/courses/:courseId/students/:studentUserId', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  try {
    const data = getStudentCourseDetail(req.params.courseId, req.params.studentUserId, req.user);
    return res.json(data);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Failed to fetch student course detail' });
  }
});

// 6. CSV exports with formula injection protection
router.get('/instructor/courses/:courseId/export/:reportType', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  try {
    const { courseId, reportType } = req.params;
    const csvContent = generateAnalyticsCsv(courseId, reportType, req.user, req.query);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-${courseId}-${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Failed to generate CSV export' });
  }
});

export default router;
