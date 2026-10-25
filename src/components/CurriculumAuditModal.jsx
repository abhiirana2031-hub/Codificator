import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, FileCheck, CheckCircle2, Clock, BookOpen, ExternalLink, Scale, Sparkles } from 'lucide-react';
import { generateCurriculumAuditReport } from '../data/curriculum/auditReport';
import { verifiedLicenses } from '../data/curriculum/licenseRegistry';

export default function CurriculumAuditModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('coverage'); // 'coverage' | 'licenses'
  if (!isOpen) return null;

  const report = generateCurriculumAuditReport();

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        className="animate-fade-in"
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Scale size={20} color="var(--primary-color)" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Curriculum Coverage & OER Provenance Audit Report
              </h2>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Independent curriculum verification across all 13 foundational computer science disciplines.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS & METRIC SUMMARY */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('coverage')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                background: activeTab === 'coverage' ? 'var(--primary-color)' : 'var(--bg-secondary)',
                color: activeTab === 'coverage' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              13-Domain Coverage Report
            </button>
            <button
              onClick={() => setActiveTab('licenses')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                background: activeTab === 'licenses' ? 'var(--primary-color)' : 'var(--bg-secondary)',
                color: activeTab === 'licenses' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Verified License Registry ({Object.keys(verifiedLicenses).length})
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            <span style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              Total Disciplines: <strong>{report.totalDomains}</strong>
            </span>
            <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
              Verified Lessons: <strong>{report.totalVerifiedLessons}</strong>
            </span>
            <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
              AI-Assisted: <strong>{report.totalAiAssistedLessons}</strong>
            </span>
          </div>
        </div>

        {/* MODAL CONTENT BODY */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'coverage' && (
            <div>
              <div style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <ShieldCheck size={20} color="#16a34a" />
                <div>
                  <strong>Academic Honesty & Transparency Policy:</strong> Lessons currently in editorial authoring are explicitly reported as <em>Planned</em>. Codificator never falsely reports missing material as completed.
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 14px' }}>#</th>
                    <th style={{ padding: '10px 14px' }}>Domain Curriculum</th>
                    <th style={{ padding: '10px 14px' }}>Category</th>
                    <th style={{ padding: '10px 14px' }}>Authored Lessons</th>
                    <th style={{ padding: '10px 14px' }}>Review Status</th>
                    <th style={{ padding: '10px 14px' }}>Completeness</th>
                  </tr>
                </thead>
                <tbody>
                  {report.domainAudits.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        All curriculum domains and courses have been cleared (0 active courses).
                      </td>
                    </tr>
                  ) : (
                    report.domainAudits.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {item.courseId}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{item.category}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontWeight: 700,
                          color: item.authoredLessons > 0 ? 'var(--primary-color)' : 'var(--text-muted)'
                        }}>
                          {item.authoredLessons} {item.authoredLessons === 1 ? 'Lesson' : 'Lessons'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {item.status === 'Production Verified' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: '11.5px', fontWeight: 700 }}>
                            <CheckCircle2 size={13} /> Verified OER
                          </span>
                        ) : item.status === 'In Review / Hybrid' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: '11.5px', fontWeight: 700 }}>
                            <Sparkles size={13} /> AI-Assisted (Review)
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: '11.5px', fontWeight: 600 }}>
                            <Clock size={13} /> Syllabus Planned
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: item.authoredLessons > 0 ? '100%' : '0%',
                              height: '100%',
                              background: item.status === 'Production Verified' ? '#16a34a' : 'var(--primary-color)'
                            }} />
                          </div>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{item.completionRate}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'licenses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Codificator strictly adheres to open intellectual property standards. Below are the verified licenses and academic provenance records for all imported core materials:
              </div>

              {Object.values(verifiedLicenses).map((lic) => (
                <div
                  key={lic.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {lic.name}
                    </h4>
                    <span style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--primary-color)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {lic.type}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <strong>Author / Publisher:</strong> {lic.author}
                  </div>

                  <div style={{
                    fontSize: '12.5px',
                    background: 'var(--bg-secondary)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--primary-color)',
                    fontFamily: 'monospace'
                  }}>
                    {lic.attributionText}
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      Commercial Use Permitted: {lic.commercialUsePermitted ? 'Yes' : 'Educational Only'}
                    </span>
                    <a
                      href={lic.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--primary-color)',
                        textDecoration: 'none',
                        fontWeight: 600
                      }}
                    >
                      Upstream Source <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-secondary)'
        }}>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '8px 22px', fontSize: '13px' }}
          >
            Close Audit Report
          </button>
        </div>
      </div>
    </div>
  );
}
