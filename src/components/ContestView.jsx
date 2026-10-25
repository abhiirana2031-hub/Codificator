import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Users, Briefcase, Calendar, Award, ChevronRight, CheckCircle2, Flame, Search, ExternalLink, X } from 'lucide-react';
import { contestsData } from '../data/contestsData';
export { contestsData };

export default function ContestView({ onNavigateToPractice }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'live' | 'upcoming' | 'past'
  const [registeredContests, setRegisteredContests] = useState([]);
  const [selectedContest, setSelectedContest] = useState(contestsData[0]);
  const [showArenaModal, setShowArenaModal] = useState(false);

  const filteredContests = contestsData.filter(c => {
    if (activeTab === 'all') return true;
    return c.status === activeTab;
  });

  const handleRegister = (id) => {
    if (!registeredContests.includes(id)) {
      setRegisteredContests(prev => [...prev, id]);
    }
  };

  return (
    <div className="max-width-wrapper animate-fade-in" style={{ padding: '24px 0 60px 0' }}>
      {/* HERO BANNER: Live Job-A-Thon */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(20px, 4vw, 36px)',
        color: '#fff',
        marginBottom: '28px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: '24px',
        alignItems: 'center',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
            <Flame size={15} color="#facc15" /> LIVE RECRUITMENT CHALLENGE
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, margin: '0 0 10px 0', lineHeight: 1.25 }}>
            Job-A-Thon 35: Hiring Challenge
          </h1>
          <p style={{ fontSize: '14.5px', color: 'rgba(255,255,255,0.9)', margin: '0 0 18px 0', lineHeight: 1.5 }}>
            Compete live against 18,000+ developers. Top rankers receive direct interview shortlists from tech giants including Google, Amazon, Swiggy, and Razorpay.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
            <button
              onClick={() => { setSelectedContest(contestsData[0]); setShowArenaModal(true); }}
              style={{
                background: '#ffffff',
                color: '#065f46',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '14.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              <Trophy size={17} color="#065f46" /> Enter Live Arena
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: 'rgba(255,255,255,0.85)' }}>
              <Users size={15} /> 18,420 Participating
            </div>
          </div>
        </div>

        {/* Live Timer Card */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(10px)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.15)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, marginBottom: '8px' }}>
            CONTEST ENDING IN
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', minWidth: '52px' }}>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>03</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>HOURS</div>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, alignSelf: 'center' }}>:</div>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', minWidth: '52px' }}>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>42</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>MINS</div>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, alignSelf: 'center' }}>:</div>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', minWidth: '52px' }}>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>18</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>SECS</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
            Hiring Partners: <strong>Google, Amazon, Swiggy, Razorpay</strong>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px', scrollbarWidth: 'none' }}>
        {[
          { id: 'all', label: 'All Contests' },
          { id: 'live', label: 'Live (1)' },
          { id: 'upcoming', label: 'Upcoming (2)' },
          { id: 'past', label: 'Past (Archive)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: activeTab === tab.id ? 'var(--brand-green)' : 'var(--border-color)',
              background: activeTab === tab.id ? 'var(--brand-green-light)' : 'var(--bg-card)',
              color: activeTab === tab.id ? 'var(--brand-green)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTESTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
        {filteredContests.map(c => {
          const isRegistered = registeredContests.includes(c.id);

          return (
            <div
              key={c.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)'
              }}
            >
              <div style={{ background: c.bannerColor, padding: '20px', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 600 }}>
                    {c.type}
                  </span>
                  {c.status === 'live' && (
                    <span style={{ fontSize: '12px', background: '#dc2626', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} /> LIVE
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', lineHeight: 1.3 }}>
                  {c.title}
                </h3>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  Duration: {c.duration}
                </div>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <Calendar size={16} color="var(--primary-color)" /> {c.startTime}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <Users size={16} color="var(--primary-color)" /> {c.registeredCount.toLocaleString()} Candidates
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <Briefcase size={16} color="var(--primary-color)" /> Companies: {c.hiringCompanies.join(', ')}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto', display: 'flex', gap: '10px' }}>
                  {c.status === 'live' ? (
                    <button
                      onClick={() => { setSelectedContest(c); setShowArenaModal(true); }}
                      style={{
                        flex: 1,
                        background: 'var(--primary-color)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      Enter Arena <ChevronRight size={16} />
                    </button>
                  ) : c.status === 'upcoming' ? (
                    <button
                      onClick={() => handleRegister(c.id)}
                      style={{
                        flex: 1,
                        background: isRegistered ? 'var(--bg-secondary)' : 'var(--primary-color)',
                        color: isRegistered ? 'var(--primary-color)' : '#fff',
                        border: isRegistered ? '1px solid var(--primary-color)' : 'none',
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {isRegistered ? <><CheckCircle2 size={16} /> Registered</> : 'Register Free'}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setSelectedContest(c); setShowArenaModal(true); }}
                      style={{
                        flex: 1,
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      View Problems & Leaderboard
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ARENA & LEADERBOARD MODAL */}
      {showArenaModal && selectedContest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-xl)',
            padding: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>
                  {selectedContest.type}
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '8px 0 4px 0' }}>
                  {selectedContest.title}
                </h2>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Duration: {selectedContest.duration} • {selectedContest.registeredCount.toLocaleString()} Participants
                </div>
              </div>
              <button
                onClick={() => setShowArenaModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTEST PROBLEMS LIST */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={18} color="var(--primary-color)" /> Contest Challenges ({selectedContest.problems.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedContest.problems.map((prob, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                        {idx + 1}. {prob.title}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Points: <strong>{prob.score} pts</strong> • Solved by: {prob.solvedCount} candidates
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowArenaModal(false);
                        onNavigateToPractice && onNavigateToPractice("binary-search");
                      }}
                      style={{
                        background: 'var(--primary-color)',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Solve in Arena
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CONTEST LEADERBOARD */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--primary-color)" /> Contest Leaderboard
              </h3>
              {selectedContest.leaderboard.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px' }}>Rank</th>
                        <th style={{ padding: '10px 14px' }}>Candidate</th>
                        <th style={{ padding: '10px 14px' }}>Institute / Org</th>
                        <th style={{ padding: '10px 14px' }}>Score</th>
                        <th style={{ padding: '10px 14px' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedContest.leaderboard.map(u => (
                        <tr key={u.rank} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: u.rank <= 3 ? 'var(--primary-color)' : 'inherit' }}>
                            #{u.rank}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{u.handle}</div>
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                            {u.college}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--primary-color)' }}>
                            {u.score} pts
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                            {u.time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  No submissions yet. Be the first to solve a problem and claim the top rank!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
