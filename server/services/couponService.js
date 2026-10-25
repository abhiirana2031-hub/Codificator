import { queryAll, queryOne, runQuery, transaction } from '../db/db.js';

/**
 * Validates a coupon against all business rules on the backend.
 * Never trusts prices or discount percentages from the client.
 */
export function validateCoupon({ code, courseId, user }) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Coupon code is required' };
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = queryOne('SELECT * FROM coupons WHERE code = ?', [cleanCode]);

  if (!coupon) {
    return { valid: false, error: 'Invalid coupon code. Please verify the code and try again.' };
  }

  if (!coupon.is_active) {
    return { valid: false, error: 'This coupon is no longer active.' };
  }

  const now = new Date();

  if (coupon.start_date && new Date(coupon.start_date) > now) {
    return { valid: false, error: 'This coupon is not active yet.' };
  }

  if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
    return { valid: false, error: 'This coupon has expired.' };
  }

  // Course price lookup from database
  let course = null;
  if (courseId) {
    course = queryOne('SELECT id, title, price, status FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      return { valid: false, error: 'Specified course was not found.' };
    }
  }

  // Check course eligibility
  if (coupon.eligible_course_id && courseId && coupon.eligible_course_id !== courseId) {
    return { valid: false, error: 'This coupon is not valid for the selected course.' };
  }

  // Check user-specific eligibility (Scenario C)
  if (coupon.eligible_email) {
    if (!user || !user.email) {
      return { valid: false, error: 'Please sign in to your eligible account to use this coupon.' };
    }
    if (user.email.trim().toLowerCase() !== coupon.eligible_email.trim().toLowerCase()) {
      return { valid: false, error: 'This coupon is not valid for your account.' };
    }
  }

  if (coupon.eligible_phone) {
    if (!user || !user.phone) {
      return { valid: false, error: 'A verified phone number is required to redeem this coupon.' };
    }
    const userPhoneClean = user.phone.replace(/[^0-9]/g, '');
    const eligiblePhoneClean = coupon.eligible_phone.replace(/[^0-9]/g, '');
    if (userPhoneClean !== eligiblePhoneClean) {
      return { valid: false, error: 'This coupon is not valid for your account phone number.' };
    }
  }

  // Check global redemption count
  const redemptionsCount = queryOne(
    'SELECT COUNT(*) as count FROM coupon_redemptions WHERE coupon_id = ?',
    [coupon.id]
  ).count;

  if (coupon.max_redemptions && redemptionsCount >= coupon.max_redemptions) {
    return { valid: false, error: 'This coupon has reached its maximum total redemption limit.' };
  }

  // Check per-user redemption count (Prevent duplicate redemptions)
  if (user && user.id) {
    const userRedemptions = queryOne(
      'SELECT COUNT(*) as count FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?',
      [coupon.id, user.id]
    ).count;

    const maxPerUser = coupon.max_redemptions_per_user || 1;
    if (userRedemptions >= maxPerUser) {
      return { valid: false, error: 'You have already redeemed this coupon the maximum allowed number of times.' };
    }
  }

  const originalPrice = course ? (Number(course.price) || 0) : 0;

  // Check minimum purchase amount requirement
  if (coupon.min_purchase_amount && originalPrice < coupon.min_purchase_amount) {
    return {
      valid: false,
      error: `Order subtotal must be at least ₹${coupon.min_purchase_amount} to apply this coupon.`
    };
  }

  // Calculate discount according to coupon type
  let discountAmount = 0;

  if (coupon.discount_type === 'FREE') {
    // 100% course entitlement (Scenario D)
    discountAmount = originalPrice;
  } else if (coupon.discount_type === 'PERCENTAGE') {
    // Scenario A: Percentage discount
    const percent = Math.min(100, Math.max(0, Number(coupon.discount_value) || 0));
    discountAmount = (originalPrice * percent) / 100;
    if (coupon.max_discount && discountAmount > coupon.max_discount) {
      discountAmount = coupon.max_discount;
    }
  } else if (coupon.discount_type === 'FIXED') {
    // Scenario B: Fixed discount
    discountAmount = Math.min(originalPrice, Number(coupon.discount_value) || 0);
  }

  // Security: Discount must never exceed original price and final price cannot be negative
  discountAmount = Math.min(originalPrice, Math.max(0, Math.round(discountAmount)));
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_discount: coupon.max_discount
    },
    originalPrice,
    discountAmount,
    finalPrice,
    isFree: finalPrice === 0
  };
}

/**
 * Atomically records coupon redemption and updates counters.
 */
export function recordCouponRedemption({
  couponId,
  userId,
  courseId,
  orderId = null,
  originalPrice = 0,
  originalAmount = 0,
  discountAmount = 0,
  finalPrice = 0,
  finalAmount = 0
}) {
  const safeOriginal = Number(originalPrice || originalAmount || 0);
  const safeDiscount = Number(discountAmount || 0);
  const safeFinal = Number(finalPrice !== undefined ? finalPrice : (finalAmount || 0));

  return transaction((db) => {
    // Re-verify coupon availability inside transaction
    const coupon = queryOne('SELECT * FROM coupons WHERE id = ?', [couponId]);
    if (!coupon || !coupon.is_active) {
      throw new Error('Coupon is no longer available');
    }

    const redemptionId = `redempt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    runQuery(
      `INSERT INTO coupon_redemptions (id, coupon_id, user_id, course_id, order_id, discount_amount, original_price, final_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [redemptionId, couponId, userId, courseId || null, orderId || null, safeDiscount, safeOriginal, safeFinal]
    );

    // If single use, mark inactive immediately
    if (coupon.is_single_use) {
      runQuery('UPDATE coupons SET is_active = 0 WHERE id = ?', [couponId]);
    }

    return redemptionId;
  });
}

