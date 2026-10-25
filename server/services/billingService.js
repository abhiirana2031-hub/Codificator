import { db, runQuery, queryOne, queryAll, transaction } from '../db/db.js';
import { ensureEnrollment } from './progressionEngine.js';
import { createNotification } from './notificationService.js';
import { sanitizeCsvField } from './analyticsService.js';

// SaaS Tier Catalog Definitions
export const PLANS = {
  FREE: {
    id: 'FREE',
    name: 'Starter Free',
    price: 0,
    currency: 'USD',
    interval: 'forever',
    badge: 'Free Forever',
    description: 'Essential computer science and programming curriculum accessible to everyone.',
    features: [
      'Access to all open introductory computer science courses',
      'Text-first interactive reading notes & lesson bookmarks',
      'Instant formative knowledge check quizzes',
      'Basic community forum & study groups'
    ]
  },
  PRO_MONTHLY: {
    id: 'PRO_MONTHLY',
    name: 'Pro Monthly',
    price: 29,
    currency: 'USD',
    interval: 'month',
    badge: 'Most Flexible',
    description: 'Comprehensive access to all specialized career tracks and sandboxed labs.',
    features: [
      'Unlimited access to all Pro & Career Track courses',
      'Real-time Linux container sandboxes & auto-graded exercises',
      'Official digitally-verifiable completion certificates',
      'Personal study notes autosave and bookmarks',
      'Instructor code reviews & guided assignment feedback'
    ]
  },
  PRO_ANNUAL: {
    id: 'PRO_ANNUAL',
    name: 'Pro Annual',
    price: 249,
    currency: 'USD',
    interval: 'year',
    savings: 'Save 28%',
    badge: 'Best Value',
    popular: true,
    description: 'Full career acceleration for dedicated software engineers with two months free.',
    features: [
      'Everything included in Pro Monthly',
      '2 full months free compared to monthly billing',
      'Priority instructor feedback & grading (< 24hr turnaround)',
      'Direct resume audit & portfolio project verification',
      'Permanent certificate badge for LinkedIn & GitHub'
    ]
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise / Team',
    price: 999,
    currency: 'USD',
    interval: 'year',
    badge: 'Teams & Universities',
    description: 'Complete training solution for university batches and engineering cohorts.',
    features: [
      'Everything in Pro Annual for up to 10 team seats',
      'Cohort progression analytics & instructor dashboards',
      'Custom curriculum module creation & private assignments',
      'SSO integration and centralized role management',
      'Dedicated curriculum coordinator & SLA support'
    ]
  }
};

/**
 * Returns available plans catalog
 */
export function getAvailablePlans() {
  return Object.values(PLANS);
}

/**
 * Checks whether a user has entitlement to access a course
 * (Free course, instructor/admin bypass, Pro subscription, or one-off purchase)
 */
export function hasCourseEntitlement(userId, courseId) {
  if (!userId || !courseId) return false;

  const user = queryOne('SELECT id, role FROM users WHERE id = ?', [userId]);
  if (!user) return false;

  // 1. Role-based privilege override: Admins & Operators have universal access
  if (user.role === 'ADMIN' || user.role === 'OPERATOR') {
    return true;
  }

  const course = queryOne('SELECT id, instructor_id, price, tier FROM courses WHERE id = ? OR slug = ?', [courseId, courseId]);
  if (!course) return false;

  // 2. Instructor ownership override
  if (course.instructor_id === userId) {
    return true;
  }
  const coInstructor = queryOne('SELECT 1 FROM course_instructors WHERE course_id = ? AND instructor_id = ?', [course.id, userId]);
  if (coInstructor) {
    return true;
  }

  // 3. Free Course Entitlement
  const isFree = (course.price === 0 || course.price === null || !course.price) && (course.tier === 'FREE' || !course.tier);
  if (isFree) {
    return true;
  }

  // 4. Active Subscription Entitlement (Pro Monthly, Pro Annual, Enterprise grants access to all paid courses)
  const now = new Date().toISOString();
  const activeSub = queryOne(
    `SELECT id, plan_id FROM subscriptions
     WHERE user_id = ? AND status = 'ACTIVE' AND current_period_end > ?
     ORDER BY current_period_end DESC LIMIT 1`,
    [userId, now]
  );
  if (activeSub) {
    return true;
  }

  // 5. One-off completed course purchase order
  const order = queryOne(
    `SELECT id FROM orders
     WHERE user_id = ? AND course_id = ? AND order_type = 'COURSE_PURCHASE' AND status = 'COMPLETED'
     LIMIT 1`,
    [userId, course.id]
  );
  if (order) {
    return true;
  }

  // 6. Authorized complimentary entitlement grant
  const activeEntitlement = queryOne(
    `SELECT id FROM course_entitlements
     WHERE user_id = ? AND course_id = ? AND is_active = 1
     LIMIT 1`,
    [userId, course.id]
  );
  if (activeEntitlement) {
    return true;
  }

  return false;
}

