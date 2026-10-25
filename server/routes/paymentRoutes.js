import express from 'express';
import crypto from 'node:crypto';
import { createOrder, verifySignature } from '../services/razorpayService.js';
import { resolveAuthUser, requireAuth, requireRole, logAudit } from '../middleware/auth.js';
import { runQuery, queryOne, queryAll, transaction } from '../db/db.js';
import { queryOneNeon, runNeonQuery } from '../db/neon.js';
import { ensureEnrollment } from '../services/progressionEngine.js';
import { createNotification } from '../services/notificationService.js';
import { PLANS } from '../services/billingService.js';
import { validateCoupon, recordCouponRedemption } from '../services/couponService.js';

const router = express.Router();

/**
 * STEP 1: BACKEND - Create Order
 * Endpoint: POST /api/create-order (and POST /api/payment/create-order)
 * Authenticated users only. Enforces server-side course existence, publication status,
 * authoritative price validation, duplicate enrollment prevention, and records a PENDING order.
 */
router.post('/create-order', async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req);
    if (!authUser) {
      return res.status(401).json({
        error: 'Authentication required. Please sign in to purchase or enroll in this course.',
        requires_auth: true
      });
    }

    const { currency = 'INR', receipt, notes = {}, courseId, planId, couponCode } = req.body;

    let calculatedAmountPaise = 0;
    let originalPriceRupees = 0;
    let discountAmountRupees = 0;
    let validatedCoupon = null;
    let courseRecord = null;

    if (courseId) {
      const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
      if (IS_SERVERLESS) {
        courseRecord = await queryOneNeon(
          'SELECT id, title, price, original_price, status, is_published FROM courses WHERE id = $1 OR slug = $2',
          [courseId, courseId]
        );
      } else {
        courseRecord = queryOne(
          'SELECT id, title, price, original_price, status, is_published FROM courses WHERE id = ? OR slug = ?',
          [courseId, courseId]
        );
      }

      if (!courseRecord) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Check publication status
      const isPrivileged = authUser.role === 'ADMIN' || authUser.role === 'OPERATOR';
      if (!courseRecord.is_published && !isPrivileged) {
        return res.status(403).json({ error: 'This course is currently in draft mode and not available for purchase.' });
      }

      // Check if user already owns or is enrolled in this course
      const existingEnrollment = queryOne(
        "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'ACTIVE'",
        [authUser.id, courseRecord.id]
      );
      const existingPaidOrder = queryOne(
        "SELECT id FROM orders WHERE user_id = ? AND course_id = ? AND order_type = 'COURSE_PURCHASE' AND status = 'COMPLETED'",
        [authUser.id, courseRecord.id]
      );

      if (existingEnrollment || existingPaidOrder) {
        return res.status(400).json({
          error: 'You are already enrolled in this course. You can continue learning from your dashboard.',
          alreadyEnrolled: true,
          courseId: courseRecord.id
        });
      }

      originalPriceRupees = Number(courseRecord.price) || 0;

      // Free courses must use the free enrollment flow directly
      if (originalPriceRupees <= 0) {
        return res.status(400).json({
          error: 'This course is free. Please use the direct enrollment flow instead of purchasing.',
          isFree: true,
          courseId: courseRecord.id
        });
      }

      let finalRupees = originalPriceRupees;

      // Server-side coupon validation
      if (couponCode) {
        const val = validateCoupon({ code: couponCode, courseId: courseRecord.id, user: authUser });
        if (!val.valid) {
          return res.status(400).json({ error: val.error });
        }
        validatedCoupon = val.coupon;
        discountAmountRupees = val.discountAmount;
        finalRupees = val.finalPrice;

        if (finalRupees <= 0) {
          return res.status(400).json({
            error: 'This coupon provides 100% free access. Please use the zero-cost coupon enrollment flow.',
            isFree: true
          });
        }
      }

      // Authoritative server-calculated amount in paise (discards any client-sent price)
      calculatedAmountPaise = Math.round(finalRupees * 100);
    } else if (planId && PLANS[planId]) {
      calculatedAmountPaise = Math.round(PLANS[planId].price * 100);
      originalPriceRupees = PLANS[planId].price;
    } else {
      return res.status(400).json({ error: 'Either a valid courseId or planId must be specified for checkout.' });
    }

    // Minimum amount validation (100 paise = 1 INR)
    if (!calculatedAmountPaise || isNaN(calculatedAmountPaise) || calculatedAmountPaise < 100) {
      return res.status(400).json({
        error: 'Invalid amount. Minimum payable amount is 100 paise (₹1 INR).'
      });
    }

    const orderNotes = {
      ...notes,
      userId: authUser.id,
      userEmail: authUser.email,
      ...(courseRecord ? { courseId: courseRecord.id, courseTitle: courseRecord.title } : {}),
      ...(planId ? { planId } : {}),
      ...(validatedCoupon ? {
        couponId: validatedCoupon.id,
        couponCode: validatedCoupon.code,
        discountAmount: discountAmountRupees.toString(),
        originalPrice: originalPriceRupees.toString()
      } : {})
    };

    const internalReceipt = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create Razorpay Provider Order
    const order = await createOrder({
      amount: calculatedAmountPaise,
      currency: 'INR',
      receipt: internalReceipt,
      notes: orderNotes
    });

    const internalOrderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalPriceRupees = calculatedAmountPaise / 100;

    // Persist PENDING order record in authoritative database
    if (IS_SERVERLESS) {
      try {
        await runNeonQuery(
          `INSERT INTO orders (
            id, user_id, order_type, course_id, plan_id, amount, currency, status,
            payment_method, transaction_ref, receipt_url, coupon_id, discount_amount, original_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, 'INR', 'PENDING', 'RAZORPAY', $7, $8, $9, $10, $11)`,
          [
            internalOrderId,
            authUser.id,
            courseRecord ? 'COURSE_PURCHASE' : 'SUBSCRIPTION',
            courseRecord ? courseRecord.id : null,
            planId || null,
            finalPriceRupees,
            order.order_id,
            `/api/billing/receipts/${internalOrderId}`,
            validatedCoupon ? validatedCoupon.id : null,
            discountAmountRupees,
            originalPriceRupees
          ]
        );
      } catch (e) {
        console.error('Neon pending order error:', e.message);
      }
    }

    runQuery(
      `INSERT INTO orders (
        id, user_id, order_type, course_id, plan_id, amount, currency, status,
        payment_method, transaction_ref, receipt_url, coupon_id, discount_amount, original_amount
      ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'PENDING', 'RAZORPAY', ?, ?, ?, ?, ?)`,
      [
        internalOrderId,
        authUser.id,
        courseRecord ? 'COURSE_PURCHASE' : 'SUBSCRIPTION',
        courseRecord ? courseRecord.id : null,
        planId || null,
        finalPriceRupees,
        order.order_id, // stored as provider order ID reference
        `/api/billing/receipts/${internalOrderId}`,
        validatedCoupon ? validatedCoupon.id : null,
        discountAmountRupees,
        originalPriceRupees
      ]
    );

    return res.status(200).json({
      success: true,
      order_id: order.order_id,
      id: order.order_id,
      internal_order_id: internalOrderId,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Tr4HO9ZhQ39PuN',
      discountAmount: discountAmountRupees,
      finalPrice: finalPriceRupees
    });
  } catch (err) {
    console.error('Error in /api/create-order:', err);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      error: err.message || 'Failed to create payment order'
    });
  }
});

