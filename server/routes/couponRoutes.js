import express from 'express';
import { 
  validateCoupon, 
  recordCouponRedemption, 
  listAdminCoupons, 
  createCoupon, 
  updateCoupon, 
  deleteCoupon, 
  getCouponRedemptions 
} from '../services/couponService.js';
import { requireAuth, requireRole, logAudit } from '../middleware/auth.js';
import { ensureEnrollment } from '../services/progressionEngine.js';
import { runQuery, queryOne, transaction } from '../db/db.js';
import { queryAllNeon, queryOneNeon, runNeonQuery } from '../db/neon.js';
import { createNotification } from '../services/notificationService.js';

const router = express.Router();

/**
 * Public/Student: Validate a coupon for a course
 * Endpoint: POST /api/coupons/validate
 * Body: { code, courseId }
 */
router.post('/validate', requireAuth, (req, res) => {
  try {
    const { code, courseId } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const result = validateCoupon({
      code,
      courseId,
      user: req.user
    });

    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      valid: true,
      coupon: result.coupon,
      originalPrice: result.originalPrice,
      discountAmount: result.discountAmount,
      finalPrice: result.finalPrice,
      isFree: result.isFree
    });
  } catch (err) {
    console.error('Coupon validation error:', err);
    return res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

/**
 * Public/Student: Apply a 100% discount / Free coupon (Scenario D)
 * Atomically grants enrollment without invoking payment gateways.
 * Endpoint: POST /api/coupons/apply-free
 * Body: { code, courseId }
 */
router.post('/apply-free', requireAuth, (req, res) => {
  try {
    const { code, courseId } = req.body;
    if (!code || !courseId) {
      return res.status(400).json({ error: 'Coupon code and courseId are required' });
    }

    const validation = validateCoupon({
      code,
      courseId,
      user: req.user
    });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!validation.isFree) {
      return res.status(400).json({ 
        error: 'This coupon provides a partial discount, not free access. Please complete checkout through payment.' 
      });
    }

    // Atomic enrollment and redemption
    const result = transaction((db) => {
      // 1. Ensure user is enrolled
      const enrollment = ensureEnrollment(req.user.id, courseId);

      // 2. Create order record at ₹0
      const orderId = `ord-free-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      runQuery(
        `INSERT INTO orders (id, user_id, order_type, course_id, amount, currency, status, payment_method, transaction_ref, coupon_id, discount_amount, original_amount)
         VALUES (?, ?, 'COURSE_PURCHASE', ?, 0, 'INR', 'COMPLETED', 'COUPON_100_PERCENT', ?, ?, ?, ?)`,
        [orderId, req.user.id, courseId, `FREE_ENTITLEMENT_${validation.coupon.code}`, validation.coupon.id, validation.discountAmount, validation.originalPrice]
      );

      // 3. Record redemption
      recordCouponRedemption({
        couponId: validation.coupon.id,
        userId: req.user.id,
        courseId,
        orderId,
        originalPrice: validation.originalPrice,
        discountAmount: validation.discountAmount,
        finalPrice: 0
      });

      // 4. Log audit event
      logAudit(req.user.id, 'COUPON_FREE_COURSE_ENROLLED', 'course', courseId, {
        couponCode: validation.coupon.code,
        orderId
      });

      // 5. Notify student
      createNotification(
        req.user.id,
        'Course Unlocked via Coupon',
        `You have successfully unlocked access using coupon code ${validation.coupon.code}. Start learning now!`,
        'COURSE',
        `#student-classroom`
      );

      return { success: true, orderId, enrollmentId: enrollment.id };
    });

    return res.json({
      success: true,
      message: 'Course unlocked and enrolled successfully with 100% discount!',
      ...result
    });
  } catch (err) {
    console.error('Apply free coupon error:', err);
    return res.status(500).json({ error: err.message || 'Failed to apply coupon' });
  }
});

/**
 * Admin & Operator: List all coupons
 * Endpoint: GET /api/admin/coupons
 */
