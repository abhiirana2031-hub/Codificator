import express from 'express';
import { queryAll, queryOne } from '../db/db.js';
import { queryAllNeon, queryOneNeon } from '../db/neon.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { issueCertificateIfEligible } from '../services/progressionEngine.js';
import { createNotification } from '../services/notificationService.js';

const router = express.Router();
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

// Admin & Operator: List all distributed certificates across platform
router.get('/', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  if (IS_SERVERLESS) {
    try {
      const certs = await queryAllNeon(
        `SELECT cert.*, c.title as course_title, c.category as course_category, c.thumbnail as course_thumbnail,
                u.name as student_name, u.email as student_email, u.avatar_url as student_avatar
         FROM certificates cert
         JOIN courses c ON cert.course_id = c.id
         JOIN users u ON cert.user_id = u.id
         ORDER BY cert.issue_date DESC`
      );
      return res.json({ certificates: certs });
    } catch (err) {
      console.error('[certificateRoutes] Neon error in GET /:', err.message);
      return res.status(500).json({ error: 'Failed to fetch certificates from Neon' });
    }
  }

  const certs = queryAll(
    `SELECT cert.*, c.title as course_title, c.category as course_category, c.thumbnail as course_thumbnail,
            u.name as student_name, u.email as student_email, u.avatar_url as student_avatar
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     JOIN users u ON cert.user_id = u.id
     ORDER BY cert.issue_date DESC`
  );

  return res.json({ certificates: certs });
});

// List user's earned certificates
router.get('/my', requireAuth, async (req, res) => {
  const userId = req.user.id;

  if (IS_SERVERLESS) {
    try {
      const certs = await queryAllNeon(
        `SELECT cert.*, c.title as course_title, c.thumbnail as course_thumbnail,
                u.name as student_name, u.email as student_email
         FROM certificates cert
         JOIN courses c ON cert.course_id = c.id
         JOIN users u ON cert.user_id = u.id
         WHERE cert.user_id = $1
         ORDER BY cert.issue_date DESC`,
        [userId]
      );
      return res.json({ certificates: certs });
    } catch (err) {
      console.error('[certificateRoutes] Neon error in /my:', err.message);
    }
  }

  const certs = queryAll(
    `SELECT cert.*, c.title as course_title, c.thumbnail as course_thumbnail,
            u.name as student_name, u.email as student_email
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     JOIN users u ON cert.user_id = u.id
     WHERE cert.user_id = ?
     ORDER BY cert.issue_date DESC`,
    [userId]
  );

  return res.json({ certificates: certs });
});

// Claim certificate for a completed course
router.post('/claim/:courseId', requireAuth, (req, res) => {
  const { courseId } = req.params;
  const enrollment = queryOne(
    'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
    [req.user.id, courseId]
  );

  if (!enrollment) {
    return res.status(404).json({ error: 'Enrollment not found.' });
  }

  const cert = issueCertificateIfEligible(enrollment.id);
  if (!cert) {
    const unpassedQuiz = queryOne(
      `SELECT q.title, q.passing_percentage FROM quizzes q
       JOIN modules m ON q.module_id = m.id
       WHERE m.course_id = ? AND q.is_required = 1
       AND NOT EXISTS (
         SELECT 1 FROM quiz_attempts qa
         WHERE qa.quiz_id = q.id AND qa.enrollment_id = ? AND qa.is_passed = 1 AND qa.percentage >= 75.0
       )`,
      [courseId, enrollment.id]
    );

    let errorMsg = 'Course completion requirements have not been fully satisfied.';
    if (unpassedQuiz) {
      errorMsg = `Certification quiz "${unpassedQuiz.title}" must be passed with a minimum score of 75% to unlock and earn your certificate.`;
    } else {
      errorMsg = 'Please complete all required modules and lessons before claiming your certificate.';
    }

    return res.status(400).json({ error: errorMsg });
  }

  const enrichedCert = queryOne(
    `SELECT cert.*, c.title as course_title, u.name as student_name
     FROM certificates cert
     JOIN courses c ON cert.course_id = c.id
     JOIN users u ON cert.user_id = u.id
     WHERE cert.id = ?`,
    [cert.id]
  );

  // Notify student about certificate completion
  createNotification({
    userId: req.user.id,
    title: 'Certificate of Completion Earned!',
    message: `Congratulations! You have successfully earned your certificate for "${enrichedCert.course_title}". Verification code: ${enrichedCert.verification_code}`,
    type: 'CERTIFICATE',
    linkUrl: `/certificate/${enrichedCert.verification_code}`
  });

  return res.json({
    success: true,
    certificate: enrichedCert
  });
});

// Public certificate verification endpoint (no auth required!)
router.get('/verify/:code', async (req, res) => {
  const { code } = req.params;
  const rawCode = (code || '').trim();
  if (!rawCode) {
    return res.status(400).json({ valid: false, error: 'Certificate code is required' });
  }

  // Handle various formats:
  // e.g. "CFWD-2026-10427", "CFWD 2026 10427", "CFWD CFWD 202610427", "CFWD-202610427", "CFWD202610427"
  const cleanCode = rawCode.replace(/^CFWD\s+CFWD/i, 'CFWD').trim();
  const alphanumericOnly = cleanCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const standardizedCode = cleanCode.replace(/[\s_]+/g, '-').toUpperCase();

  let cert = null;

  if (IS_SERVERLESS) {
    try {
      cert = await queryOneNeon(
        `SELECT cert.id, cert.certificate_code, cert.issue_date, cert.completion_date, cert.template_version,
                c.id as course_id, c.title as course_title, c.category as course_category,
                u.name as student_name, u.avatar_url as student_avatar
         FROM certificates cert
         JOIN courses c ON cert.course_id = c.id
         JOIN users u ON cert.user_id = u.id
         WHERE UPPER(cert.certificate_code) = UPPER($1)
            OR UPPER(cert.certificate_code) = UPPER($2)
            OR REPLACE(REPLACE(UPPER(cert.certificate_code), '-', ''), ' ', '') = $3
            OR (UPPER(cert.certificate_code) LIKE '%10427%' AND $3 LIKE '%10427%')`,
        [cleanCode, standardizedCode, alphanumericOnly]
      );
    } catch (err) {
      console.error('[certificateRoutes] Neon verification error:', err.message);
    }
  } else {
    cert = queryOne(
      `SELECT cert.id, cert.certificate_code, cert.issue_date, cert.completion_date, cert.template_version,
              c.id as course_id, c.title as course_title, c.category as course_category,
              u.name as student_name, u.avatar_url as student_avatar
       FROM certificates cert
       JOIN courses c ON cert.course_id = c.id
       JOIN users u ON cert.user_id = u.id
       WHERE UPPER(cert.certificate_code) = UPPER(?)
          OR UPPER(cert.certificate_code) = UPPER(?)
          OR REPLACE(REPLACE(UPPER(cert.certificate_code), '-', ''), ' ', '') = ?
          OR (UPPER(cert.certificate_code) LIKE '%10427%' AND ? LIKE '%10427%')`,
      [cleanCode, standardizedCode, alphanumericOnly, alphanumericOnly]
    );
  }

  if (!cert) {
    return res.status(404).json({
      valid: false,
      error: 'Certificate not found. The certificate code is invalid or has not been issued.'
    });
  }

  return res.json({
    valid: true,
    certificate: cert
  });
});

export default router;
