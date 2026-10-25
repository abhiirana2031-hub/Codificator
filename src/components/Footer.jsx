import React from 'react';
import { Mail, ArrowRight } from 'lucide-react';

export default function Footer({ onNavigate }) {
  const navigateTo = (view, extra = {}) => {
    if (onNavigate) {
      onNavigate({ view, ...extra });
    }
  };

  return (
    <footer
      className="site-footer no-print"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '52px 0 28px 0',
        color: 'var(--text-secondary)',
        fontSize: '13.5px',
        marginTop: 'auto'
      }}
    >
      <div className="max-width-wrapper">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '36px',
          marginBottom: '44px'
        }}>
          {/* Brand & Wordmark */}
          <div style={{ gridColumn: 'span min(2, 4)' }}>
            <div
              onClick={() => navigateTo('home')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', cursor: 'pointer' }}
            >
              <img
                src="/logo.png"
                alt="Codificator Logo"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  objectFit: 'contain'
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '20px',
                fontWeight: '900',
                color: 'var(--brand-green)'
              }}>
                codificator
              </span>
            </div>

            <p style={{
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              maxWidth: '340px'
            }}>
              Master programming, sharpen your problem-solving skills, and prepare for technical interviews with structured courses and hands-on practice.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              <Mail size={14} />
              <span>support@codificator.dev</span>
            </div>
          </div>

          {/* Group 1: Learn */}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '14px'
            }}>
              Learn
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <li>
                <a onClick={() => navigateTo('courses')} style={{ cursor: 'pointer', transition: 'var(--transition)' }}>
                  All Courses
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('tutorials', { topic: 'binary-search' })} style={{ cursor: 'pointer' }}>
                  DSA Tutorials
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('tutorials', { topic: 'lru-cache-design' })} style={{ cursor: 'pointer' }}>
                  System Design Notes
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('tutorials', { topic: 'java-hashmap-internal' })} style={{ cursor: 'pointer' }}>
                  Language Fundamentals
                </a>
              </li>
            </ul>
          </div>

          {/* Group 2: Practice */}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '14px'
            }}>
              Practice
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <li>
                <a onClick={() => navigateTo('practice', { problemId: 'binary-search' })} style={{ cursor: 'pointer' }}>
                  Problem of the Day
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('practice')} style={{ cursor: 'pointer' }}>
                  Coding Arena
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('sde-sheet')} style={{ cursor: 'pointer' }}>
                  160 SDE Sheet
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('ide')} style={{ cursor: 'pointer' }}>
                  Online Cloud IDE
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('contests')} style={{ cursor: 'pointer' }}>
                  Live Contests
                </a>
              </li>
            </ul>
          </div>

          {/* Group 3: Company */}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '14px'
            }}>
              Company
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <li>
                <a onClick={() => navigateTo('home')} style={{ cursor: 'pointer' }}>
                  About Us
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('profile')} style={{ cursor: 'pointer' }}>
                  Student Community
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('instructor-dashboard')} style={{ cursor: 'pointer' }}>
                  Teach on Codificator
                </a>
              </li>
              <li>
                <a onClick={() => navigateTo('verify-certificate')} style={{ cursor: 'pointer' }}>
                  Verify Certificates
                </a>
              </li>
            </ul>
          </div>

          {/* Group 4: Legal & Support */}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '14px'
            }}>
              Legal & Support
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <li>
                <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
              </li>
              <li>
                <span style={{ cursor: 'pointer' }}>Terms of Service</span>
              </li>
              <li>
                <span style={{ cursor: 'pointer' }}>Security Standards</span>
              </li>
              <li>
                <a onClick={() => navigateTo('verify-certificate')} style={{ cursor: 'pointer' }}>
                  Credential Registry
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12.5px',
          color: 'var(--text-muted)'
        }}>
          <div>
            © 2026 Codificator Technologies. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Built for developers worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