/**
 * Admin: List all coupons with real usage statistics.
 */
export function listAdminCoupons() {
  const coupons = queryAll(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id) as redemption_count,
      (SELECT SUM(discount_amount) FROM coupon_redemptions r WHERE r.coupon_id = c.id) as total_discount_given,
      co.title as eligible_course_title
    FROM coupons c
    LEFT JOIN courses co ON c.eligible_course_id = co.id
    ORDER BY c.created_at DESC
  `);
  return coupons;
}

/**
 * Admin: Create a new coupon.
 */
export function createCoupon(data, creatorId = null) {
  const code = (data.code || '').trim().toUpperCase();
  if (!code || code.length < 3) {
    throw new Error('Coupon code must be at least 3 characters');
  }

  const existing = queryOne('SELECT id FROM coupons WHERE code = ?', [code]);
  if (existing) {
    throw new Error(`Coupon with code "${code}" already exists`);
  }

  const id = `cpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const discountType = data.discount_type || 'PERCENTAGE';
  const discountValue = Number(data.discount_value) || 0;

  // Validate creatorId against existing users to prevent Foreign Key constraint failure
  let validCreatorId = null;
  if (creatorId) {
    const creatorUser = queryOne('SELECT id FROM users WHERE id = ?', [creatorId]);
    if (creatorUser) validCreatorId = creatorUser.id;
  }

  // Validate eligible_course_id against existing courses to prevent Foreign Key constraint failure
  let validCourseId = null;
  if (data.eligible_course_id) {
    const course = queryOne('SELECT id FROM courses WHERE id = ?', [data.eligible_course_id]);
    if (course) validCourseId = course.id;
  }

  runQuery(
    `INSERT INTO coupons (
      id, code, description, discount_type, discount_value, max_discount,
      min_purchase_amount, eligible_course_id, eligible_email, eligible_phone,
      start_date, expiry_date, max_redemptions, max_redemptions_per_user,
      is_active, is_single_use, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      data.description || null,
      discountType,
      discountValue,
      data.max_discount ? Number(data.max_discount) : null,
      data.min_purchase_amount ? Number(data.min_purchase_amount) : 0,
      validCourseId,
      data.eligible_email ? data.eligible_email.trim().toLowerCase() : null,
      data.eligible_phone ? data.eligible_phone.trim() : null,
      data.start_date || new Date().toISOString(),
      data.expiry_date || null,
      data.max_redemptions ? Number(data.max_redemptions) : 100,
      data.max_redemptions_per_user ? Number(data.max_redemptions_per_user) : 1,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      data.is_single_use ? 1 : 0,
      validCreatorId
    ]
  );

  return queryOne('SELECT * FROM coupons WHERE id = ?', [id]);
}

/**
 * Admin: Update coupon status or fields.
 */
export function updateCoupon(id, updates) {
  const coupon = queryOne('SELECT * FROM coupons WHERE id = ?', [id]);
  if (!coupon) throw new Error('Coupon not found');

  const fields = [];
  const params = [];

  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    params.push(updates.is_active ? 1 : 0);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    params.push(updates.description);
  }
  if (updates.expiry_date !== undefined) {
    fields.push('expiry_date = ?');
    params.push(updates.expiry_date);
  }
  if (updates.max_redemptions !== undefined) {
    fields.push('max_redemptions = ?');
    params.push(Number(updates.max_redemptions));
  }

  if (fields.length === 0) return coupon;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  runQuery(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, params);
  return queryOne('SELECT * FROM coupons WHERE id = ?', [id]);
}

/**
 * Admin: Delete / Revoke coupon.
 */
export function deleteCoupon(idOrCode) {
  const coupon = queryOne('SELECT id, code FROM coupons WHERE id = ? OR code = ?', [idOrCode, idOrCode]);
  if (!coupon) {
    return { success: true };
  }

  const couponId = coupon.id;

  transaction(() => {
    // 1. Unlink coupon from existing orders so Foreign Key constraint does not block deletion
    try {
      runQuery('UPDATE orders SET coupon_id = NULL WHERE coupon_id = ?', [couponId]);
    } catch {}

    // 2. Delete any redemption audit records for this coupon
    try {
      runQuery('DELETE FROM coupon_redemptions WHERE coupon_id = ?', [couponId]);
    } catch {}

    // 3. Delete the coupon
    runQuery('DELETE FROM coupons WHERE id = ?', [couponId]);
  });

  return { success: true };
}

/**
 * Admin: Get redemptions for a specific coupon.
 */
export function getCouponRedemptions(couponId) {
  return queryAll(
    `SELECT r.*, u.name as user_name, u.email as user_email, c.title as course_title
     FROM coupon_redemptions r
     JOIN users u ON r.user_id = u.id
     LEFT JOIN courses c ON r.course_id = c.id
     WHERE r.coupon_id = ?
     ORDER BY r.redeemed_at DESC`,
    [couponId]
  );
}
