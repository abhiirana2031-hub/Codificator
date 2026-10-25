import React from 'react';
import LessonContentRenderer, { calculateReadingTime } from '../LessonContentRenderer';
import { Eye, Clock, FileText, CheckCircle2 } from 'lucide-react';

export default function MarkdownPreview({
  content = '',
  title = '',
  className = ''
}) {
  const { minutes, wordCount } = calculateReadingTime(content);

  return (
    <div className={`markdown-preview-container ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-card, #0f172a)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Preview Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--bg-secondary, #1e293b)',
        borderBottom: '1px solid var(--border-color, #334155)',
        fontSize: '12px',
        color: 'var(--text-secondary, #94a3b8)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--brand-green, #10b981)' }}>
          <Eye size={15} />
          <span>LIVE PREVIEW</span>
          {title && (
            <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: 600 }}>
              — {title}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileText size={13} /> {wordCount} words
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> ~{minutes} min read
          </span>
        </div>
      </div>

      {/* Rendered Body */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        lineHeight: 1.6
      }}>
        {content && content.trim().length > 0 ? (
          <LessonContentRenderer content={content} />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted, #64748b)',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <Eye size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ fontSize: '14px', margin: 0 }}>Start typing in the Markdown editor to see real-time preview here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
