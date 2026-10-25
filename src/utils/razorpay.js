import { lmsApi } from '../api/lmsApi';

/**
 * Ensures Razorpay Checkout script is loaded on the page
 * @returns {Promise<boolean>}
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Standard Razorpay Web Checkout Integration
 * 1. Calls backend /api/create-order
 * 2. Launches Razorpay Standard Web Checkout Modal
 * 3. On success, calls backend /api/verify-payment with razorpay_payment_id, razorpay_order_id, razorpay_signature
 * 4. Handles modal dismiss (cancellation) and payment.failed events
 *
 * @param {Object} params
 * @param {number} params.amountInPaise - Amount in smallest currency unit (paise for INR, min 100)
 * @param {string} [params.currency='INR'] - Currency code
 * @param {string} [params.name='Codificators'] - Brand / store name displayed on modal
 * @param {string} [params.description='E-Learning Checkout'] - Product description
 * @param {string} [params.courseId] - Optional associated course ID
 * @param {string} [params.planId] - Optional associated SaaS plan ID
 * @param {Object} [params.prefill] - { name, email, contact }
 * @param {Function} [params.onSuccess] - Callback on signature verification success
 * @param {Function} [params.onError] - Callback on error or payment failure
 * @param {Function} [params.onDismiss] - Callback when user closes/dismisses modal without paying
 */
export async function executeRazorpayCheckout({
  amountInPaise,
  currency = 'INR',
  name = 'Codificators',
  description = 'Course & Subscription Checkout',
  courseId,
  planId,
  couponCode = null,
  prefill = {},
  onSuccess,
  onError,
  onDismiss
}) {
  // Step 0: Ensure script is ready
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    const errorMsg = 'Razorpay SDK failed to load. Please check your internet connection.';
    if (onError) onError(new Error(errorMsg));
    return;
  }

  try {
    // Step 1: Call Backend to Create Order
    const orderRes = await lmsApi.createRazorpayOrder({
      amount: amountInPaise,
      currency,
      courseId,
      planId,
      couponCode
    });

    if (!orderRes || !orderRes.order_id) {
      throw new Error(orderRes?.error || 'Failed to initialize payment order with server.');
    }

    const key = import.meta.env.VITE_RAZORPAY_KEY_ID || orderRes.key_id || 'rzp_test_Tr4HO9ZhQ39PuN';

    // Step 2: Configure Razorpay Checkout Modal Options
    const options = {
      key,
      amount: orderRes.amount,
      currency: orderRes.currency || 'INR',
      name: name || 'Codificators LMS',
      description: description || 'Course & Subscription Checkout',
      order_id: orderRes.order_id,
      handler: async function (response) {
        // Step 3: Receive payment response & verify signature on backend
        try {
          const verifyRes = await lmsApi.verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            courseId,
            planId,
            couponCode
          });

          if (verifyRes.success) {
            if (onSuccess) onSuccess({ ...verifyRes, ...response });
          } else {
            throw new Error(verifyRes.error || 'Payment signature verification failed.');
          }
        } catch (verifyErr) {
          console.error('Payment verification error:', verifyErr);
          if (onError) onError(verifyErr);
        }
      },
      prefill: {
        name: prefill?.name || 'Student',
        email: prefill?.email || 'student@codificators.com',
        contact: prefill?.contact || '9876543210'
      },
      theme: {
        color: '#10b981'
      },
      modal: {
        ondismiss: function () {
          console.log('Razorpay payment modal closed by user.');
          if (onDismiss) onDismiss();
        }
      }
    };

    if (courseId || planId) {
      options.notes = {};
      if (courseId) options.notes.courseId = String(courseId);
      if (planId) options.notes.planId = String(planId);
    }

    const rzp = new window.Razorpay(options);

    // Handle payment failure event
    rzp.on('payment.failed', function (response) {
      console.error('Razorpay payment failed:', response.error);
      const err = new Error(response.error.description || 'Payment failed.');
      err.details = response.error;
      if (onError) onError(err);
    });

    rzp.open();
  } catch (err) {
    console.error('Error initiating Razorpay checkout:', err);
    if (onError) onError(err);
  }
}
