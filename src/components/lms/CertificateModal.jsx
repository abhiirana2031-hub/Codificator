import React from 'react';
import { X } from 'lucide-react';
import CertificateCard from './CertificateCard';

export default function CertificateModal({
  isOpen,
  onClose,
  certificateId = 'CFWD-2026-10427',
  issuedOn = '21 OCT 2026',
  studentName = 'Abhay Rana',
  courseTitle = 'Full-Stack Web Development Course',
  studyHours = '120 Hours',
  courseDuration = '4 Weeks',
  skillLevel = 'Beginner to Intermediate',
  citation = null,
  verificationUrl = null,
  onNavigateVerify = null
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay animate-fade-in no-print"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="modal-container"
        style={{
          width: '100%',
          maxWidth: '1020px',
          background: 'transparent',
          position: 'relative',
          margin: 'auto'
        }}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '-16px',
            right: '-8px',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#0f172a',
            color: '#ffffff',
            border: '2px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            zIndex: 10,
            transition: 'transform 0.15s, background 0.15s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#1e293b'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#0f172a'; }}
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        <CertificateCard
          certificateId={certificateId}
          issuedOn={issuedOn}
          studentName={studentName}
          courseTitle={courseTitle}
          studyHours={studyHours}
          courseDuration={courseDuration}
          skillLevel={skillLevel}
          citation={citation}
          verificationUrl={verificationUrl}
          onNavigateVerify={(code) => {
            if (onClose) onClose();
            if (onNavigateVerify) onNavigateVerify(code);
          }}
          showToolbar={true}
        />
      </div>
    </div>
  );
}
