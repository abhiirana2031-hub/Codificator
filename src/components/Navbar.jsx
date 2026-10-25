import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Flame, Moon, Sun, Bell, Code2, Terminal, BookOpen, Layers, Trophy, 
  ChevronDown, ChevronRight, User, CheckCheck, ExternalLink, Menu, X, Shield, 
  Sparkles, GraduationCap, LayoutDashboard, Briefcase, Award, CheckCircle2, LogIn, LogOut
} from 'lucide-react';
import { lmsApi } from '../api/lmsApi';

export default function Navbar({
  currentView,
  setCurrentView,
  theme,
  toggleTheme,
  onOpenSearch,
  onOpenProfile,
  onNavigateItem,
  onOpenAuthModal,
  onSignOut,
  currentUser = null,
  streak = 0,
  userPoints = 0
}) {
  const [activeDropdown, setActiveDropdown] = useState(null); // 'learn' | 'practice' | 'interview' | 'account' | null
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState(null); // 'learn' | 'practice' | 'interview' | 'account'

  const notifRef = useRef(null);
  const dropdownTimerRef = useRef(null);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await lmsApi.getNotifications(25);
      if (res) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // Quiet fail if offline
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await lmsApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await lmsApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMouseEnter = (menuName) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setActiveDropdown(menuName);
  };

  const handleMouseLeave = () => {
    dropdownTimerRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const navigateTo = (view, extra = {}) => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    if (onNavigateItem) {
      onNavigateItem({ view, ...extra });
    } else {
      setCurrentView(view);
    }
  };

  const isLearnActive = ['courses', 'tutorials', 'batch'].includes(currentView);
  const isPracticeActive = ['practice', 'ide', 'contests'].includes(currentView);
  const isInterviewActive = ['sde-sheet', 'verify-certificate'].includes(currentView);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'var(--transition)'
      }}
      onMouseLeave={handleMouseLeave}
    >
      <div className="max-width-wrapper" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        gap: '16px'
      }}>
        {/* LEFT: Logo & Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mobile Menu Hamburger */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div
            onClick={() => navigateTo('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <img
              src="/logo.png"
              alt="Codificator Logo"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                objectFit: 'contain',
                flexShrink: 0
              }}
              onError={(e) => {
                // Fallback icon if logo image fails to load
                e.target.style.display = 'none';
                if (e.target.nextElementSibling) {
                  e.target.nextElementSibling.style.display = 'flex';
                }
              }}
            />
            {/* Fallback box */}
            <div
              style={{
                display: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2f8d46 0%, #1e6030 100%)',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}
            >
              <Code2 size={20} />
            </div>

            <div>
              <span className="nav-brand-title" style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '19px',
                fontWeight: '900',
                letterSpacing: '-0.3px',
                color: 'var(--brand-green)'
              }}>
                codificator
              </span>
              <span className="nav-brand-subtitle" style={{
                fontSize: '9.5px',
                display: 'block',
                marginTop: '-3px',
                color: 'var(--text-light)',
                fontWeight: '700',
                letterSpacing: '0.6px'
              }}>
                LEARN • PRACTICE • BUILD
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: The 4 Primary Navigation Links (Desktop) */}
        <nav className="nav-desktop" style={{ alignItems: 'center', gap: '6px' }}>
          {/* 1. Home */}
          <button
            onClick={() => navigateTo('home')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: currentView === 'home' ? '700' : '600',
              color: currentView === 'home' ? 'var(--brand-green)' : 'var(--text-secondary)',
              background: currentView === 'home' ? 'var(--brand-green-light)' : 'transparent',
              fontSize: '14.5px'
            }}
          >
            Home
          </button>

          {/* 2. Learn Dropdown */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => handleMouseEnter('learn')}
          >
            <button
              onClick={() => navigateTo('courses')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: isLearnActive ? '700' : '600',
                color: isLearnActive ? 'var(--brand-green)' : 'var(--text-secondary)',
                background: isLearnActive ? 'var(--brand-green-light)' : 'transparent',
                fontSize: '14.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Learn <ChevronDown size={14} />
            </button>
          </div>

          {/* 3. Practice Dropdown */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => handleMouseEnter('practice')}
          >
            <button
              onClick={() => navigateTo('practice')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: isPracticeActive ? '700' : '600',
                color: isPracticeActive ? 'var(--brand-green)' : 'var(--text-secondary)',
                background: isPracticeActive ? 'var(--brand-green-light)' : 'transparent',
                fontSize: '14.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Practice <ChevronDown size={14} />
            </button>
          </div>

          {/* 4. Interview Prep Dropdown */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => handleMouseEnter('interview')}
          >
            <button
              onClick={() => navigateTo('sde-sheet')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: isInterviewActive ? '700' : '600',
                color: isInterviewActive ? 'var(--brand-green)' : 'var(--text-secondary)',
                background: isInterviewActive ? 'var(--brand-green-light)' : 'transparent',
                fontSize: '14.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Interview Prep <ChevronDown size={14} />
            </button>
          </div>
        </nav>

        {/* RIGHT: Search, Notifications, Theme, and Sign In / User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Quick Search Button / Input */}
          <div
            onClick={onOpenSearch}
            className="desktop-only"
            style={{
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '13px',
              width: '180px',
              transition: 'var(--transition)'
            }}
          >
            <Search size={15} />
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Search...
            </span>
            <kbd style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '1px 5px',
              fontSize: '10px',
              fontWeight: '700',
              color: 'var(--text-secondary)'
            }}>
              Ctrl K
            </kbd>
          </div>

          {/* Search Mobile Icon */}
          <button
            onClick={onOpenSearch}
            className="mobile-only"
            aria-label="Open Search"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)'
            }}
          >
            <Search size={17} />
          </button>

          {/* Daily Streak (if active) */}
          {streak > 0 && (
            <div
              title={`Daily Streak: ${streak} Days Active!`}
              className="desktop-only"
              style={{
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#d97706',
                padding: '4px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: '700'
              }}
            >
              <Flame size={14} fill="#f59e0b" color="#f59e0b" />
              <span>{streak}</span>
            </div>
          )}

          {/* Notification Bell */}
          <div className="hide-on-mobile-sm" style={{ position: 'relative' }} ref={notifRef}>
            <button
              onClick={() => {
                setIsNotifOpen(prev => !prev);
                fetchNotifications();
              }}
              aria-label="Notifications"
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isNotifOpen ? 'var(--brand-green-light)' : 'var(--bg-secondary)',
                border: isNotifOpen ? '1px solid var(--brand-green)' : '1px solid var(--border-color)',
                color: isNotifOpen ? 'var(--brand-green)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 800,
                    borderRadius: '10px',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px'
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {isNotifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  width: 'min(92vw, 360px)',
                  maxHeight: '400px',
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-xl)',
                  zIndex: 1100,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease-out'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)'
                }}>
                  <span style={{ fontWeight: 800, fontSize: '13px' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--brand-green)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', flex: 1, maxHeight: '340px' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-light)', fontSize: '12.5px' }}>
                      <Bell size={24} style={{ opacity: 0.3, marginBottom: '6px' }} />
                      <div>You're all caught up!</div>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.isRead) handleMarkAsRead(n.id);
                          if (n.link_url) {
                            window.location.hash = n.link_url.replace(/^\//, '');
                            setIsNotifOpen(false);
                          }
                        }}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border-color)',
                          background: n.isRead ? 'transparent' : 'var(--brand-green-light)',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: n.isRead ? 600 : 800, fontSize: '12.5px' }}>{n.title}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="hide-on-mobile-sm"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)'
            }}
          >
            {theme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} />}
          </button>

          {/* User State: Sign In Button or Compact User Menu */}
          {currentUser ? (
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => handleMouseEnter('account')}
            >
              <button
                onClick={onOpenProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px 4px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--brand-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 800
                }}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User size={14} />}
                </div>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentUser.name ? currentUser.name.split(' ')[0] : 'Account'}
                </span>
                <ChevronDown size={13} color="var(--text-muted)" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                borderRadius: 'var(--radius-sm)',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MEGA MENUS / DROPDOWNS                                    */}
      {/* ========================================================= */}

      {/* 1. LEARN Mega Dropdown */}
      {activeDropdown === 'learn' && (
        <div
          onMouseEnter={() => handleMouseEnter('learn')}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute',
            top: '64px',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            borderBottom: '2px solid var(--brand-green)',
            boxShadow: 'var(--shadow-xl)',
            padding: '24px 0',
            zIndex: 1050
          }}
          className="animate-fade-in"
        >
          <div className="max-width-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {/* Courses & Paths */}
            <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand-green)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Structured Courses
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a onClick={() => navigateTo('courses')} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }} className="gfg-card-subtle">
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>All Courses Catalog</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Full curriculum with projects, quizzes, and certificates</div>
                </a>
                <a onClick={() => navigateTo('student-classroom')} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }} className="gfg-card-subtle">
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#10b981' }}>Student Classroom</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Continue your active course lessons & reader</div>
                </a>
              </div>
            </div>

            {/* Tutorials & Notes */}
            <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '10px' }}>
                Tutorials & Notes Library
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a onClick={() => navigateTo('tutorials', { topic: 'binary-search' })} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Data Structures & Algorithms</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Arrays, Trees, Graphs, Dynamic Programming</div>
                </a>
                <a onClick={() => navigateTo('tutorials', { topic: 'lru-cache-design' })} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>System Design & Architecture</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Caching, microservices, load balancing</div>
                </a>
                <a onClick={() => navigateTo('tutorials', { topic: 'python-decorators' })} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Programming Languages</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>C++, Java, Python, and JavaScript deep dives</div>
                </a>
              </div>
            </div>

            {/* Featured Focus */}
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Sparkles size={16} color="var(--brand-green)" />
                <span style={{ fontWeight: 800, fontSize: '14px' }}>Become a Full-Stack Engineer</span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                Master React, Node.js, REST APIs, and database architecture through hands-on guided lessons.
              </p>
              <button
                onClick={() => navigateTo('courses')}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '12.5px', width: '100%' }}
              >
                Explore Full Curriculum <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PRACTICE Mega Dropdown */}
      {activeDropdown === 'practice' && (
        <div
          onMouseEnter={() => handleMouseEnter('practice')}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute',
            top: '64px',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            borderBottom: '2px solid var(--brand-green)',
            boxShadow: 'var(--shadow-xl)',
            padding: '24px 0',
            zIndex: 1050
          }}
          className="animate-fade-in"
        >
          <div className="max-width-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand-green)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Problem Solving
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a onClick={() => navigateTo('practice')} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Coding Problems Arena</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Algorithmic challenges with automated judge & test cases</div>
                </a>
                <a onClick={() => navigateTo('practice', { problemId: 'binary-search' })} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#ef4444' }}>Problem of the Day (POTD)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Daily curated problem to build your streak</div>
                </a>
              </div>
            </div>

            <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '10px' }}>
                Tools & Live Competitions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a onClick={() => navigateTo('ide')} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Online IDE & Compiler</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fast sandbox for Python, JavaScript, C++, and Java</div>
                </a>
                <a onClick={() => navigateTo('contests')} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Live Contests & Job-A-Thons</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Compete against peers and get scouted by recruiters</div>
                </a>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                Interactive Code Sandbox
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                Test any algorithm or prototype solutions directly in the browser with standard input and stdout feedback.
              </p>
              <button
                onClick={() => navigateTo('ide')}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '12.5px', width: '100%' }}
              >
                Launch Online IDE <Terminal size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. INTERVIEW PREP Mega Dropdown */}
      {activeDropdown === 'interview' && (
        <div
          onMouseEnter={() => handleMouseEnter('interview')}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute',
            top: '64px',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            borderBottom: '2px solid var(--brand-green)',
            boxShadow: 'var(--shadow-xl)',
            padding: '24px 0',
            zIndex: 1050
          }}
          className="animate-fade-in"
        >
          <div className="max-width-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', marginBottom: '10px' }}>
                Curated Roadmaps
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a onClick={() => navigateTo('sde-sheet')} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Codificator 160 SDE Sheet</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>The most frequently asked interview problems in product companies</div>
                </a>
                <a onClick={() => navigateTo('tutorials', { topic: 'lru-cache-design' })} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>System Design Interview Prep</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>HLD, LLD, Consistent Hashing, LRU Caches</div>
                </a>
              </div>
            </div>

            <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '10px' }}>
                Verification & Credentials
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a onClick={() => navigateTo('verify-certificate')} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Verify Certificate</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Public authenticity validation for Codificator credentials</div>
                </a>
                <a onClick={() => navigateTo('profile')} style={{ padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Performance & Heatmap</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Showcase your streak, badges, and problem solving track</div>
                </a>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                Cracking FAANG & Tech Tier-1
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                Track your progress through topic-by-topic checklists covering arrays, two-pointers, graphs, and system architecture.
              </p>
              <button
                onClick={() => navigateTo('sde-sheet')}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '12.5px', width: '100%' }}
              >
                Open 160 SDE Sheet <Trophy size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ACCOUNT Dropdown Menu */}
      {activeDropdown === 'account' && currentUser && (
        <div
          onMouseEnter={() => handleMouseEnter('account')}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute',
            top: '64px',
            right: '24px',
            width: '260px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-xl)',
            padding: '8px',
            zIndex: 1050
          }}
          className="animate-fade-in"
        >
          {/* User Info Header */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.email}
            </div>
            <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'var(--brand-green-light)',
                color: 'var(--brand-green)'
              }}>
                {currentUser.role}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#d97706'
              }}>
                {userPoints} XP
              </span>
            </div>
          </div>

          {/* Links */}
          <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={() => { onOpenProfile(); setActiveDropdown(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <User size={15} /> My Profile & Heatmap
            </button>

            <button
              onClick={() => navigateTo('student-classroom')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <GraduationCap size={15} /> Student Classroom
            </button>

            {/* Privileged Dashboards (Only visible if role allows) */}
            {(currentUser.role === 'INSTRUCTOR' || currentUser.role === 'ADMIN') && (
              <button
                onClick={() => navigateTo('instructor_here')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#4f46e5',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <Briefcase size={15} /> Instructor Workspace
              </button>
            )}

            {(currentUser.role === 'OPERATOR' || currentUser.role === 'ADMIN') && (
              <button
                onClick={() => navigateTo('operator_here')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#059669',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <Layers size={15} /> Operator Dashboard
              </button>
            )}

            {currentUser.role === 'ADMIN' && (
              <button
                onClick={() => navigateTo('admin_accesshere')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--brand-green)',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <Shield size={15} /> Admin Dashboard
              </button>
            )}

            <button
              onClick={() => navigateTo('verify-certificate')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <Award size={15} /> Verify Credentials
            </button>

            <button
              onClick={() => {
                if (onSignOut) onSignOut();
                setActiveDropdown(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'transparent',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                marginTop: '4px',
                borderTop: '1px solid var(--border-color)'
              }}
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MOBILE NAVIGATION DRAWER                                   */}
      {/* ========================================================= */}
      {isMobileMenuOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                <span style={{ fontWeight: 900, fontSize: '18px', color: 'var(--brand-green)' }}>
                  codificator
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close navigation"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Accordion Links */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
              {/* Home */}
              <button
                onClick={() => navigateTo('home')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: currentView === 'home' ? 'var(--brand-green-light)' : 'transparent',
                  color: currentView === 'home' ? 'var(--brand-green)' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '15px',
                  textAlign: 'left'
                }}
              >
                <span>Home</span>
              </button>

              {/* Learn Group */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => setMobileExpandedGroup(mobileExpandedGroup === 'learn' ? null : 'learn')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '14.5px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="var(--brand-green)" /> Learn
                  </span>
                  <ChevronDown size={16} style={{ transform: mobileExpandedGroup === 'learn' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {mobileExpandedGroup === 'learn' && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button onClick={() => navigateTo('courses')} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Courses Catalog
                    </button>
                    <button onClick={() => navigateTo('tutorials', { topic: 'binary-search' })} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      DSA Tutorials & Notes
                    </button>
                    <button onClick={() => navigateTo('student-classroom')} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--brand-green)', fontWeight: 700 }}>
                      Student Classroom
                    </button>
                  </div>
                )}
              </div>

              {/* Practice Group */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => setMobileExpandedGroup(mobileExpandedGroup === 'practice' ? null : 'practice')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '14.5px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code2 size={16} color="#3b82f6" /> Practice
                  </span>
                  <ChevronDown size={16} style={{ transform: mobileExpandedGroup === 'practice' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {mobileExpandedGroup === 'practice' && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button onClick={() => navigateTo('practice')} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Coding Problems Arena
                    </button>
                    <button onClick={() => navigateTo('practice', { problemId: 'binary-search' })} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Problem of the Day (POTD)
                    </button>
                    <button onClick={() => navigateTo('ide')} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Online IDE & Compiler
                    </button>
                    <button onClick={() => navigateTo('contests')} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Live Contests
                    </button>
                  </div>
                )}
              </div>

              {/* Interview Prep Group */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => setMobileExpandedGroup(mobileExpandedGroup === 'interview' ? null : 'interview')}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '14.5px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={16} color="#e11d48" /> Interview Prep
                  </span>
                  <ChevronDown size={16} style={{ transform: mobileExpandedGroup === 'interview' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {mobileExpandedGroup === 'interview' && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button onClick={() => navigateTo('sde-sheet')} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Codificator 160 SDE Sheet
                    </button>
                    <button onClick={() => navigateTo('tutorials', { topic: 'lru-cache-design' })} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      System Design Prep
                    </button>
                    <button onClick={() => navigateTo('verify-certificate')} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Verify Credentials
                    </button>
                  </div>
                )}
              </div>

              {/* Account Group */}
              {currentUser && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setMobileExpandedGroup(mobileExpandedGroup === 'account' ? null : 'account')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '14.5px'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} color="var(--brand-green)" /> My Account
                    </span>
                    <ChevronDown size={16} style={{ transform: mobileExpandedGroup === 'account' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                  {mobileExpandedGroup === 'account' && (
                    <div style={{ padding: '8px 12px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button onClick={() => { onOpenProfile(); setIsMobileMenuOpen(false); }} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                        Profile & Heatmap
                      </button>
                      {(currentUser.role === 'INSTRUCTOR' || currentUser.role === 'ADMIN' || currentUser.role === 'OPERATOR') && (
                        <button onClick={() => navigateTo('instructor-dashboard')} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: '#4f46e5', fontWeight: 700 }}>
                          Instructor Portal
                        </button>
                      )}
                      {(currentUser.role === 'OPERATOR' || currentUser.role === 'ADMIN') && (
                        <button onClick={() => navigateTo('operator_here')} style={{ padding: '8px', textAlign: 'left', fontSize: '13.5px', color: 'var(--brand-green)', fontWeight: 700 }}>
                          Operator Dashboard
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div style={{
              marginTop: 'auto',
              padding: '16px',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              gap: '10px'
            }}>
              {currentUser ? (
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <button
                    onClick={() => { onOpenProfile(); setIsMobileMenuOpen(false); }}
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
                  >
                    <User size={15} /> {currentUser.name ? currentUser.name.split(' ')[0] : 'Account'}
                  </button>
                  <button
                    onClick={() => {
                      if (onSignOut) onSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onOpenAuthModal(); setIsMobileMenuOpen(false); }}
                  className="btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
                >
                  <LogIn size={15} /> Sign In / Sign Up
                </button>
              )}

              <button
                onClick={toggleTheme}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)'
                }}
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
