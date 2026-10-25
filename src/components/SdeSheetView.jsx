import React, { useState } from 'react';
import { sdeSheetTopics } from '../data/sdeSheetData';
import { CheckCircle2, Circle, ArrowUpRight, Trophy, Flame, Sparkles, Filter } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SdeSheetView({
  onSolveProblem,
  checkedSheetProblems = [],
  onToggleSheetProblem
}) {
  const [selectedTopic, setSelectedTopic] = useState('all');

  const totalQuestions = sdeSheetTopics.reduce((acc, t) => acc + t.problems.length, 0);
  const solvedCount = checkedSheetProblems.length;
  const progressPercent = Math.round((solvedCount / totalQuestions) * 100) || 0;

  const handleToggle = (probId) => {
    onToggleSheetProblem(probId);
    if (!checkedSheetProblems.includes(probId)) {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.8 }
      });
    }
  };

  const filteredTopics = selectedTopic === 'all'
    ? sdeSheetTopics
    : sdeSheetTopics.filter(t => t.topicId === selectedTopic);

  return (
    <div className="max-width-wrapper animate-fade-in" style={{ padding: '36px 0', minHeight: '80vh' }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 36px',
        color: 'white',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '24px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ background: '#e11d48', padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '800' }}>
              OFFICIAL SDE ROADMAP
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>GfG 160 Curated Edition</span>
          </div>
          <h1 style={{ color: 'white', fontSize: '32px', margin: 0 }}>
            Codificator 160 SDE Interview Sheet
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '15px', marginTop: '6px', maxWidth: '600px' }}>
            Handpicked must-do coding questions asked in Google, Amazon, Microsoft, and Uber. Track your daily progress towards interview readiness!
          </p>
        </div>

        {/* Progress Tracker Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          minWidth: '240px',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1' }}>Your Progress</span>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#34d399' }}>{progressPercent}%</span>
          </div>
          <div style={{
            height: '10px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '9999px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #10b981, #34d399)',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            <strong>{solvedCount}</strong> of <strong>{totalQuestions}</strong> problems completed
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
        <button
          onClick={() => setSelectedTopic('all')}
          style={{
            padding: '7px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: '700',
            background: selectedTopic === 'all' ? 'var(--brand-green)' : 'var(--bg-card)',
            color: selectedTopic === 'all' ? 'white' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            whiteSpace: 'nowrap'
          }}
        >
          All Topics ({totalQuestions})
        </button>
        {sdeSheetTopics.map(t => (
          <button
            key={t.topicId}
            onClick={() => setSelectedTopic(t.topicId)}
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: '13px',
              fontWeight: '700',
              background: selectedTopic === t.topicId ? 'var(--brand-green)' : 'var(--bg-card)',
              color: selectedTopic === t.topicId ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              whiteSpace: 'nowrap'
            }}
          >
            {t.title} ({t.problems.length})
          </button>
        ))}
      </div>

      {/* Topics Accordion & Problem Tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {filteredTopics.map(topic => {
          const topicSolved = topic.problems.filter(p => checkedSheetProblems.includes(p.id)).length;
          return (
            <div
              key={topic.topicId}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden'
              }}
            >
              <div style={{
                padding: '18px 24px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <h3 style={{ fontSize: '18px', margin: 0 }}>{topic.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: '4px 0 0 0' }}>
                    {topic.description}
                  </p>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green)' }}>
                  {topicSolved} / {topic.problems.length} Solved
                </div>
              </div>

              {/* Table with responsive horizontal scrolling */}
              <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <tbody>
                    {topic.problems.map((prob) => {
                      const isChecked = checkedSheetProblems.includes(prob.id);
                      return (
                        <tr
                          key={prob.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            background: isChecked ? 'var(--brand-green-light)' : 'transparent',
                            transition: 'var(--transition)'
                          }}
                        >
                          <td style={{ padding: '12px 16px', width: '44px' }}>
                            <button
                              onClick={() => handleToggle(prob.id)}
                              style={{ display: 'flex', alignItems: 'center' }}
                              title="Mark as solved"
                            >
                              {isChecked ? (
                                <CheckCircle2 size={20} color="var(--brand-green)" />
                              ) : (
                                <Circle size={20} color="var(--text-light)" />
                              )}
                            </button>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              fontSize: '14.5px',
                              fontWeight: '600',
                              color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
                              textDecoration: isChecked ? 'line-through' : 'none'
                            }}>
                              {prob.title}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', width: '90px' }}>
                            <span className={`badge badge-${prob.difficulty.toLowerCase()}`}>
                              {prob.difficulty}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', width: '100px', textAlign: 'right' }}>
                            <button
                              onClick={() => onSolveProblem(prob.targetProblemId)}
                              className="btn-outline"
                              style={{ padding: '5px 12px', fontSize: '12px' }}
                            >
                              Solve <ArrowUpRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
