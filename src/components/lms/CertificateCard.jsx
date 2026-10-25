import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Clock, BookOpen, BarChart3, ExternalLink, Printer, Check, Copy, ShieldCheck
} from 'lucide-react';

/**
 * Authentic Instructor & Qualifier Mentor Team Signature
 */
function SignatureSvg() {
  return (
    <div className="cert-signature-wrapper" style={{ position: 'relative', height: '52px', display: 'flex', alignItems: 'center' }}>
      <img
        src="/signature.png"
        alt="Qualifier Mentor Team Signature"
        className="cert-signature-img"
        style={{
          height: '52px',
          width: 'auto',
          maxWidth: '170px',
          objectFit: 'contain',
          filter: 'contrast(1.15) brightness(0.95)',
          display: 'block'
        }}
        onError={(e) => {
          e.currentTarget.src = '/signature_raw.jpg';
        }}
      />
    </div>
  );
}

/**
 * High-Resolution Vector Codificator Emblem
 */
function CodificatorEmblem({ size = 160, opacity = 1 }) {
  return (
    <svg 
      className="cert-emblem-svg" 
      width={size} 
      height={size * 0.95} 
      viewBox="0 0 200 190" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      style={{ opacity, maxWidth: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <linearGradient id="capGrad" x1="20" y1="20" x2="180" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="ribbonGrad" x1="40" y1="50" x2="160" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
      {/* Graduation Cap */}
      <path
        d="M100 18L186 52L100 86L14 52L100 18Z"
        fill="url(#capGrad)"
      />
      <path
        d="M186 52V82M186 82L178 86M186 82L194 86"
        stroke="#059669"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Ribbon C Arc */}
      <path
        d="M148 76C135 64 118 58 98 58C58 58 28 88 28 128C28 168 58 194 98 194C120 194 140 184 154 168C160 160 164 148 164 136H124C124 142 120 148 114 152C108 156 102 158 96 158C78 158 64 144 64 126C64 108 78 94 96 94C106 94 114 98 120 104L148 76Z"
        fill="url(#ribbonGrad)"
      />
      {/* Code bracket symbol </> */}
      <path
        d="M80 120L68 128L80 136M112 120L124 128L112 136M102 114L90 142"
        stroke="#047857"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Fallback SVG QR Code
 */
function FallbackQrSvg({ size = 58 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="29" height="29" fill="white" />
      {/* Corner 1 */}
      <rect x="2" y="2" width="7" height="7" stroke="#0f172a" strokeWidth="2" fill="none" />
      <rect x="4" y="4" width="3" height="3" fill="#0f172a" />
      {/* Corner 2 */}
      <rect x="20" y="2" width="7" height="7" stroke="#0f172a" strokeWidth="2" fill="none" />
      <rect x="22" y="4" width="3" height="3" fill="#0f172a" />
      {/* Corner 3 */}
      <rect x="2" y="20" width="7" height="7" stroke="#0f172a" strokeWidth="2" fill="none" />
      <rect x="4" y="22" width="3" height="3" fill="#0f172a" />
      {/* Matrix elements */}
      <rect x="11" y="2" width="2" height="2" fill="#0f172a" />
      <rect x="15" y="2" width="2" height="2" fill="#0f172a" />
      <rect x="11" y="6" width="2" height="2" fill="#0f172a" />
      <rect x="11" y="11" width="3" height="3" fill="#10b981" />
      <rect x="16" y="11" width="2" height="2" fill="#0f172a" />
      <rect x="2" y="11" width="2" height="2" fill="#0f172a" />
      <rect x="6" y="11" width="2" height="2" fill="#0f172a" />
      <rect x="20" y="11" width="3" height="2" fill="#0f172a" />
      <rect x="25" y="11" width="2" height="2" fill="#0f172a" />
      <rect x="11" y="16" width="2" height="2" fill="#0f172a" />
      <rect x="15" y="15" width="3" height="3" fill="#0f172a" />
      <rect x="20" y="16" width="2" height="2" fill="#0f172a" />
      <rect x="24" y="16" width="3" height="2" fill="#0f172a" />
      <rect x="11" y="20" width="2" height="3" fill="#0f172a" />
      <rect x="15" y="22" width="2" height="2" fill="#0f172a" />
      <rect x="20" y="20" width="2" height="2" fill="#0f172a" />
      <rect x="24" y="22" width="2" height="2" fill="#0f172a" />
      <rect x="11" y="25" width="3" height="2" fill="#0f172a" />
      <rect x="16" y="25" width="2" height="2" fill="#0f172a" />
      <rect x="20" y="25" width="4" height="2" fill="#0f172a" />
    </svg>
  );
}

export default function CertificateCard({
  certificateId = 'CFWD-2026-10427',
  issuedOn = '21 OCT 2026',
  studentName = 'Abhay Rana',
  courseTitle = 'Full-Stack Web Development Course',
  studyHours = '120 Hours',
  courseDuration = '4 Weeks',
  skillLevel = 'Beginner to Intermediate',
  citation = null,
  verificationUrl = null,
  onNavigateVerify = null,
  showToolbar = true
}) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Determine local LAN IP or origin so phones scanning on the same Wi-Fi can open it directly!
  const getScannableUrl = () => {
    if (verificationUrl) return verificationUrl;
    if (typeof window === 'undefined') return `https://www.codificator.org/#verify-certificate?code=${certificateId}`;
    
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    
    // When testing on localhost or 127.0.0.1, use LAN IP 10.207.156.120 so mobile phone cameras can open it
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://10.207.156.120:${window.location.port || '5173'}/#verify-certificate?code=${certificateId}`;
    }
    return `${protocol}//${window.location.host}/#verify-certificate?code=${certificateId}`;
  };

  const effectiveVerificationUrl = getScannableUrl();
  const directBrowserUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://www.codificator.org'}/#verify-certificate?code=${certificateId}`;
  const displayVerificationHost = 'codificator.org/verify';

  // Generate crisp client-side QR Code via 'qrcode'
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(effectiveVerificationUrl, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(url => {
      if (active) setQrDataUrl(url);
    }).catch(err => {
      console.warn('QR generation error:', err);
    });
    return () => { active = false; };
  }, [effectiveVerificationUrl]);

  const defaultCitation = citation || (
    <>
      for successfully completing the <strong style={{ color: '#047857', fontWeight: 800 }}>{courseTitle}</strong> on Codificator, a four-week learning program covering HTML, CSS, JavaScript, React, Node.js, Express.js and PostgreSQL.
    </>
  );

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(effectiveVerificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handlePrint = () => {
    const originalTitle = typeof document !== 'undefined' ? document.title : '';
    const cleanStudent = (studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanId = (certificateId || 'ID').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (typeof document !== 'undefined') {
      document.title = `Codificator_Certificate_${cleanStudent}_${cleanId}`;
    }
    window.print();
    setTimeout(() => {
      if (typeof document !== 'undefined') {
        document.title = originalTitle;
      }
    }, 1500);
  };

  const handleVerifyClick = (e) => {
    e.preventDefault();
    if (onNavigateVerify) {
      onNavigateVerify(certificateId);
    } else if (typeof window !== 'undefined') {
      window.location.hash = `verify-certificate?code=${certificateId}`;
    }
  };

  return (
    <div className="certificate-container" style={{ width: '100%', maxWidth: '980px', margin: '0 auto' }}>
      {/* Top Action Toolbar (hidden during print) */}
      {showToolbar && (
        <div 
          className="certificate-toolbar no-print" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '12px',
            marginBottom: '16px',
            padding: '10px 16px',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '4px 10px', 
              borderRadius: '20px', 
              background: '#dcfce7', 
              color: '#16a34a', 
              fontSize: '12.5px', 
              fontWeight: 800 
            }}>
              <ShieldCheck size={14} /> Official Verified Credential
            </span>
            <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>
              {certificateId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: copied ? '#ecfdf5' : '#f8fafc',
                color: copied ? '#059669' : '#334155',
                border: copied ? '1px solid #10b981' : '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title="Copy public verification link"
            >
              {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              {copied ? 'Link Copied!' : 'Copy Verification Link'}
            </button>

            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#047857',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(4,120,87,0.3)',
                transition: 'all 0.2s'
              }}
              title="Print or Save as high-resolution PDF"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          THE CERTIFICATE CANVAS (Pixel-Perfect Match with Provided Reference)
      ========================================================================= */}
      <div
        id="printable-certificate"
        className="certificate-card"
        style={{
          width: '100%',
          aspectRatio: '1.55 / 1',
          minHeight: 'clamp(210px, 58vw, 580px)',
          background: '#ffffff',
          borderRadius: '26px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(16, 185, 129, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          padding: 'clamp(14px, 3.8vw, 44px) clamp(16px, 4.2vw, 52px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          color: '#0f172a',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
      >
        {/* Soft Ambient Mint Wave Glows on the Right Background */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '65%',
            height: '120%',
            background: 'radial-gradient(ellipse at 75% 45%, rgba(16, 185, 129, 0.09) 0%, rgba(20, 184, 166, 0.05) 45%, rgba(255, 255, 255, 0) 75%)',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        {/* Right Watermark Emblem Graphic */}
        <div
          className="cert-emblem-wrapper"
          style={{
            position: 'absolute',
            right: 'clamp(24px, 4.5vw, 56px)',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 1,
            userSelect: 'none'
          }}
        >
          <div className="cert-emblem-drop" style={{ filter: 'drop-shadow(0 8px 24px rgba(16, 185, 129, 0.12))' }}>
            <CodificatorEmblem size={200} opacity={0.92} />
          </div>

          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <div className="cert-emblem-text" style={{
              color: '#475569',
              fontSize: '10.5px',
              fontWeight: 800,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              lineHeight: 1.5
            }}>
              SKILLS FOR A<br />BETTER TOMORROW
            </div>
            <div className="cert-emblem-bar" style={{
              width: '28px',
              height: '3px',
              background: '#10b981',
              borderRadius: '999px',
              margin: '8px auto 0'
            }} />
          </div>
        </div>

        {/* =====================================================================
            TOP SECTION: LOGO + CERTIFICATE ID & DATE
        ===================================================================== */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Brand Logo & Tagline */}
          <div className="cert-brand-block" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/logo.png"
              alt="Codificator"
              className="cert-logo-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
              style={{
                width: '46px',
                height: '46px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.06))'
              }}
            />
            <div>
              <div className="cert-brand-name" style={{
                fontSize: '25px',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '1px'
              }}>
                <span>CODIFIC</span>
                <span style={{ 
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  ATOR
                </span>
              </div>
              <div className="cert-brand-tagline" style={{
                fontSize: '8.5px',
                fontWeight: 800,
                color: '#64748b',
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                marginTop: '5px'
              }}>
                LEARN &nbsp;•&nbsp; PRACTICE &nbsp;•&nbsp; BUILD &nbsp;•&nbsp; GROW
              </div>
            </div>
          </div>

          {/* Metadata Block: Certificate ID & Issued On */}
          <div className="cert-meta-block" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            textAlign: 'left'
          }}>
            <div>
              <div className="cert-meta-label" style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '0.12em',
                textTransform: 'uppercase'
              }}>
                CERTIFICATE ID
              </div>
              <div className="cert-meta-val" style={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '0.02em',
                fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                marginTop: '2px'
              }}>
                {certificateId}
              </div>
            </div>

            <div className="cert-meta-divider" style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />

            <div>
              <div className="cert-meta-label" style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '0.12em',
                textTransform: 'uppercase'
              }}>
                ISSUED ON
              </div>
              <div className="cert-meta-val" style={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                marginTop: '2px'
              }}>
                {issuedOn}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            MIDDLE SECTION: TITLE, RECIPIENT, CITATION & STATS
        ===================================================================== */}
        <div className="cert-middle-section" style={{ position: 'relative', zIndex: 2, margin: '22px 0 16px' }}>
          {/* Header Title */}
          <div className="cert-sub-title" style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#64748b',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginBottom: '3px'
          }}>
            CERTIFICATE OF
          </div>
          <div className="cert-main-title" style={{
            fontSize: 'clamp(36px, 5.2vw, 48px)',
            fontWeight: 900,
            letterSpacing: '-0.025em',
            lineHeight: 1,
            color: '#0f172a',
            marginBottom: '10px'
          }}>
            COMPLETION
          </div>

          <div className="cert-pres-title" style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#94a3b8',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginBottom: '6px'
          }}>
            PROUDLY PRESENTED TO
          </div>

          {/* Recipient Full Name */}
          <div className="cert-student-name" style={{
            fontSize: 'clamp(32px, 4.6vw, 44px)',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            {studentName}
          </div>

          {/* Sleek Underline Accent Bar (Left 25% emerald green, Right 75% soft slate) */}
          <div className="cert-accent-bar" style={{
            display: 'flex',
            width: 'clamp(280px, 46%, 420px)',
            height: '3px',
            borderRadius: '999px',
            marginTop: '8px',
            marginBottom: '14px',
            overflow: 'hidden'
          }}>
            <div style={{ width: '25%', height: '100%', background: '#10b981' }} />
            <div style={{ width: '75%', height: '100%', background: '#e2e8f0' }} />
          </div>

          {/* Description / Citation Text */}
          <p className="cert-citation" style={{
            color: '#475569',
            fontSize: '13.5px',
            lineHeight: 1.55,
            maxWidth: '560px',
            margin: 0
          }}>
            {defaultCitation}
          </p>

          {/* Three Metric Feature Badges */}
          <div className="cert-metrics-row" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0',
            marginTop: '22px',
            flexWrap: 'wrap'
          }}>
            {/* 1. Study Hours */}
            <div className="cert-metric-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '20px' }}>
              <div className="cert-metric-icon" style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Clock size={18} strokeWidth={2.4} />
              </div>
              <div>
                <div className="cert-metric-label" style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: '#94a3b8',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  STUDY HOURS
                </div>
                <div className="cert-metric-val" style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  {studyHours}
                </div>
              </div>
            </div>

            <div className="cert-metric-divider" style={{ width: '1px', height: '32px', background: '#e2e8f0', marginRight: '20px' }} />

            {/* 2. Course Duration */}
            <div className="cert-metric-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '20px' }}>
              <div className="cert-metric-icon" style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <BookOpen size={18} strokeWidth={2.4} />
              </div>
              <div>
                <div className="cert-metric-label" style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: '#94a3b8',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  COURSE DURATION
                </div>
                <div className="cert-metric-val" style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  {courseDuration}
                </div>
              </div>
            </div>

            <div className="cert-metric-divider" style={{ width: '1px', height: '32px', background: '#e2e8f0', marginRight: '20px' }} />

            {/* 3. Skill Level */}
            <div className="cert-metric-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="cert-metric-icon" style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <BarChart3 size={18} strokeWidth={2.4} />
              </div>
              <div>
                <div className="cert-metric-label" style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: '#94a3b8',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  SKILL LEVEL
                </div>
                <div className="cert-metric-val" style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  {skillLevel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            BOTTOM SECTION: SIGNATURE & VERIFIABLE QR CODE
        ===================================================================== */}
        <div className="cert-bottom-section" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          position: 'relative',
          zIndex: 2,
          paddingTop: '8px'
        }}>
          {/* Left: Signature Block */}
          <div className="cert-signature-block" style={{ textAlign: 'left' }}>
            <SignatureSvg />
            <div className="cert-sign-name" style={{
              fontSize: '13.5px',
              fontWeight: 800,
              color: '#0f172a',
              marginTop: '4px'
            }}>
              Qualifier Mentor Team
            </div>
            <div className="cert-sign-role" style={{
              fontSize: '9.5px',
              fontWeight: 800,
              color: '#94a3b8',
              letterSpacing: '0.14em',
              textTransform: 'uppercase'
            }}>
              INSTRUCTOR &amp; ACADEMIC QUALIFIER
            </div>
          </div>

          {/* Right: Verifiable QR Code & Direct Link */}
          <div className="cert-qr-block" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left'
          }}>
            {/* Live QR Code Box */}
            <a
              className="cert-qr-box"
              href={directBrowserUrl}
              onClick={handleVerifyClick}
              title={`Scan with phone or click to verify ${certificateId}`}
              style={{
                display: 'block',
                width: '64px',
                height: '64px',
                padding: '3px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                flexShrink: 0
              }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code to verify ${certificateId}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: '4px',
                    display: 'block'
                  }}
                />
              ) : (
                <FallbackQrSvg size={56} />
              )}
            </a>

            <div className="cert-qr-info">
              <div className="cert-qr-title" style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.2
              }}>
                Verify Certificate
              </div>
              <a
                className="cert-qr-link"
                href={effectiveVerificationUrl}
                onClick={handleVerifyClick}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#047857',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  marginTop: '2px'
                }}
              >
                <span>{displayVerificationHost}</span>
                <ExternalLink size={11} strokeWidth={2.4} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Screen Styles & Global Print Media Styles */}
      <style>{`
        /* =========================================================================
           1. RESPONSIVE MOBILE SCREEN STYLES (Small, True Landscape, No Overlapping)
        ========================================================================= */
        @media screen and (max-width: 768px) {
          .certificate-card {
            min-height: 0 !important;
            aspect-ratio: 1.55 / 1 !important;
            padding: clamp(10px, 3.2vw, 22px) clamp(12px, 3.8vw, 26px) !important;
            border-radius: 14px !important;
            box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.1) !important;
          }

          /* Emblem on the right: neatly scaled and positioned to prevent any overlap */
          .cert-emblem-wrapper {
            width: clamp(70px, 20vw, 115px) !important;
            right: clamp(8px, 2.2vw, 18px) !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            opacity: 0.9 !important;
          }
          .cert-emblem-svg {
            width: 100% !important;
            height: auto !important;
          }
          .cert-emblem-text {
            font-size: clamp(6px, 1.5vw, 8.5px) !important;
            letter-spacing: 0.15em !important;
            margin-top: 4px !important;
            line-height: 1.3 !important;
          }
          .cert-emblem-bar {
            width: 16px !important;
            height: 2px !important;
            margin: 3px auto 0 !important;
          }

          /* Brand Logo & Wordmark */
          .cert-logo-img {
            width: clamp(24px, 5.5vw, 36px) !important;
            height: auto !important;
          }
          .cert-brand-block {
            gap: clamp(6px, 1.8vw, 12px) !important;
          }
          .cert-brand-name {
            font-size: clamp(13px, 3.5vw, 20px) !important;
          }
          .cert-brand-tagline {
            font-size: clamp(5px, 1.3vw, 7.5px) !important;
            letter-spacing: 0.14em !important;
            margin-top: 2px !important;
          }

          /* Top Metadata: Certificate ID & Date */
          .cert-meta-block {
            gap: clamp(8px, 2.2vw, 16px) !important;
          }
          .cert-meta-label {
            font-size: clamp(6.5px, 1.6vw, 9px) !important;
          }
          .cert-meta-val {
            font-size: clamp(8.5px, 2.2vw, 12px) !important;
            margin-top: 1px !important;
          }
          .cert-meta-divider {
            height: clamp(16px, 4vw, 28px) !important;
          }

          /* Middle Text Section: Constrained to 65% width to avoid right emblem */
          .cert-middle-section {
            margin: clamp(6px, 1.5vw, 14px) 0 !important;
            max-width: 66% !important;
          }
          .cert-sub-title {
            font-size: clamp(6.5px, 1.6vw, 9px) !important;
            margin-bottom: 1px !important;
          }
          .cert-main-title {
            font-size: clamp(15px, 4.2vw, 28px) !important;
            margin-bottom: clamp(2px, 0.8vw, 6px) !important;
          }
          .cert-pres-title {
            font-size: clamp(6px, 1.4vw, 8px) !important;
            margin-bottom: 2px !important;
          }
          .cert-student-name {
            font-size: clamp(14px, 3.8vw, 24px) !important;
            line-height: 1.1 !important;
          }
          .cert-accent-bar {
            width: clamp(100px, 30vw, 200px) !important;
            height: 2px !important;
            margin: clamp(2px, 0.6vw, 5px) 0 clamp(3px, 0.8vw, 7px) !important;
          }
          .cert-citation {
            font-size: clamp(7.5px, 1.8vw, 10.5px) !important;
            line-height: 1.35 !important;
            max-width: 100% !important;
          }

          /* Metric Badges Row: Fits cleanly on single line */
          .cert-metrics-row {
            margin-top: clamp(6px, 1.4vw, 12px) !important;
            gap: clamp(4px, 1.2vw, 10px) !important;
            flex-wrap: nowrap !important;
          }
          .cert-metric-item {
            gap: clamp(4px, 1vw, 8px) !important;
            padding-right: 0 !important;
          }
          .cert-metric-icon {
            width: clamp(18px, 4.2vw, 28px) !important;
            height: clamp(18px, 4.2vw, 28px) !important;
          }
          .cert-metric-icon svg {
            width: clamp(9px, 2.2vw, 14px) !important;
            height: clamp(9px, 2.2vw, 14px) !important;
          }
          .cert-metric-label {
            font-size: clamp(5px, 1.2vw, 7px) !important;
            letter-spacing: 0.04em !important;
          }
          .cert-metric-val {
            font-size: clamp(7.5px, 1.8vw, 11px) !important;
          }
          .cert-metric-divider {
            height: clamp(14px, 3.5vw, 22px) !important;
            margin-right: clamp(4px, 1vw, 10px) !important;
          }

          /* Bottom Section: Signature & QR Code */
          .cert-bottom-section {
            padding-top: clamp(2px, 0.6vw, 6px) !important;
          }
          .cert-signature-wrapper {
            height: clamp(22px, 5.2vw, 36px) !important;
          }
          .cert-signature-img {
            height: clamp(22px, 5.2vw, 36px) !important;
            max-width: clamp(70px, 18vw, 120px) !important;
          }
          .cert-sign-name {
            font-size: clamp(7.5px, 1.8vw, 11px) !important;
            margin-top: 1px !important;
          }
          .cert-sign-role {
            font-size: clamp(5px, 1.2vw, 7px) !important;
            letter-spacing: 0.08em !important;
          }
          .cert-qr-block {
            gap: clamp(5px, 1.4vw, 10px) !important;
          }
          .cert-qr-box {
            width: clamp(32px, 8vw, 48px) !important;
            height: clamp(32px, 8vw, 48px) !important;
            padding: 2px !important;
          }
          .cert-qr-title {
            font-size: clamp(7.5px, 1.8vw, 11px) !important;
          }
          .cert-qr-link {
            font-size: clamp(6.5px, 1.5vw, 9px) !important;
          }
        }

        /* =========================================================================
           2. GLOBAL PRINT MEDIA STYLES (Single Page Landscape Guarantee on All Devices)
        ========================================================================= */
        @page {
          size: landscape;
          margin: 5mm;
        }

        @media print {
          /* 1. Reset root to standard 100% single page dimensions */
          html, body {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* 2. Completely suppress DRM watermark pseudo-elements */
          body::after,
          body::before,
          html::after,
          html::before {
            display: none !important;
            content: none !important;
          }

          /* 3. Hide all non-certificate page chrome and UI */
          body * {
            visibility: hidden;
          }

          .no-print,
          .no-print *,
          header,
          nav,
          footer,
          .navbar,
          .main-navbar,
          .sub-header,
          .sub-header-bar,
          .site-footer,
          .certificate-toolbar {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }

          /* 4. Disable animations & transitions in print */
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
          }

          /* 5. Flatten all ancestor containers so they occupy zero extra space */
          #root,
          .app-container,
          .max-width-wrapper,
          .cert-verification-page,
          .certificate-container,
          .modal-overlay,
          .modal-container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            min-height: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            transform: none !important;
            filter: none !important;
            position: static !important;
          }

          /* 6. Make certificate canvas and all contents visible */
          #printable-certificate,
          #printable-certificate * {
            visibility: visible !important;
          }

          /* 7. Centered, scaled landscape certificate: fits on 1 single sheet on desktop and mobile */
          #printable-certificate {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin: auto !important;

            /* Proportionally sized with safe buffer so nothing touches edges or overflows */
            width: 94% !important;
            max-width: 94% !important;
            height: auto !important;
            max-height: 92% !important;
            aspect-ratio: 1.55 / 1 !important;
            min-height: 0 !important;

            box-sizing: border-box !important;
            padding: 22px 32px !important;
            border-radius: 6px !important;
            background: #ffffff !important;
            z-index: 999999 !important;

            /* Contained double border */
            border: 6px solid #047857 !important;
            box-shadow: inset 0 0 0 2px #ffffff, inset 0 0 0 4px #10b981 !important;
            outline: none !important;

            display: flex !important;
            flex-direction: column !important;
            justifyContent: space-between !important;
            overflow: hidden !important;

            /* Strict single-sheet pagination controls */
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;

            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 8. Emblem watermark in print: transparent vector without white bounding box */
          .cert-emblem-wrapper,
          .cert-emblem-drop {
            filter: none !important;
            box-shadow: none !important;
          }
          .cert-emblem-wrapper {
            right: 28px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 140px !important;
          }
          .cert-emblem-svg {
            width: 100% !important;
            height: auto !important;
          }

          /* 9. Balanced print typography */
          .cert-middle-section {
            margin: 8px 0 6px !important;
            max-width: 66% !important;
          }
          .cert-main-title {
            font-size: 28px !important;
            margin-bottom: 4px !important;
          }
          .cert-student-name {
            font-size: 26px !important;
          }
          .cert-citation {
            font-size: 11.5px !important;
            line-height: 1.4 !important;
            max-width: 520px !important;
          }
          .cert-metrics-row {
            margin-top: 10px !important;
          }
          .cert-bottom-section {
            padding-top: 4px !important;
          }
        }
      `}</style>
    </div>
  );
}