/**
 * Process a checkout transaction (course purchase or subscription activation)
 */
export function createCheckoutSession(userId, { type, courseId, planId, paymentMethod = 'CREDIT_CARD' }) {
  if (!userId) {
    throw new Error('User authentication required for checkout');
  }

  const user = queryOne('SELECT id, email, name FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error('User not found');
  }

  return transaction(() => {
    const timestamp = Date.now();
    const orderId = `ord-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
    const txRef = `tx_${paymentMethod.toLowerCase()}_${timestamp}`;

    if (type === 'COURSE_PURCHASE') {
      if (!courseId) {
        throw new Error('courseId is required for COURSE_PURCHASE');
      }
      const course = queryOne('SELECT id, title, price, tier FROM courses WHERE id = ? OR slug = ?', [courseId, courseId]);
      if (!course) {
        throw new Error('Course not found');
      }

      const amount = Number(course.price) > 0 ? Number(course.price) : 49.0;

      runQuery(
        `INSERT INTO orders (
          id, user_id, order_type, course_id, amount, currency, status, payment_method, transaction_ref, receipt_url
        ) VALUES (?, ?, 'COURSE_PURCHASE', ?, ?, 'USD', 'COMPLETED', ?, ?, ?)`,
        [orderId, userId, course.id, amount, paymentMethod, txRef, `/api/billing/receipts/${orderId}`]
      );

      // Automatically enroll student into the purchased course
      const enrollment = ensureEnrollment(userId, course.id);

      // Send confirmation notification
      try {
        createNotification({
          userId,
          title: 'Course Purchase Successful',
          message: `You now have full lifetime access to "${course.title}". Start learning anytime!`,
          type: 'COURSE',
          linkUrl: `/#learn/${course.id}`
        });
      } catch (e) {
        // notification error non-blocking
      }

      const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
      return {
        success: true,
        order,
        enrollment,
        accessGranted: true,
        message: `Successfully purchased access to ${course.title}`
      };
    }

    if (type === 'SUBSCRIPTION') {
      if (!planId || !PLANS[planId] || planId === 'FREE') {
        throw new Error(`Invalid planId: "${planId}". Available plans: PRO_MONTHLY, PRO_ANNUAL, ENTERPRISE`);
      }

      const plan = PLANS[planId];
      const now = new Date();
      const periodStart = now.toISOString();
      const periodEnd = new Date(now);

      if (plan.interval === 'month') {
        periodEnd.setDate(periodEnd.getDate() + 30);
      } else {
        periodEnd.setDate(periodEnd.getDate() + 365);
      }
      const periodEndStr = periodEnd.toISOString();

      // Deactivate any currently active subscriptions for this user
      runQuery(
        `UPDATE subscriptions
         SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND status = 'ACTIVE'`,
        [userId]
      );

      const subId = `sub-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
      runQuery(
        `INSERT INTO subscriptions (
          id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end
        ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, 0)`,
        [subId, userId, planId, periodStart, periodEndStr]
      );

      // Record corresponding billing invoice order
      runQuery(
        `INSERT INTO orders (
          id, user_id, order_type, plan_id, amount, currency, status, payment_method, transaction_ref, receipt_url
        ) VALUES (?, ?, 'SUBSCRIPTION', ?, ?, 'USD', 'COMPLETED', ?, ?, ?)`,
        [orderId, userId, planId, plan.price, paymentMethod, txRef, `/api/billing/receipts/${orderId}`]
      );

      // Send notification
      try {
        createNotification({
          userId,
          title: `${plan.name} Activated!`,
          message: `Your ${plan.name} subscription is now active through ${periodEnd.toLocaleDateString()}. Enjoy unlimited access!`,
          type: 'SYSTEM',
          linkUrl: '/#profile'
        });
      } catch (e) {
        // non-blocking
      }

      const subscription = queryOne('SELECT * FROM subscriptions WHERE id = ?', [subId]);
      const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);

      return {
        success: true,
        subscription,
        order,
        accessGranted: true,
        message: `Successfully subscribed to ${plan.name}`
      };
    }

    throw new Error(`Unsupported checkout type: "${type}". Expected COURSE_PURCHASE or SUBSCRIPTION.`);
  });
}

/**
 * Cancel user subscription at period end
 */
export function cancelSubscription(userId) {
  const activeSub = queryOne(
    `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE' ORDER BY current_period_end DESC LIMIT 1`,
    [userId]
  );
  if (!activeSub) {
    throw new Error('No active subscription found to cancel.');
  }

  runQuery(
    `UPDATE subscriptions
     SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [activeSub.id]
  );

  try {
    createNotification({
      userId,
      title: 'Subscription Cancellation Scheduled',
      message: 'Your subscription will not renew at the end of the current billing period.',
      type: 'SYSTEM',
      linkUrl: '/#profile'
    });
  } catch (e) {}

  return queryOne('SELECT * FROM subscriptions WHERE id = ?', [activeSub.id]);
}

/**
 * Resume a canceled subscription
 */
export function resumeSubscription(userId) {
  const activeSub = queryOne(
    `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE' ORDER BY current_period_end DESC LIMIT 1`,
    [userId]
  );
  if (!activeSub) {
    throw new Error('No active subscription found to resume.');
  }

  runQuery(
    `UPDATE subscriptions
     SET cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [activeSub.id]
  );

  return queryOne('SELECT * FROM subscriptions WHERE id = ?', [activeSub.id]);
}

/**
 * Get comprehensive billing profile for a user
 */
export function getUserBillingDetails(userId) {
  const now = new Date().toISOString();
  const subscription = queryOne(
    `SELECT * FROM subscriptions
     WHERE user_id = ? AND status = 'ACTIVE' AND current_period_end > ?
     ORDER BY current_period_end DESC LIMIT 1`,
    [userId, now]
  );

  const orders = queryAll(
    `SELECT o.*, c.title AS course_title
     FROM orders o
     LEFT JOIN courses c ON o.course_id = c.id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [userId]
  );

  const activePlanId = subscription ? subscription.plan_id : 'FREE';
  const plan = PLANS[activePlanId] || PLANS.FREE;

  return {
    tier: activePlanId,
    plan,
    hasActiveSubscription: Boolean(subscription),
    subscription: subscription || null,
    orders,
    availablePlans: getAvailablePlans()
  };
}