/**
 * STEP 3: BACKEND - Verify Payment Signature & Fulfill Course Access
 * Endpoint: POST /api/verify-payment (and POST /api/payment/verify)
 * Authenticated user only.
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) === razorpay_signature
 */
router.post('/verify-payment', async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req);
    if (!authUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to verify payment and access your course.'
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      planId
    } = req.body;

    // Validate required payment parameters
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing mandatory payment verification fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature.'
      });
    }

    // Verify HMAC-SHA256 signature
    const isValid = verifySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!isValid) {
      // Mark matching pending order as FAILED
      runQuery(
        `UPDATE orders SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP WHERE transaction_ref = ? AND status = 'PENDING'`,
        [razorpay_order_id]
      );
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Signature mismatch. Do not honor order.'
      });
    }

    // Signature verified! Look up the recorded pending or completed order in our database
    const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
    let existingOrder = null;
    if (IS_SERVERLESS) {
      try {
        existingOrder = await queryOneNeon(
          'SELECT * FROM orders WHERE transaction_ref = $1 OR transaction_ref = $2',
          [razorpay_order_id, razorpay_payment_id]
        );
      } catch (e) { /* safe fallback */ }
    } else {
      existingOrder = queryOne(
        'SELECT * FROM orders WHERE transaction_ref = ? OR transaction_ref = ?',
        [razorpay_order_id, razorpay_payment_id]
      );
    }

    // Idempotency: If order was already COMPLETED, return success without duplicate processing
    if (existingOrder && existingOrder.status === 'COMPLETED') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and course access granted.',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        already_processed: true
      });
    }

    // Verify order ownership
    if (existingOrder && existingOrder.user_id !== authUser.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Payment order was initiated by a different user.'
      });
    }

    const targetCourseId = courseId || (existingOrder ? existingOrder.course_id : null);
    const targetPlanId = planId || (existingOrder ? existingOrder.plan_id : null);

    const timestamp = Date.now();
    const internalOrderId = existingOrder ? existingOrder.id : `ord-${timestamp}-${Math.random().toString(36).substring(2, 6)}`;

    // On Vercel / serverless: execute async database operations against Neon PostgreSQL
    if (IS_SERVERLESS) {
      if (targetCourseId) {
        try {
          const course = await queryOneNeon('SELECT id, title, price FROM courses WHERE id = $1 OR slug = $2', [targetCourseId, targetCourseId]);
          const courseTitle = course?.title || targetCourseId;

          if (existingOrder) {
            await runNeonQuery(
              `UPDATE orders SET status = 'COMPLETED', transaction_ref = $1, payment_method = 'RAZORPAY', updated_at = NOW() WHERE id = $2`,
              [razorpay_payment_id, existingOrder.id]
            );
          } else {
            await runNeonQuery(
              `INSERT INTO orders (id, user_id, order_type, course_id, amount, currency, status, payment_method, transaction_ref, receipt_url)
               VALUES ($1, $2, 'COURSE_PURCHASE', $3, $4, 'INR', 'COMPLETED', 'RAZORPAY', $5, $6)
               ON CONFLICT (id) DO UPDATE SET status = 'COMPLETED'`,
              [internalOrderId, authUser.id, targetCourseId, course ? Number(course.price) : 249, razorpay_payment_id, `/api/billing/receipts/${internalOrderId}`]
            );
          }

          const enrId = `enr-${authUser.id}-${targetCourseId}`;
          await runNeonQuery(
            `INSERT INTO enrollments (id, user_id, course_id, status, progress_percent)
             VALUES ($1, $2, $3, 'ACTIVE', 0)
             ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE'`,
            [enrId, authUser.id, targetCourseId]
          );

          createNotification({
            userId: authUser.id,
            title: 'Course Access Unlocked',
            message: `Your payment was verified successfully. You now have permanent lifetime access to "${courseTitle}".`,
            type: 'COURSE',
            linkUrl: `/#learn/${targetCourseId}`
          });
        } catch (neonVerifyErr) {
          console.error('[verify-payment Neon error]', neonVerifyErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified and course access granted successfully!',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        internal_order_id: internalOrderId,
        courseId: targetCourseId
      });
    }

    // Local development SQLite path
    transaction(() => {
      if (targetCourseId) {
        const course = queryOne('SELECT id, title, price FROM courses WHERE id = ? OR slug = ?', [targetCourseId, targetCourseId]);
        const courseTitle = course?.title || targetCourseId;

        if (existingOrder) {
          runQuery(
            `UPDATE orders
             SET status = 'COMPLETED',
                 transaction_ref = ?,
                 payment_method = 'RAZORPAY',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [razorpay_payment_id, existingOrder.id]
          );
        } else {
          runQuery(
            `INSERT INTO orders (
              id, user_id, order_type, course_id, amount, currency, status, payment_method, transaction_ref, receipt_url
            ) VALUES (?, ?, 'COURSE_PURCHASE', ?, ?, 'INR', 'COMPLETED', 'RAZORPAY', ?, ?)`,
            [
              internalOrderId,
              authUser.id,
              targetCourseId,
              course ? Number(course.price) : 249,
              razorpay_payment_id,
              `/api/billing/receipts/${internalOrderId}`
            ]
          );
        }

        // Record coupon redemption if coupon was applied
        if (existingOrder?.coupon_id) {
          recordCouponRedemption({
            couponId: existingOrder.coupon_id,
            userId: authUser.id,
            courseId: targetCourseId,
            orderId: internalOrderId,
            originalPrice: existingOrder.original_amount || (course ? course.price : 249),
            discountAmount: existingOrder.discount_amount || 0,
            finalPrice: existingOrder.amount
          });
        }

        ensureEnrollment(authUser.id, targetCourseId);

        // Send confirmation notification
        createNotification({
          userId: authUser.id,
          title: 'Course Access Unlocked',
          message: `Your payment was verified successfully. You now have permanent lifetime access to "${courseTitle}".`,
          type: 'COURSE',
          linkUrl: `/#learn/${targetCourseId}`
        });

        logAudit(authUser.id, 'COURSE_PURCHASED_VERIFIED', 'ORDER', internalOrderId, {
          courseId: targetCourseId,
          amount: existingOrder ? existingOrder.amount : course?.price,
          paymentId: razorpay_payment_id
        });
      } else if (targetPlanId && PLANS[targetPlanId]) {
        const plan = PLANS[targetPlanId];
        const now = new Date();
        const periodEnd = new Date(now);
        if (plan.interval === 'month') {
          periodEnd.setDate(periodEnd.getDate() + 30);
        } else {
          periodEnd.setDate(periodEnd.getDate() + 365);
        }

        runQuery(
          `UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'ACTIVE'`,
          [authUser.id]
        );

        const subId = `sub-${timestamp}-${Math.random().toString(36).substring(2, 6)}`;
        runQuery(
          `INSERT INTO subscriptions (
            id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end
          ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, 0)`,
          [subId, authUser.id, targetPlanId, now.toISOString(), periodEnd.toISOString()]
        );

        if (existingOrder) {
          runQuery(
            `UPDATE orders
             SET status = 'COMPLETED',
                 transaction_ref = ?,
                 payment_method = 'RAZORPAY',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [razorpay_payment_id, existingOrder.id]
          );
        } else {
          runQuery(
            `INSERT INTO orders (
              id, user_id, order_type, plan_id, amount, currency, status, payment_method, transaction_ref, receipt_url
            ) VALUES (?, ?, 'SUBSCRIPTION', ?, ?, 'INR', 'COMPLETED', 'RAZORPAY', ?, ?)`,
            [internalOrderId, authUser.id, targetPlanId, plan.price, razorpay_payment_id, `/api/billing/receipts/${internalOrderId}`]
          );
        }

        createNotification({
          userId: authUser.id,
          title: `${plan.name} Activated!`,
          message: `Your subscription is active through ${periodEnd.toLocaleDateString()}. Enjoy unlimited access!`,
          type: 'SYSTEM',
          linkUrl: '/#profile'
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Course access granted.',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      course_id: targetCourseId
    });
  } catch (err) {
    console.error('Error in /api/verify-payment:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during payment verification'
    });
  }
});

/**
 * Webhook integration endpoint
 * Endpoint: POST /api/payment/webhook (and /api/webhook)
 * Verifies Razorpay signature and idempotently fulfills purchases.
 */
router.post('/webhook', (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (webhookSecret && signature) {
      const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const payload = req.body || {};
    const event = payload.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id;
      const notes = paymentEntity?.notes || orderEntity?.notes || {};

      if (orderId) {
        const order = queryOne('SELECT * FROM orders WHERE transaction_ref = ?', [orderId]);
        if (order && order.status !== 'COMPLETED') {
          transaction(() => {
            runQuery(
              `UPDATE orders SET status = 'COMPLETED', transaction_ref = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [paymentId || order.transaction_ref, order.id]
            );
            if (order.course_id && order.user_id) {
              ensureEnrollment(order.user_id, order.course_id);
            }
          });
        } else if (!order && notes.userId && notes.courseId) {
          // Reconcile order if webhook arrived first
          transaction(() => {
            const internalId = `ord-wh-${Date.now()}`;
            runQuery(
              `INSERT INTO orders (id, user_id, order_type, course_id, amount, currency, status, payment_method, transaction_ref)
               VALUES (?, ?, 'COURSE_PURCHASE', ?, ?, 'INR', 'COMPLETED', 'RAZORPAY', ?)`,
              [internalId, notes.userId, notes.courseId, (paymentEntity?.amount || 0) / 100, paymentId || orderId]
            );
            ensureEnrollment(notes.userId, notes.courseId);
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * ============================================================
 * ADMIN PURCHASE, ENROLLMENT & ENTITLEMENT MANAGEMENT ENDPOINTS
 * ============================================================
 */

// GET /api/admin/orders - Inspect all genuine database orders with search & status filters
router.get('/admin/orders', requireAuth, requireRole('ADMIN', 'OPERATOR'), (req, res) => {
  const { search, status, page = 1, limit = 50 } = req.query;

  let sql = `
    SELECT o.*, u.name as user_name, u.email as user_email, c.title as course_title
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN courses c ON o.course_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'ALL') {
    sql += ' AND o.status = ?';
    params.push(status.toUpperCase());
  }

  if (search && search.trim()) {
    sql += ' AND (o.id LIKE ? OR o.transaction_ref LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR c.title LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term, term);
  }

  sql += ' ORDER BY o.created_at DESC';

  const allOrders = queryAll(sql, params);
  const total = allOrders.length;
  const offset = (Number(page) - 1) * Number(limit);
  const paginated = allOrders.slice(offset, offset + Number(limit));

  return res.json({
    orders: paginated,
    total,
    page: Number(page),
    limit: Number(limit)
  });
});

// GET /api/admin/enrollments - Inspect all course enrollments
router.get('/admin/enrollments', requireAuth, requireRole('ADMIN', 'OPERATOR'), (req, res) => {
  const { search, courseId, page = 1, limit = 50 } = req.query;

  let sql = `
    SELECT e.*, u.name as user_name, u.email as user_email, c.title as course_title, c.price as course_price
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (courseId) {
    sql += ' AND e.course_id = ?';
    params.push(courseId);
  }

  if (search && search.trim()) {
    sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR c.title LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY e.enrolled_at DESC';

  const all = queryAll(sql, params);
  const total = all.length;
  const offset = (Number(page) - 1) * Number(limit);
  const paginated = all.slice(offset, offset + Number(limit));

  return res.json({
    enrollments: paginated,
    total,
    page: Number(page),
    limit: Number(limit)
  });
});

// POST /api/admin/entitlements/grant - Grant complimentary course entitlement with audit trail
router.post('/admin/entitlements/grant', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { userId, courseId, reason } = req.body;

  if (!userId || !courseId || !reason || !reason.trim()) {
    return res.status(400).json({
      error: 'Missing required parameters: userId, courseId, and a documented reason are mandatory.'
    });
  }

  const user = queryOne('SELECT id, name, email FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const course = queryOne('SELECT id, title FROM courses WHERE id = ?', [courseId]);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const entitlementId = `ent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  transaction(() => {
    // Upsert complimentary entitlement
    runQuery(
      `INSERT INTO course_entitlements (id, user_id, course_id, entitlement_type, granted_by, reason, is_active)
       VALUES (?, ?, ?, 'COMPLIMENTARY', ?, ?, 1)
       ON CONFLICT(user_id, course_id) DO UPDATE SET
         is_active = 1,
         reason = excluded.reason,
         granted_by = excluded.granted_by,
         revoked_at = NULL`,
      [entitlementId, userId, courseId, req.user.id, reason.trim()]
    );

    // Ensure persistent enrollment
    ensureEnrollment(userId, courseId);

    // Audit log
    logAudit(req.user.id, 'COMPLIMENTARY_ENTITLEMENT_GRANTED', 'COURSE_ENTITLEMENT', entitlementId, {
      userId,
      userEmail: user.email,
      courseId,
      courseTitle: course.title,
      reason: reason.trim(),
      grantedByAdmin: req.user.email
    });

    // Notify student
    createNotification({
      userId,
      title: 'Complimentary Course Access Granted',
      message: `You were granted complimentary lifetime access to "${course.title}". Reason: ${reason.trim()}`,
      type: 'COURSE',
      linkUrl: `/#learn/${courseId}`
    });
  });

  return res.json({
    success: true,
    message: `Complimentary entitlement granted to ${user.name} for "${course.title}".`,
    entitlementId
  });
});

// POST /api/admin/entitlements/revoke - Revoke complimentary course entitlement with audit trail
router.post('/admin/entitlements/revoke', requireAuth, requireRole('ADMIN'), (req, res) => {
  const { userId, courseId, reason } = req.body;

  if (!userId || !courseId || !reason || !reason.trim()) {
    return res.status(400).json({
      error: 'Missing required parameters: userId, courseId, and a documented revocation reason are mandatory.'
    });
  }

  transaction(() => {
    runQuery(
      `UPDATE course_entitlements
       SET is_active = 0, revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );

    runQuery(
      `UPDATE enrollments
       SET status = 'DROPPED'
       WHERE user_id = ? AND course_id = ?`,
      [userId, courseId]
    );

    logAudit(req.user.id, 'COMPLIMENTARY_ENTITLEMENT_REVOKED', 'COURSE_ENTITLEMENT', null, {
      userId,
      courseId,
      reason: reason.trim(),
      revokedByAdmin: req.user.email
    });
  });

  return res.json({
    success: true,
    message: 'Complimentary course entitlement successfully revoked.'
  });
});

export default router;
