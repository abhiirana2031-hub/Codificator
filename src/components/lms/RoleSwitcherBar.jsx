import React, { useState, useEffect } from 'react';
import { lmsApi, getActiveUserToken, setActiveUserToken } from '../../api/lmsApi';
import { Shield, UserCheck, GraduationCap, Briefcase, ChevronDown, Check, RefreshCw, Key } from 'lucide-react';

export default function RoleSwitcherBar({ currentUser, onUserSwitched, onNavigateView, onOpenAuthModal }) {
  const [users, setUsers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await lmsApi.getUsers();
      if (data?.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.warn('Could not load users for switcher:', err);
    }
  };

  const handleSelectUser = async (u) => {
    setLoading(true);
    setActiveUserToken(u.id);
    if (onUserSwitched) {
      await onUserSwitched(u);
    }
    setIsOpen(false);
    setLoading(false);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Admin', bg: '#fee2e2', color: '#dc2626', icon: Shield };
      case 'OPERATOR':
        return { label: 'Course Operator', bg: '#fef3c7', color: '#d97706', icon: Briefcase };
      case 'INSTRUCTOR':
        return { label: 'Instructor', bg: '#e0e7ff', color: '#4f46e5', icon: UserCheck };
      case 'STUDENT':
      default:
        return { label: 'Student', bg: '#dcfce7', color: '#16a34a', icon: GraduationCap };
    }
  };

  const currentBadge = currentUser ? getRoleBadge(currentUser.role) : getRoleBadge('STUDENT');
  const CurrentIcon = currentBadge.icon;

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      padding: '6px clamp(10px, 2.5vw, 20px)',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 900,
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        flex: '1 1 auto',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        whiteSpace: 'nowrap',
        padding: '2px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px' }}>
            LMS Role:
          </span>
          <div
            onClick={() => setIsOpen(!isOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              fontWeight: 600,
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)',
              fontSize: '12px'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '12px',
              background: currentBadge.bg,
              color: currentBadge.color,
              fontSize: '10.5px',
              fontWeight: 700
            }}>
              <CurrentIcon size={11} />
              {currentBadge.label}
            </div>
            <span>{currentUser?.name || 'Alex Chen'}</span>
            <ChevronDown size={13} color="var(--text-secondary)" />
          </div>
        </div>

        {/* Quick view shortcuts based on role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'OPERATOR') && (
            <button
              onClick={() => onNavigateView('operator-dashboard')}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--brand-green-light)',
                color: 'var(--brand-green)',
                fontWeight: 700,
                fontSize: '11.5px',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              Operator
            </button>
          )}

          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'OPERATOR' || currentUser?.role === 'INSTRUCTOR') && (
            <button
              onClick={() => onNavigateView('instructor-dashboard')}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: '#e0e7ff',
                color: '#4f46e5',
                fontWeight: 700,
                fontSize: '11.5px',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              Instructor
            </button>
          )}

          <button
            onClick={() => onNavigateView('student-classroom')}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '11.5px',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Classroom
          </button>

          <button
            onClick={() => onNavigateView('verify-certificate')}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '11.5px',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Verify
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={onOpenAuthModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: currentUser?.firebase_uid 
              ? 'rgba(16, 185, 129, 0.15)' 
              : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            border: currentUser?.firebase_uid 
              ? '1px solid rgba(16, 185, 129, 0.4)' 
              : 'none',
            color: currentUser?.firebase_uid ? '#10b981' : '#ffffff',
            fontWeight: 700,
            fontSize: '11px',
            cursor: 'pointer',
            boxShadow: currentUser?.firebase_uid ? 'none' : '0 2px 8px rgba(79, 70, 229, 0.25)',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          title={currentUser?.firebase_uid ? `Linked to Firebase UID: ${currentUser.firebase_uid}` : 'Sign in or register with Firebase'}
        >
          <Key size={12} />
          {currentUser?.firebase_uid ? 'Firebase Connected' : 'Firebase Auth'}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '24px',
          marginTop: '6px',
          width: '320px',
          background: 'var(--bg-card)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-xl)',
          padding: '8px',
          zIndex: 1000
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
            SELECT PERSONA TO TEST EXPERIENCES:
          </div>
          {users.map(u => {
            const badge = getRoleBadge(u.role);
            const isSelected = currentUser?.id === u.id;
            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-hover)' : 'transparent',
                  transition: 'background 0.15s ease'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {u.email}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 700,
                    background: badge.bg,
                    color: badge.color
                  }}>
                    {badge.label}
                  </span>
                  {isSelected && <Check size={16} color="var(--brand-green)" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