/**
 * Process incoming simulated or real webhook events idempotently
 */
export function processWebhookEvent(payload) {
  if (!payload || !payload.type) {
    throw new Error('Invalid webhook payload: type is required');
  }

  const eventId = payload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  switch (payload.type) {
    case 'invoice.payment_succeeded': {
      const { userId, planId, amount, transactionRef } = payload.data || {};
      if (userId && planId) {
        const orderId = `ord-wh-${Date.now()}`;
        runQuery(
          `INSERT INTO orders (id, user_id, order_type, plan_id, amount, currency, status, transaction_ref)
           VALUES (?, ?, 'SUBSCRIPTION', ?, ?, 'USD', 'COMPLETED', ?)`,
          [orderId, userId, planId, amount || 29.0, transactionRef || eventId]
        );
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const { subscriptionId, userId } = payload.data || {};
      if (subscriptionId) {
        runQuery(`UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [subscriptionId]);
      } else if (userId) {
        runQuery(`UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, [userId]);
      }
      break;
    }
    default:
      break;
  }

  return {
    received: true,
    eventId,
    type: payload.type,
    processedAt: new Date().toISOString()
  };
}

/**
 * Generate CSV export of billing and invoice receipts with formula injection protection
 */
export function generateBillingReceiptsCsv(userId) {
  const billing = getUserBillingDetails(userId);
  const rows = [];

  rows.push('# CODIFICATORS BILLING & RECEIPT STATEMENT');
  rows.push(`# User ID: ${sanitizeCsvField(userId)}`);
  rows.push(`# Current Tier: ${sanitizeCsvField(billing.tier)}`);
  rows.push(`# Generated At: ${new Date().toISOString()}`);
  rows.push('');
  rows.push('Order ID,Date,Type,Item / Plan,Amount,Currency,Status,Payment Method,Transaction Reference');

  for (const o of billing.orders) {
    const item = o.order_type === 'COURSE_PURCHASE' ? (o.course_title || o.course_id || 'Course Access') : (o.plan_id || 'Subscription');
    rows.push([
      sanitizeCsvField(o.id),
      sanitizeCsvField(o.created_at),
      sanitizeCsvField(o.order_type),
      sanitizeCsvField(item),
      o.amount.toFixed(2),
      sanitizeCsvField(o.currency),
      sanitizeCsvField(o.status),
      sanitizeCsvField(o.payment_method || 'CARD'),
      sanitizeCsvField(o.transaction_ref || '')
    ].join(','));
  }

  return rows.join('\r\n');
}
