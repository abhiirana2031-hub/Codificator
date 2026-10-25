import Razorpay from 'razorpay';
import crypto from 'node:crypto';

/**
 * Returns a configured Razorpay instance using environment credentials
 */
export function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials not configured: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in environment.');
  }

  return new Razorpay({
    key_id,
    key_secret
  });
}

/**
 * Step 1: Create a Razorpay Order
 * @param {Object} options
 * @param {number} options.amount - Amount in paise (minimum 100 paise = 1 INR)
 * @param {string} [options.currency='INR'] - Currency code
 * @param {string} [options.receipt] - Internal reference receipt ID
 * @param {Object} [options.notes] - Additional metadata (e.g. userId, courseId, planId)
 * @returns {Promise<Object>} Order details including order_id, amount, currency
 */
export async function createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  const numericAmount = Math.round(Number(amount));

  // Validation: Minimum amount requirement of 100 paise
  if (isNaN(numericAmount) || numericAmount < 100) {
    const error = new Error('Invalid amount: amount must be at least 100 paise (1 INR).');
    error.statusCode = 400;
    throw error;
  }

  const client = getRazorpayClient();
  const receiptId = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const order = await client.orders.create({
      amount: numericAmount,
      currency: currency.toUpperCase(),
      receipt: receiptId,
      notes
    });

    return {
      success: true,
      order_id: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status
    };
  } catch (err) {
    console.error('Razorpay API Error during order creation:', err);
    const error = new Error(err.error?.description || err.message || 'Failed to create Razorpay order');
    error.statusCode = err.statusCode || 500;
    throw error;
  }
}

/**
 * Step 3: Verify Razorpay Payment Signature
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * @param {Object} params
 * @param {string} params.razorpay_order_id
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_signature
 * @returns {boolean} True if signature is valid, false otherwise
 */
export function verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    const error = new Error('Missing required fields for signature verification (razorpay_order_id, razorpay_payment_id, razorpay_signature).');
    error.statusCode = 400;
    throw error;
  }

  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) {
    const error = new Error('RAZORPAY_KEY_SECRET is not configured in environment.');
    error.statusCode = 500;
    throw error;
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(body.toString())
    .digest('hex');

  // Constant-time string comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(razorpay_signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