router.get('/admin/coupons', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (IS_SERVERLESS) {
    try {
      const coupons = await queryAllNeon(`
        SELECT c.*, 
          (SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id) as redemption_count,
          (SELECT COALESCE(SUM(discount_amount), 0) FROM coupon_redemptions r WHERE r.coupon_id = c.id) as total_discount_given,
          co.title as eligible_course_title
        FROM coupons c
        LEFT JOIN courses co ON c.eligible_course_id = co.id
        ORDER BY c.created_at DESC
      `);
      return res.json({
        coupons: coupons.map(c => ({
          ...c,
          is_active: Boolean(c.is_active),
          is_single_use: Boolean(c.is_single_use),
          redemption_count: Number(c.redemption_count || 0),
          total_discount_given: Number(c.total_discount_given || 0)
        }))
      });
    } catch (err) {
      console.error('List coupons error (Neon):', err);
      return res.status(500).json({ error: 'Failed to fetch coupons' });
    }
  }

  try {
    const coupons = listAdminCoupons();
    return res.json({ coupons });
  } catch (err) {
    console.error('List coupons error:', err);
    return res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

/**
 * Admin & Operator: Create coupon
 * Endpoint: POST /api/admin/coupons
 */
router.post('/admin/coupons', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const data = req.body;
  const code = (data.code || '').trim().toUpperCase();
  if (!code || code.length < 3) {
    return res.status(400).json({ error: 'Coupon code must be at least 3 characters' });
  }

  if (IS_SERVERLESS) {
    try {
      const existing = await queryOneNeon('SELECT id FROM coupons WHERE UPPER(code) = UPPER($1)', [code]);
      if (existing) {
        return res.status(400).json({ error: `Coupon with code "${code}" already exists` });
      }

      const id = `cpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const discountType = data.discount_type || 'PERCENTAGE';
      const discountValue = Number(data.discount_value) || 0;

      await runNeonQuery(
        `INSERT INTO coupons (
          id, code, description, discount_type, discount_value, max_discount,
          min_purchase_amount, eligible_course_id, eligible_email, eligible_phone,
          start_date, expiry_date, max_redemptions, max_redemptions_per_user,
          is_active, is_single_use, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          id,
          code,
          data.description || null,
          discountType,
          discountValue,
          data.max_discount ? Number(data.max_discount) : null,
          data.min_purchase_amount ? Number(data.min_purchase_amount) : 0,
          data.eligible_course_id || null,
          data.eligible_email ? data.eligible_email.trim().toLowerCase() : null,
          data.eligible_phone ? data.eligible_phone.trim() : null,
          data.start_date || new Date().toISOString(),
          data.expiry_date || null,
          data.max_redemptions ? Number(data.max_redemptions) : 100,
          data.max_redemptions_per_user ? Number(data.max_redemptions_per_user) : 1,
          data.is_active !== undefined ? Boolean(data.is_active) : true,
          Boolean(data.is_single_use),
          req.user.id
        ]
      );

      const newCoupon = await queryOneNeon('SELECT * FROM coupons WHERE id = $1', [id]);
      return res.status(201).json({ coupon: newCoupon });
    } catch (neonErr) {
      console.error('Neon create coupon error:', neonErr);
      return res.status(400).json({ error: neonErr.message || 'Failed to create coupon' });
    }
  }

  try {
    const newCoupon = createCoupon(req.body, req.user.id);
    logAudit(req.user.id, 'COUPON_CREATED', 'coupon', newCoupon.id, { code: newCoupon.code });
    return res.status(201).json({ coupon: newCoupon });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to create coupon' });
  }
});

/**
 * Admin & Operator: Update coupon
 * Endpoint: PATCH /api/admin/coupons/:id
 */
router.patch('/admin/coupons/:id', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const couponId = req.params.id;
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (IS_SERVERLESS) {
    try {
      const updates = req.body;
      if (updates.is_active !== undefined) {
        await runNeonQuery('UPDATE coupons SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [Boolean(updates.is_active), couponId]);
      }
      const updated = await queryOneNeon('SELECT * FROM coupons WHERE id = $1', [couponId]);
      return res.json({ coupon: updated });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Failed to update coupon' });
    }
  }

  try {
    const updated = updateCoupon(req.params.id, req.body);
    logAudit(req.user.id, 'COUPON_UPDATED', 'coupon', req.params.id, req.body);
    return res.json({ coupon: updated });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to update coupon' });
  }
});

/**
 * Admin & Operator: Delete coupon
 * Endpoint: DELETE /api/admin/coupons/:id
 */
router.delete('/admin/coupons/:id', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const couponId = req.params.id;
  try {
    await runNeonQuery('DELETE FROM coupon_redemptions WHERE coupon_id = $1', [couponId]);
    await runNeonQuery('DELETE FROM coupons WHERE id = $1', [couponId]);
  } catch (e) { /* ignore */ }

  if (!Boolean(process.env.VERCEL || process.env.VERCEL_ENV)) {
    try {
      deleteCoupon(couponId);
      logAudit(req.user.id, 'COUPON_DELETED', 'coupon', couponId);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Failed to delete coupon' });
    }
  }

  return res.json({ success: true });
});

/**
 * Admin & Operator: Bulk delete coupons
 * Endpoint: POST /api/admin/coupons/bulk-delete
 */
router.post('/admin/coupons/bulk-delete', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const { couponIds } = req.body;
  if (!Array.isArray(couponIds) || couponIds.length === 0) {
    return res.status(400).json({ error: 'couponIds array is required.' });
  }

  for (const cId of couponIds) {
    try {
      await runNeonQuery('DELETE FROM coupon_redemptions WHERE coupon_id = $1', [cId]);
      await runNeonQuery('DELETE FROM coupons WHERE id = $1', [cId]);
    } catch (e) { /* ignore */ }

    if (!Boolean(process.env.VERCEL || process.env.VERCEL_ENV)) {
      try {
        deleteCoupon(cId);
        logAudit(req.user.id, 'COUPON_BULK_DELETED', 'coupon', cId);
      } catch (e) { /* ignore */ }
    }
  }

  return res.json({ success: true, count: couponIds.length });
});

/**
 * Admin: View coupon redemptions
 * Endpoint: GET /api/admin/coupons/:id/redemptions
 */
router.get('/admin/coupons/:id/redemptions', requireAuth, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (IS_SERVERLESS) {
    try {
      const redemptions = await queryAllNeon(`
        SELECT r.*, u.email as user_email, u.name as user_name, c.title as course_title
        FROM coupon_redemptions r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN courses c ON r.course_id = c.id
        WHERE r.coupon_id = $1
        ORDER BY r.redeemed_at DESC
      `, [req.params.id]);
      return res.json({ redemptions });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to fetch coupon redemptions' });
    }
  }

  try {
    const redemptions = getCouponRedemptions(req.params.id);
    return res.json({ redemptions });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch coupon redemptions' });
  }
});

export default router;
