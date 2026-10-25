import express from 'express';
import { queryAll, queryOne, runQuery, transaction } from '../db/db.js';
import { requireAuth, requireRole, logAudit } from '../middleware/auth.js';
import { evaluateEnrollmentProgression } from '../services/progressionEngine.js';
import { createNotification } from '../services/notificationService.js';

const router = express.Router();

// Get assignment details & student's current submission
router.get('/:assignmentId', requireAuth, (req, res) => {
  const { assignmentId } = req.params;
  const assignment = queryOne('SELECT * FROM assignments WHERE id = ?', [assignmentId]);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  let submission = null;
  if (req.user.role === 'STUDENT') {
    submission = queryOne(
      'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND user_id = ? ORDER BY submitted_at DESC LIMIT 1',
      [assignmentId, req.user.id]
    );
  }

  return res.json({
    assignment: {
      ...assignment,
      is_required: Boolean(assignment.is_required)
    },
    submission
  });
});

// Student submits an assignment
router.post('/:assignmentId/submit', requireAuth, (req, res) => {
  const { assignmentId } = req.params;
  const { contentText, fileUrl } = req.body;
  const userId = req.user.id;

  if (!contentText && !fileUrl) {
    return res.status(400).json({ error: 'Please provide either a text response, code repository link, or uploaded file URL.' });
  }

  const assignment = queryOne('SELECT * FROM assignments WHERE id = ?', [assignmentId]);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [assignment.module_id]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  const enrollment = queryOne('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, mod.course_id]);
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });

  // Check if existing submission exists
  const existing = queryOne(
    'SELECT * FROM assignment_submissions WHERE assignment_id = ? AND user_id = ?',
    [assignmentId, userId]
  );

  let submissionId;
  transaction(() => {
    if (existing) {
      submissionId = existing.id;
      runQuery(
        `UPDATE assignment_submissions
         SET content_text = ?,
             file_url = ?,
             status = 'SUBMITTED',
             submitted_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [contentText || null, fileUrl || null, existing.id]
      );
    } else {
      submissionId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      runQuery(
        `INSERT INTO assignment_submissions (
          id, assignment_id, user_id, enrollment_id, content_text, file_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
        [submissionId, assignmentId, userId, enrollment.id, contentText || null, fileUrl || null]
      );
    }

    logAudit(userId, 'ASSIGNMENT_SUBMITTED', 'ASSIGNMENT', assignmentId);
  });

  const updated = queryOne('SELECT * FROM assignment_submissions WHERE id = ?', [submissionId]);
  return res.json({
    success: true,
    message: 'Assignment submitted successfully. Awaiting instructor review.',
    submission: updated
  });
});

// List all submissions for an assignment (Instructors / Operators / Admins)
router.get('/:assignmentId/submissions', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { assignmentId } = req.params;
  const submissions = queryAll(
    `SELECT s.*, u.name as student_name, u.email as student_email, u.avatar_url as student_avatar
     FROM assignment_submissions s
     JOIN users u ON s.user_id = u.id
     WHERE s.assignment_id = ?
     ORDER BY s.submitted_at DESC`,
    [assignmentId]
  );

  return res.json({ submissions });
});

// Instructor reviews and grades a submission
router.patch('/submissions/:submissionId/grade', requireAuth, requireRole('ADMIN', 'OPERATOR', 'INSTRUCTOR'), (req, res) => {
  const { submissionId } = req.params;
  const { status, marksAwarded, feedback } = req.body;

  if (!status || !['APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'UNDER_REVIEW'].includes(status)) {
    return res.status(400).json({ error: 'Valid grading status is required (APPROVED, REJECTED, RESUBMISSION_REQUIRED, UNDER_REVIEW)' });
  }

  const submission = queryOne('SELECT * FROM assignment_submissions WHERE id = ?', [submissionId]);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  transaction(() => {
    runQuery(
      `UPDATE assignment_submissions
       SET status = ?,
           marks_awarded = ?,
           feedback = ?,
           reviewed_at = CURRENT_TIMESTAMP,
           reviewer_id = ?
       WHERE id = ?`,
      [status, marksAwarded !== undefined ? Number(marksAwarded) : null, feedback || '', req.user.id, submissionId]
    );

    logAudit(req.user.id, 'ASSIGNMENT_GRADED', 'ASSIGNMENT_SUBMISSION', submissionId, { status, marksAwarded });

    // CRITICAL: If approved, re-evaluate sequential progression for this student's enrollment!
    evaluateEnrollmentProgression(submission.enrollment_id);

    // Notify student about graded assignment
    createNotification({
      userId: submission.user_id,
      title: `Assignment ${status === 'APPROVED' ? 'Approved' : 'Reviewed'}`,
      message: `Your assignment submission was graded as ${status}${marksAwarded !== undefined ? ` (${marksAwarded} marks)` : ''}.`,
      type: 'ASSIGNMENT',
      linkUrl: '#student-classroom'
    });
  });

  const updated = queryOne('SELECT * FROM assignment_submissions WHERE id = ?', [submissionId]);
  return res.json({
    success: true,
    message: `Submission marked as ${status}`,
    submission: updated
  });
});

export default router;
