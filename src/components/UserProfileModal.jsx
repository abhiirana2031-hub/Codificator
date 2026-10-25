import React from 'react';
import { Award, Flame, CheckCircle2, BookOpen, Layers, X, ShieldCheck, Trophy, User, Zap } from 'lucide-react';

export default function UserProfileModal({
  isOpen,
  onClose,
  userPoints = 0,
  streak = 0,
  solvedCount = 0,
  enrolledCount = 0,
  onOpenFullProfile
}) {
  if (!isOpen) return null;

  const badges = [
    { title: "First Solver", desc: "Solved your first platform problem", icon: <Award size={20} color="#f59e0b" />, unlocked: solvedCount >= 1 },
    { title: "Streak Builder", desc: "Maintained active problem-solving streak", icon: <Flame size={20} color="#f97316" />, unlocked: streak >= 7 },
    { title: "Problem Master", desc: "Solved 10+ platform problems", icon: <Zap size={20} color="#3b82f6" />, unlocked: solvedCount >= 10 },
    { title: "SDE Champion", desc: "Solved 50+ SDE Sheet problems", icon: <Trophy size={20} color="#10b981" />, unlocked: solvedCount >= 50 }
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden'
        }}
        className="animate-fade-in"
      >
        {/* Profile Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2f8d46 100%)',
          padding: '28px 24px',
          color: 'white',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                border: '3px solid white',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <User size={34} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ color: 'white', fontSize: '22px', margin: 0 }}>User</h2>
                <ShieldCheck size={18} color="#34d399" />
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '13.5px', marginTop: '2px' }}>
                @user • Developer
              </p>
              <div style={{ display: 'inline-block', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: '700', marginTop: '6px' }}>
                {userPoints > 0 ? `Level 1 • ${userPoints} XP` : 'New Member'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          textAlign: 'center'
        }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--brand-green)' }}>
              {userPoints}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Total XP</div>
          </div>
          <div style={{ padding: '16px', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Flame size={18} fill="#f59e0b" /> {streak}d
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Daily Streak</div>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#3b82f6' }}>
              {solvedCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Problems Solved</div>
          </div>
        </div>

        {/* Badges Section */}
        <div style={{ padding: '24px' }}>
          <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={16} color="#f59e0b" /> Earned Badges & Achievements
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {badges.map((b, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: b.unlocked ? 1 : 0.45
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                  {b.icon}
                </div>
                <div>
                  <h5 style={{ fontSize: '13.5px', color: 'var(--text-primary)', margin: 0 }}>{b.title}</h5>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13.5px' }}>
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                if (onOpenFullProfile) onOpenFullProfile();
              }}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              View Full GfG Profile & Heatmap →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
