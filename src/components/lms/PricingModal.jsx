import React, { useState, useEffect } from 'react';
import { Check, Sparkles, Shield, CreditCard, ArrowRight, X, AlertCircle, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { lmsApi } from '../../api/lmsApi';
import { executeRazorpayCheckout } from '../../utils/razorpay';

export default function PricingModal({
  isOpen,
  onClose,
  courseToPurchase = null,
  onSuccess,
  currentUser = null,
  onRequireAuth
}) {
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccessMessage, setCouponSuccessMessage] = useState('');

  // Clear state when modal opens/closes or course changes
  useEffect(() => {
    if (isOpen) {
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError('');
      setCouponSuccessMessage('');
      setErrorMessage(null);
      setProcessing(false);
    }
  }, [isOpen, courseToPurchase]);

  if (!isOpen) return null;

  const course = courseToPurchase || {
    id: 'course-fullstack-web',
    title: 'Full Stack Web Development',
    category: 'Full-Stack & APIs',
    level: 'Intermediate',
    price: 249,
    originalPrice: 499,
    description: 'Master HTML5, CSS Grid, JavaScript ESNext, React 19, Node.js, Express, PostgreSQL, and verifiable certification.'
  };

  const originalPrice = Number(course.originalPrice || (course.price ? course.price * 2 : 499));
  const basePrice = Number(course.price !== undefined ? course.price : 249);
  const finalPrice = appliedCoupon ? Number(appliedCoupon.finalPrice) : basePrice;
  const isFree = finalPrice === 0 || appliedCoupon?.isFree || course.free;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setCouponLoading(true);
      setCouponError('');
      setCouponSuccessMessage('');
      const res = await lmsApi.validateCoupon(couponCode.trim().toUpperCase(), course.id);
      if (res?.valid) {
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          ...res
        });
        setCouponSuccessMessage(
          res.isFree 
            ? '100% Free Coupon Applied! Course unlocked at zero cost.' 
            : `Coupon applied! You saved ₹${res.discountAmount}.`
        );
      } else {
        setCouponError(res?.error || 'Invalid coupon code');
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError(err.message || 'Invalid or expired coupon');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setCouponSuccessMessage('');
  };

  const handleCheckout = async () => {
    // ENFORCE AUTHENTICATION BEFORE PROCEEDING TO CHECKOUT
    const token = typeof window !== 'undefined' ? localStorage.getItem('codificator_auth_token') : null;
    if (!token && !currentUser) {
      if (onRequireAuth) {
        onRequireAuth(course);
      } else {
        setErrorMessage('Please sign in to purchase or enroll in this course.');
      }
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    // Scenario D / Free Course: Zero-cost enrollment flow
    if (isFree) {
      try {
        let res;
        if (appliedCoupon?.isFree || appliedCoupon?.code) {
          res = await lmsApi.applyFreeCoupon(appliedCoupon.code, course.id);
        } else {
          res = await lmsApi.enrollCourse(course.id);
        }
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        if (onSuccess) onSuccess(res);
        onClose();
      } catch (freeErr) {
        setErrorMessage(freeErr.message || 'Failed to complete free enrollment');
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Paid Course: Server-verified Razorpay order flow
    const amountInPaise = Math.max(100, Math.round(finalPrice * 100));

    await executeRazorpayCheckout({
      amountInPaise,
      currency: 'INR',
      name: 'Codificators E-Learning',
      description: `Course Access: ${course.title}`,
      courseId: course.id,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      prefill: {
        name: currentUser?.display_name || currentUser?.name || '',
        email: currentUser?.email || '',
        contact: currentUser?.phone || ''
      },
      onSuccess: (res) => {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        if (onSuccess) onSuccess(res);
        onClose();
        setProcessing(false);
      },
      onError: (err) => {
        setErrorMessage(err.message || 'Course purchase failed. Please retry.');
        setProcessing(false);
      },
      onDismiss: () => {
        setProcessing(false);
      }
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 'clamp(12px, 3vw, 24px)'
    }}>
      <div style={{
        background: 'var(--bg-card, #111827)',
        border: '1px solid var(--border-color, #374151)',
        borderRadius: '16px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        color: 'var(--text-primary, #f9fafb)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#9ca3af',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ padding: 'clamp(24px, 4vw, 32px) clamp(20px, 4vw, 32px) 16px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--brand-green-light, rgba(16, 185, 129, 0.12))',
            border: '1px solid var(--brand-green, #10b981)',
            borderRadius: '999px',
            padding: '4px 14px',
            fontSize: '12px',
            fontWeight: '700',
            color: 'var(--brand-green, #10b981)',
            marginBottom: '12px'
          }}>
            <Sparkles size={14} /> Course Enrollment
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', lineHeight: 1.3 }}>
            {course.title}
          </h2>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: '13.5px', margin: 0, lineHeight: 1.5 }}>
            {course.description || 'Gain full lifetime access, curriculum resources, and verified completion certification.'}
          </p>

          {errorMessage && (
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13.5px'
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Course Features Checklist */}
        <div style={{
          padding: '0 clamp(20px, 4vw, 32px) 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          fontSize: '13px',
          color: 'var(--text-secondary, #d1d5db)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--brand-green, #10b981)" />
            <span>Full Lifetime Access</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--brand-green, #10b981)" />
            <span>Verifiable Certificate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--brand-green, #10b981)" />
            <span>Auto-graded Coding Exercises</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--brand-green, #10b981)" />
            <span>Study Notes & Resources</span>
          </div>
        </div>

        {/* Coupon Form */}
        <div style={{
          margin: '0 clamp(20px, 4vw, 32px) 20px',
          padding: '16px',
          borderRadius: '12px',
          background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
        }}>
          <div style={{ fontSize: '12.5px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Have a Coupon or Student Discount?
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. LEARN25, SAVE300, FREE100"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={Boolean(appliedCoupon)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #4b5563)',
                background: 'var(--bg-primary, #1f2937)',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '13px',
                letterSpacing: '0.5px',
                fontWeight: '600',
                outline: 'none'
              }}
            />
            {appliedCoupon ? (
              <button
                type="button"
                onClick={handleRemoveCoupon}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ef4444',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--brand-green, #10b981)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: (couponLoading || !couponCode.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (couponLoading || !couponCode.trim()) ? 0.6 : 1
                }}
              >
                {couponLoading ? 'Checking...' : 'Apply'}
              </button>
            )}
          </div>

          {couponSuccessMessage && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
              {couponSuccessMessage}
            </div>
          )}
          {couponError && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', fontWeight: '600' }}>
              {couponError}
            </div>
          )}
        </div>

        {/* Pricing Summary Breakdown */}
        <div style={{
          margin: '0 clamp(20px, 4vw, 32px) 24px',
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'var(--bg-secondary, rgba(255, 255, 255, 0.04))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            <span>Original Course Fee</span>
            <span style={{ textDecoration: 'line-through' }}>₹{originalPrice.toLocaleString('en-IN')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            <span>Special Course Price</span>
            <span>{basePrice === 0 ? 'Free' : `₹${basePrice.toLocaleString('en-IN')}`}</span>
          </div>

          {appliedCoupon && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', color: '#10b981', fontWeight: '600' }}>
              <span>Coupon Discount ({appliedCoupon.code})</span>
              <span>-₹{appliedCoupon.discountAmount.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            marginTop: '8px'
          }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Final Payable Amount
            </span>
            <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--brand-green, #10b981)' }}>
              {isFree ? '100% Free' : `₹${finalPrice.toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ padding: '0 clamp(20px, 4vw, 32px) 24px' }}>
          <button
            onClick={handleCheckout}
            disabled={processing}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--brand-green, #10b981)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '800',
              cursor: processing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
          >
            {processing ? (
              'Processing Enrollment...'
            ) : isFree ? (
              <>
                <Sparkles size={18} />
                Unlock Course for Free
              </>
            ) : (
              <>
                <CreditCard size={18} />
                Proceed to Pay ₹{finalPrice.toLocaleString('en-IN')}
              </>
            )}
          </button>
        </div>

        {/* Security Trust Badges */}
        <div style={{
          padding: '16px clamp(20px, 4vw, 32px)',
          borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          background: 'var(--bg-secondary, rgba(0, 0, 0, 0.2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--text-muted, #9ca3af)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#10b981" /> 256-Bit SSL Encrypted Checkout
          </div>
          <div>•</div>
          <div>Powered by Razorpay Standard</div>
          <div>•</div>
          <div>Instant Access Guarantee</div>
        </div>
      </div>
    </div>
  );
}
