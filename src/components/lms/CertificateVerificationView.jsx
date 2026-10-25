import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../api/lmsApi';
import { ShieldCheck, Search, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import CertificateCard from './CertificateCard';

export default function CertificateVerificationView({ initialCode = '' }) {
  // Extract code from URL query or hash if provided
  const getInitialTargetCode = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : window.location.search);
      const urlCode = params.get('code') || params.get('id');
      if (urlCode) return urlCode.trim();
    }
    return initialCode || '';
  };

  const [code, setCode] = useState(getInitialTargetCode);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleLocationChange = () => {
      const targetCode = getInitialTargetCode();
      if (targetCode) {
        setCode(targetCode);
        handleVerify(targetCode);
      }
    };

    // Only auto-verify if a code is present in the URL
    const urlCode = getInitialTargetCode();
    if (urlCode) {
      handleLocationChange();
    }
    window.addEventListener('hashchange', handleLocationChange);
    return () => window.removeEventListener('hashchange', handleLocationChange);
  }, []);

  const handleVerify = async (codeToVerify) => {
    const target = (codeToVerify || code).trim();
    if (!target) return;
    try {
      setLoading(true);
      setError(null);
      const res = await lmsApi.verifyCertificate(target);
      setResult(res.certificate);
    } catch (err) {
      setResult(null);
      setError(err.data?.error || err.message || 'Certificate verification failed');
    } finally {
      setLoading(false);
    }
  };

  const formatIssuedDate = (dateString) => {
    if (!dateString) return '21 OCT 2026';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '21 OCT 2026';
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return '21 OCT 2026';
    }
  };

  return (
    <div className="max-width-wrapper animate-fade-in cert-verification-page" style={{ padding: 'clamp(16px, 3.5vw, 36px) clamp(10px, 2.5vw, 20px) 80px', minHeight: '85vh' }}>
      <div style={{ maxWidth: result ? '980px' : '680px', margin: '0 auto', transition: 'max-width 0.3s' }}>
        
        {/* Header (hidden during print) */}
        <div className="no-print" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#d1fae5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px'
          }}>
            <ShieldCheck size={32} />
          </div>

          <h1 style={{ fontSize: '30px', fontWeight: 900, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Codificator Credential Verification
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', maxWidth: '580px', margin: '0 auto 24px' }}>
            Verify the authenticity of digital certificates issued by Codificator. Every credential is cryptographically anchored and validated against our live registry.
          </p>

          {/* Verification Search Bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleVerify(); }}
            style={{
              display: 'flex',
              gap: '10px',
              background: 'var(--bg-card, #ffffff)',
              padding: '6px',
              borderRadius: '12px',
              border: '1px solid var(--border-color, #e2e8f0)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
              maxWidth: '560px',
              margin: '0 auto',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px', paddingLeft: '10px' }}>
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Enter Certificate Code (e.g. CFWD-2026-A1B2C3D4)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                background: '#047857',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flex: '0 0 auto'
              }}
            >
              {loading ? 'Verifying...' : 'Verify Credential'}
            </button>
          </form>
        </div>

        {/* Verification Result State */}
        {result && (
          <div className="animate-fade-in">
            {/* Authenticity Confirmation Banner (hidden in print) */}
            <div 
              className="no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '14px',
                padding: '14px 20px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={22} color="#059669" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#065f46' }}>
                    Authenticity Verified &amp; Active
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#047857' }}>
                    This credential was officially issued to <strong>{result.student_name}</strong> for <strong>{result.course_title}</strong>.
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12.5px', color: '#047857', fontWeight: 700, fontFamily: 'monospace' }}>
                Registry Code: {result.certificate_code}
              </div>
            </div>

            {/* The Authentic Certificate Canvas */}
            <CertificateCard
              certificateId={result.certificate_code || ''}
              issuedOn={formatIssuedDate(result.issue_date || result.completion_date)}
              studentName={result.student_name || ''}
              courseTitle={result.course_title || ''}
              studyHours="120 Hours"
              courseDuration="4 Weeks"
              skillLevel="Beginner to Intermediate"
              onNavigateVerify={(c) => {
                setCode(c);
                handleVerify(c);
              }}
              showToolbar={true}
            />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="no-print" style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '14px',
            padding: '24px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            textAlign: 'left',
            maxWidth: '560px',
            margin: '0 auto'
          }}>
            <XCircle size={28} color="#dc2626" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>Invalid or Unissued Credential</div>
              <div style={{ fontSize: '13px', marginTop: '2px', color: '#b91c1c' }}>{error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
