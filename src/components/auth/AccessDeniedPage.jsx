import React from 'react';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

export default function AccessDeniedPage({ requiredRole, currentRole, onNavigate, onSignOut }) {
  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(28px, 6vw, 44px)',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <ShieldAlert size={32} />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px' }}>
          403 — Access Denied
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
          This protected portal requires <strong>{requiredRole}</strong> authorization. Your active account has the role of <strong>{currentRole || 'ANONYMOUS'}</strong>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => onNavigate && onNavigate({ view: 'home' })}
            className="btn-primary"
            style={{ padding: '11px', borderRadius: 'var(--radius-sm)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <ArrowLeft size={16} /> Return to Homepage
          </button>

          <button
            onClick={() => {
              if (onSignOut) onSignOut();
              if (onNavigate) onNavigate({ view: 'login' });
            }}
            className="btn-outline"
            style={{ padding: '11px', borderRadius: 'var(--radius-sm)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <LogIn size={16} /> Sign In with Different Account
          </button>
        </div>
      </div>
    </div>
  );
}
