import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAvailablePlans,
  hasCourseEntitlement,
  createCheckoutSession,
  cancelSubscription,
  resumeSubscription,
  getUserBillingDetails,
  processWebhookEvent,
  generateBillingReceiptsCsv
} from '../services/billingService.js';

const router = express.Router();

// GET /api/billing/plans - Public list of available subscription tiers & pricing
router.get('/plans', (req, res) => {
  return res.json({
    success: true,
    plans: getAvailablePlans()
  });
});

// GET /api/billing/status - Current user's subscription and billing history
router.get('/status', requireAuth, (req, res) => {
  try {
    const details = getUserBillingDetails(req.user.id);
    return res.json({
      success: true,
      ...details
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/check-course/:courseId - Check entitlement for a specific course
router.get('/check-course/:courseId', requireAuth, (req, res) => {
  try {
    const entitled = hasCourseEntitlement(req.user.id, req.params.courseId);
    return res.json({
      success: true,
      courseId: req.params.courseId,
      entitled
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/checkout - Execute a course purchase or subscription upgrade
router.post('/checkout', requireAuth, (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Direct unverified checkout is disabled in production. Please use /api/create-order and /api/verify-payment with verified Razorpay payment.'
    });
  }
  const { type, courseId, planId, paymentMethod } = req.body;
  try {
    const result = createCheckoutSession(req.user.id, {
      type,
      courseId,
      planId,
      paymentMethod
    });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/billing/subscription/cancel - Cancel auto-renewal at period end
router.post('/subscription/cancel', requireAuth, (req, res) => {
  try {
    const updatedSub = cancelSubscription(req.user.id);
    return res.json({
      success: true,
      message: 'Subscription renewal has been canceled. Your access remains active until the end of the billing period.',
      subscription: updatedSub
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/billing/subscription/resume - Resume auto-renewal
router.post('/subscription/resume', requireAuth, (req, res) => {
  try {
    const updatedSub = resumeSubscription(req.user.id);
    return res.json({
      success: true,
      message: 'Subscription renewal has been resumed successfully.',
      subscription: updatedSub
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/billing/webhook - Webhook integration endpoint
router.post('/webhook', (req, res) => {
  try {
    const result = processWebhookEvent(req.body);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/billing/receipts/csv - Download billing receipts CSV
router.get('/receipts/csv', requireAuth, (req, res) => {
  try {
    const csvData = generateBillingReceiptsCsv(req.user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="codificators_billing_${Date.now()}.csv"`);
    return res.status(200).send(csvData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
