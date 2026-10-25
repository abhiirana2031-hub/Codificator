import React, { useState } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, AlertCircle, ArrowRight, RefreshCw, Zap, Lock, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';
import { executeRazorpayCheckout } from '../utils/razorpay';
import PricingModal from './lms/PricingModal';

export default function PaymentDemoView({ onNavigate, currentUser = null }) {
  const [amountInRupees, setAmountInRupees] = useState(1);
  const [customerName, setCustomerName] = useState(currentUser?.name || currentUser?.display_name || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [description, setDescription] = useState('Gateway Test Transaction');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastPaymentResult, setLastPaymentResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const handlePay = async (amountRupees, itemDesc, courseId = null, planId = null) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setLastPaymentResult(null);

    const amountInPaise = Math.max(100, Math.round(Number(amountRupees) * 100));

    await executeRazorpayCheckout({
      amountInPaise,
      currency: 'INR',
      name: 'Codificators LMS',
      description: itemDesc || description,
      courseId,
      planId,
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone
      },
      onSuccess: (res) => {
        setIsProcessing(false);
        setLastPaymentResult(res);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      },
      onError: (err) => {
        setIsProcessing(false);
        setErrorMessage(err.message || 'Payment execution failed');
      },
      onDismiss: () => {
        setIsProcessing(false);
      }
    });
  };

  return (
    <div className="max-width-wrapper animate-fade-in" style={{ padding: '36px 0 80px 0', minHeight: '85vh' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.2) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: 'var(--brand-green)',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '12.5px',
              fontWeight: '700',
              marginBottom: '12px'
            }}>
              <ShieldCheck size={15} /> Razorpay Standard Web Checkout SDK
            </div>
            <h1 style={{ fontSize: '30px', fontWeight: '900', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
              Razorpay Payment Gateway Demo Page
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '640px', margin: 0, lineHeight: 1.5 }}>
              Test end-to-end Razorpay Standard Web Checkout. Creating orders via backend <code>/api/create-order</code>, 
              launching the checkout modal, and verifying cryptographic HMAC-SHA256 signatures via <code>/api/verify-payment</code>.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '16px 20px',
            borderRadius: '12px',
            fontSize: '13px'
          }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Active Credentials:</div>
            <div style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--brand-green)' }}>
              KEY_ID: rzp_test_Tr4HO9ZhQ39PuN
            </div>
            <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
              Mode: <strong>Test Mode</strong> (Use Razorpay Test Cards/UPI/NetBanking)
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div style={{
          padding: '14px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '10px',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid: Demo Payment Options */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Quick Test Option 1: 100 Paise / 1 INR */}
        <div style={{
          background: 'var(--bg-card)',
          border: '2px solid var(--brand-green)',
          borderRadius: '14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          <span style={{
            position: 'absolute',
            top: '-10px',
            right: '20px',
            background: 'var(--brand-green)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: '800',
            padding: '2px 10px',
            borderRadius: '999px',
            textTransform: 'uppercase'
          }}>
            Instant Test
          </span>

          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>₹1 (100 Paise) Test Order</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '16px' }}>
              Minimum valid Razorpay order amount (100 paise). Perfect for immediate end-to-end verification.
            </p>
            <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--brand-green)', marginBottom: '16px' }}>
              ₹1.00 <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '400' }}>(100 paise)</span>
            </div>
          </div>

          <button
            onClick={() => handlePay(1, '₹1 Razorpay Standard Checkout Test Order')}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--brand-green)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <CreditCard size={16} />
            {isProcessing ? 'Processing Checkout...' : 'Pay ₹1 with Razorpay'}
          </button>
        </div>

        {/* Option 2: Full Course Pass */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Course Lifetime Pass</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '16px' }}>
              Full Stack Web Development lifetime enrollment with verified certificate issuance.
            </p>
            <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '16px' }}>
              ₹499.00
            </div>
          </div>

          <button
            onClick={() => handlePay(499, 'Full Stack Web Development Lifetime Pass', 'course-fullstack-web')}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <CreditCard size={16} />
            {isProcessing ? 'Processing Checkout...' : 'Buy Course Pass (₹499)'}
          </button>
        </div>

        {/* Option 3: Pro Annual Subscription */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Pro Annual Subscription</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '16px' }}>
              Unlimited access to all courses, sandboxes, and portfolio project reviews for 365 days.
            </p>
            <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '16px' }}>
              ₹2,499.00 <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '400' }}>/ year</span>
            </div>
          </div>

          <button
            onClick={() => handlePay(2499, 'Codificators Pro Annual Membership', null, 'PRO_ANNUAL')}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#7c3aed',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Zap size={16} />
            {isProcessing ? 'Processing Checkout...' : 'Subscribe to Pro (₹2,499)'}
          </button>
        </div>
      </div>

      {/* Custom Amount Form Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={20} color="var(--brand-green)" /> Custom Amount Checkout Form
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Amount (INR ₹)
            </label>
            <input
              type="number"
              min="1"
              value={amountInRupees}
              onChange={(e) => setAmountInRupees(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontWeight: '700'
              }}
            />
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              = {Math.round(Number(amountInRupees || 0) * 100)} paise (minimum 100 paise)
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Customer Email
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Customer Phone
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <button
          onClick={() => handlePay(amountInRupees, description)}
          disabled={isProcessing || !amountInRupees || Number(amountInRupees) < 1}
          style={{
            padding: '12px 28px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--brand-green)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '700',
            cursor: (isProcessing || !amountInRupees || Number(amountInRupees) < 1) ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CreditCard size={18} />
          {isProcessing ? 'Launching Razorpay Checkout...' : `Pay ₹${amountInRupees} with Razorpay`}
        </button>
      </div>

      {/* Payment Response Inspector */}
      {lastPaymentResult && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '2px solid #10b981',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--brand-green)', marginBottom: '12px' }}>
            <CheckCircle2 size={24} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              Razorpay Payment Verified Successfully!
            </h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 16px 0' }}>
            The payment signature was generated by Razorpay and cryptographically validated via HMAC-SHA256 on the backend server.
          </p>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '10px',
            fontFamily: 'monospace',
            fontSize: '13px',
            overflowX: 'auto',
            border: '1px solid var(--border-color)'
          }}>
            <pre style={{ margin: 0 }}>
              {JSON.stringify(lastPaymentResult, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '20px',
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Explore SaaS Tiers or View Transaction Statement:
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsPricingModalOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--brand-green)',
              background: 'transparent',
              color: 'var(--brand-green)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={14} /> Open Full SaaS Pricing Modal
          </button>

          <a
            href="#profile"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('profile');
              }
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'var(--brand-green)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Billing & Invoices History <ArrowRight size={14} />
          </a>
        </div>
      </div>

      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />
    </div>
  );
}
