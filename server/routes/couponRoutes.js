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
 * Admin: List all coupons
 * Endpoint: GET /api/admin/coupons
 */
router.get('/admin/coupons', requireAuth, requireRole('ADMIN', 'OPERATOR'), (req, res) => {
  try {
    const coupons = listAdminCoupons();
    return res.json({ coupons });
  } catch (err) {
    console.error('List coupons error:', err);
    return res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

/**
 * Admin: Create coupon
 * Endpoint: POST /api/admin/coupons
 */
router.post('/admin/coupons', requireAuth, requireRole('ADMIN'), (req, res) => {
  try {
    const newCoupon = createCoupon(req.body, req.user.id);
    logAudit(req.user.id, 'COUPON_CREATED', 'coupon', newCoupon.id, { code: newCoupon.code });
    return res.status(201).json({ coupon: newCoupon });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to create coupon' });
  }
});

/**
 * Admin: Update coupon
 * Endpoint: PATCH /api/admin/coupons/:id
 */
router.patch('/admin/coupons/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  try {
    const updated = updateCoupon(req.params.id, req.body);
    logAudit(req.user.id, 'COUPON_UPDATED', 'coupon', req.params.id, req.body);
    return res.json({ coupon: updated });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to update coupon' });
  }
});

/**
 * Admin: Delete coupon
 * Endpoint: DELETE /api/admin/coupons/:id
 */
router.delete('/admin/coupons/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  try {
    deleteCoupon(req.params.id);
    logAudit(req.user.id, 'COUPON_DELETED', 'coupon', req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to delete coupon' });
  }
});

/**
 * Admin: Bulk delete coupons
 * Endpoint: POST /api/coupons/admin/bulk-delete
 */
router.post('/admin/coupons/bulk-delete', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { couponIds } = req.body;
  if (!Array.isArray(couponIds) || couponIds.length === 0) {
    return res.status(400).json({ error: 'couponIds array is required.' });
  }

  let deletedCount = 0;
  for (const cId of couponIds) {
    try {
      deleteCoupon(cId);
      logAudit(req.user.id, 'COUPON_BULK_DELETED', 'coupon', cId);
      deletedCount++;
    } catch {}
  }
  return res.json({ success: true, deletedCount });
});

/**
 * Admin: View coupon redemptions
 * Endpoint: GET /api/admin/coupons/:id/redemptions
 */
router.get('/admin/coupons/:id/redemptions', requireAuth, requireRole('ADMIN'), (req, res) => {
  try {
    const redemptions = getCouponRedemptions(req.params.id);
    return res.json({ redemptions });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch coupon redemptions' });
  }
});

export default router;
