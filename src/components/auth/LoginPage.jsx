import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { lmsApi } from '../../api/lmsApi';
import { loginWithFirebaseEmail, loginWithFirebaseGoogle, sendFirebasePasswordReset } from '../../config/firebase';

export default function LoginPage({
  onSuccess,
  onNavigate,
  portalType = 'STUDENT' // 'STUDENT' | 'ADMIN' | 'INSTRUCTOR'
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  // Forgot password sub-state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide your email address and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      let user = null;

      // 1. Try Firebase Authentication first if configured
      try {
        const fbRes = await loginWithFirebaseEmail(email.trim(), password);
        if (fbRes?.token) {
          const syncRes = await lmsApi.syncFirebaseUser(fbRes.token);
          user = syncRes?.user;
        }
      } catch (fbErr) {
        // Firebase login failed or user only exists in SQLite database (e.g. seeded admin)
      }

      // 2. Fall back to backend database login
      if (!user) {
        const res = await lmsApi.login(email.trim(), password);
        user = res?.user;
      }

      if (user) {
        // Enforce role barrier if logging in through restricted portals
        if (portalType === 'ADMIN' && user.role !== 'ADMIN') {
          setError(`Access denied. Account "${user.email}" does not hold administrative privileges.`);
          return;
        }
        if (portalType === 'OPERATOR' && (user.role !== 'OPERATOR' && user.role !== 'ADMIN')) {
          setError(`Access denied. Account "${user.email}" does not have course operator credentials.`);
          return;
        }
        if (portalType === 'INSTRUCTOR' && (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
          setError(`Access denied. Account "${user.email}" does not have instructor credentials.`);
          return;
        }

        if (onSuccess) onSuccess(user);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      const { user: fbUser, token } = await loginWithFirebaseGoogle();

      if (token) {
        // Synchronize authenticated Google identity with LMS database
        let resolvedUser = null;
        try {
          const syncRes = await lmsApi.syncFirebaseUser(token, {
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email?.split('@')[0],
            avatar_url: fbUser.photoURL,
            uid: fbUser.uid
          });
          resolvedUser = syncRes?.user;
        } catch (syncErr) {
          console.warn('Backend sync warning, proceeding with Firebase identity:', syncErr.message);
        }

        if (!resolvedUser) {
          resolvedUser = {
            id: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email?.split('@')[0],
            role: 'STUDENT',
            avatar_url: fbUser.photoURL || '/logo.png'
          };
        }

        // Enforce role restriction if accessed from admin/instructor portal
        if (portalType === 'ADMIN' && resolvedUser.role !== 'ADMIN') {
          setError(`Access denied. Account "${resolvedUser.email}" does not hold administrative privileges.`);
          return;
        }
        if (portalType === 'OPERATOR' && (resolvedUser.role !== 'OPERATOR' && resolvedUser.role !== 'ADMIN')) {
          setError(`Access denied. Account "${resolvedUser.email}" does not have course operator credentials.`);
          return;
        }
        if (portalType === 'INSTRUCTOR' && (resolvedUser.role !== 'INSTRUCTOR' && resolvedUser.role !== 'ADMIN')) {
          setError(`Access denied. Account "${resolvedUser.email}" does not have instructor credentials.`);
          return;
        }

        if (onSuccess) onSuccess(resolvedUser);
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled yet in Firebase Console. Please enable "Google" under Firebase Authentication > Sign-in method.');
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Please add "localhost" to Authorized domains in Firebase Console > Authentication > Settings.');
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site and try again.');
        return;
      }
      setError(err.message || 'Google sign-in could not be completed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    try {
      setForgotLoading(true);
      setError('');

      // Send Firebase password reset email if configured
      try {
        await sendFirebasePasswordReset(forgotEmail.trim());
      } catch (fbErr) {
        console.warn('Firebase reset note:', fbErr.message);
      }

      // Also trigger backend reset token generation
      const res = await lmsApi.forgotPassword(forgotEmail.trim()).catch(() => null);

      setForgotMessage('If an account is associated with this email, password reset instructions have been sent. Please check your inbox and spam folder.');
      if (res?.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetToken || !newPassword) return;
    try {
      setForgotLoading(true);
      setError('');
      const res = await lmsApi.resetPassword(resetToken, newPassword);
      setResetSuccess(res.message || 'Password reset successfully!');
      setTimeout(() => {
        setShowForgot(false);
        setForgotMessage('');
        setResetSuccess('');
        setResetToken('');
        setNewPassword('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  const portalConfig = {
    ADMIN: {
      badge: 'Protected Administrator Access',
      badgeColor: '#dc2626',
      badgeBg: 'rgba(239, 68, 68, 0.1)',
      title: 'Admin Control Center',
      subtitle: 'Authenticate to access coupon management, platform analytics, and user governance.'
    },
    INSTRUCTOR: {
      badge: 'Instructor Portal',
      badgeColor: '#4f46e5',
      badgeBg: 'rgba(79, 70, 229, 0.1)',
      title: 'Instructor Workspace',
      subtitle: 'Sign in to manage course curriculum, grade exercises, and monitor student progress.'
    },
    OPERATOR: {
      badge: 'Course Operations Console',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.1)',
      title: 'Course Operator Workspace',
      subtitle: 'Sign in to configure curriculums, sequential unlock policies, modules, and lessons.'
    },
    STUDENT: {
      badge: 'Codificator E-Learning',
      badgeColor: 'var(--brand-green)',
      badgeBg: 'var(--brand-green-light)',
      title: 'Sign In to Your Account',
      subtitle: 'Continue learning, practicing coding problems, and tracking your course progress.'
    }
  }[portalType] || {
    badge: 'Codificator',
    badgeColor: 'var(--brand-green)',
    badgeBg: 'var(--brand-green-light)',
    title: 'Sign In',
    subtitle: 'Access your learning account.'
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(24px, 5vw, 36px)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Brand Logo & Portal Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <img
              src="/logo.png"
              alt="Codificator Logo"
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: portalConfig.badgeBg,
            color: portalConfig.badgeColor,
            fontSize: '12px',
            fontWeight: '800',
            marginBottom: '10px',
            letterSpacing: '0.4px'
          }}>
            <ShieldCheck size={14} /> {portalConfig.badge}
          </div>

          <h2 style={{
            fontSize: '24px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '6px'
          }}>
            {portalConfig.title}
          </h2>

          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {portalConfig.subtitle}
          </p>
        </div>

        {/* Pending Checkout Notice */}
        {typeof window !== 'undefined' && sessionStorage.getItem('pending_checkout_course_id') && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--brand-green-light, rgba(16, 185, 129, 0.12))',
            border: '1px solid var(--brand-green, #10b981)',
            color: 'var(--brand-green, #10b981)',
            fontSize: '13px',
            fontWeight: '700',
            marginBottom: '20px'
          }}>
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Sign in to purchase this course. We will return you straight to checkout.</span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!showForgot ? (
          /* ========================================================= */
          /* STANDARD SIGN-IN FORM                                     */
          /* ========================================================= */
          <div>
            {/* Google Identity Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* Separator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '18px 0',
              color: 'var(--text-muted)',
              fontSize: '12px'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <span style={{ padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or with email</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 38px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setError(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-green)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '11px 40px 11px 38px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14.5px',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16} />
              </button>

              {portalType === 'STUDENT' && (
                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate({ view: 'signup' })}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-green)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Create one now
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : (
          /* ========================================================= */
          /* PASSWORD RECOVERY FLOW                                    */
          /* ========================================================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {forgotMessage && (
              <div style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--brand-green-light)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--brand-green)',
                fontSize: '13px',
                lineHeight: 1.5
              }}>
                {forgotMessage}
              </div>
            )}

            {resetSuccess && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--brand-green)',
                fontSize: '13px',
                fontWeight: '700'
              }}>
                <CheckCircle2 size={16} /> {resetSuccess}
              </div>
            )}

            {!resetToken ? (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Enter Account Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary"
                  style={{ padding: '11px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}
                >
                  {forgotLoading ? 'Dispatching instructions...' : 'Send Password Reset Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Reset Code / Token
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary"
                  style={{ padding: '11px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}
                >
                  {forgotLoading ? 'Updating password...' : 'Set New Password'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => { setShowForgot(false); setForgotMessage(''); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '6px'
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
