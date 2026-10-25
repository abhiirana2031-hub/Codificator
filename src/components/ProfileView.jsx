import React, { useState, useEffect } from 'react';
import { Award, Flame, CheckCircle2, BookOpen, Layers, ShieldCheck, Trophy, Calendar, MapPin, Building2, Globe, Edit3, ArrowUpRight, Code2, ExternalLink, Star, CheckCircle, FileQuestion, CreditCard, Download, RefreshCw, Zap, GraduationCap, Briefcase, Mail, Phone } from 'lucide-react';
import { problemsList } from '../data/problemsData';
import { lmsApi } from '../api/lmsApi';
import PricingModal from './lms/PricingModal';
import EditProfileModal from './profile/EditProfileModal';
import CertificateModal from './lms/CertificateModal';

export default function ProfileView({
  userPoints = 0,
  streak = 0,
  solvedProblems = [],
  enrolledCourses = [],
  completedLessons = [],
  currentUser: initialUser = null,
  onUserUpdated,
  onNavigateToPractice,
  onNavigateToCourse
}) {
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [courseCatalog, setCourseCatalog] = useState([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userBio, setUserBio] = useState(initialUser?.bio || '');
  const [selectedCertificateCourse, setSelectedCertificateCourse] = useState(null);
  const [userCertificates, setUserCertificates] = useState([]);
  const [lmsAnalytics, setLmsAnalytics] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const loadCertificates = async () => {
    try {
      const res = await lmsApi.getMyCertificates();
      if (res?.certificates && res.certificates.length > 0) {
        setUserCertificates(res.certificates);
      }
    } catch (e) {
      console.warn('Could not load user certificates:', e);
    }
  };

  useEffect(() => {
    setCurrentUser(initialUser);
    setUserBio(initialUser?.bio || '');
  }, [initialUser]);

  useEffect(() => {
    let isMounted = true;

    lmsApi.getMe().then(res => {
      if (res?.user && isMounted) {
        setCurrentUser(res.user);
        setUserBio(res.user.bio || '');
      }
    }).catch(err => console.error('Could not load profile user:', err));
    lmsApi.getCourses()
      .then(res => {
        if (isMounted) setCourseCatalog(res?.courses || []);
      })
      .catch(err => console.error('Could not load profile course catalog:', err));
    loadCertificates();

    return () => { isMounted = false; };
  }, []);

  const loadBilling = async () => {
    try {
      setBillingLoading(true);
      const res = await lmsApi.getBillingStatus();
      if (res) setBillingData(res);
    } catch (e) {
      console.warn('Could not load billing status:', e);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCancelSub = async () => {
    if (!confirm('Are you sure you want to cancel auto-renewal? Your access remains active until the end of your billing period.')) return;
    try {
      await lmsApi.cancelSubscription();
      await loadBilling();
      alert('Auto-renewal has been canceled.');
    } catch (e) {
      alert('Error canceling subscription: ' + e.message);
    }
  };

  const handleResumeSub = async () => {
    try {
      await lmsApi.resumeSubscription();
      await loadBilling();
      alert('Subscription auto-renewal resumed!');
    } catch (e) {
      alert('Error resuming subscription: ' + e.message);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const res = await lmsApi.getStudentAnalytics();
        if (res && isMounted) setLmsAnalytics(res);
      } catch {
        // anonymous or unauthenticated
      }
    }
    loadStats();
    loadBilling();
    return () => { isMounted = false; };
  }, []);

  // Generate 52 weeks of heatmap activity data based on actual solved activity
  const generateHeatmap = () => {
    const weeks = [];
    const totalCount = solvedProblems.length;
    for (let w = 0; w < 52; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        let count = 0;
        if (totalCount > 0 && w === 51 && d >= Math.max(0, 7 - totalCount)) {
          count = 1;
        }
        days.push({ day: d, count });
      }
      weeks.push(days);
    }
    return weeks;
  };

  const heatmapWeeks = generateHeatmap();

  const badges = [
    { id: "b1", title: "Problem Solver", desc: "Solved 10+ Searching & Sorting problems", icon: <Award size={22} color="#f59e0b" />, tier: "Gold", date: solvedProblems.length >= 10 ? "Unlocked" : "Locked", unlocked: solvedProblems.length >= 10 },
    { id: "b2", title: "Active Streak", desc: "Maintained active problem-solving streak", icon: <Flame size={22} color="#f97316" />, tier: "Silver", date: streak >= 7 ? "Unlocked" : "Locked", unlocked: streak >= 7 },
    { id: "b3", title: "Contest Challenger", desc: "Participated in live contest challenge", icon: <Trophy size={22} color="#eab308" />, tier: "Gold", date: "Locked", unlocked: false },
    { id: "b4", title: "DP Algorithmist", desc: "Mastered 0/1 Knapsack & Dynamic Programming", icon: <Zap size={22} color="#3b82f6" />, tier: "Silver", date: solvedProblems.includes('knapsack-01') ? "Unlocked" : "Locked", unlocked: solvedProblems.includes('knapsack-01') },
    { id: "b5", title: "System Design Scholar", desc: "Architected LRU Cache & distributed systems", icon: <Layers size={22} color="#8b5cf6" />, tier: "Bronze", date: "Locked", unlocked: false },
    { id: "b6", title: "100 Problems Club", desc: "Successfully completed 100+ platform challenges", icon: <Star size={22} color="#10b981" />, tier: "Platinum", date: solvedProblems.length >= 100 ? "Unlocked" : "Locked", unlocked: solvedProblems.length >= 100 }
  ];

  // Solved problem objects
  const solvedList = problemsList.filter(p => solvedProblems.includes(p.id));
  const easySolved = solvedList.filter(p => p.difficulty === 'Easy').length;
  const medSolved = solvedList.filter(p => p.difficulty === 'Medium').length;
  const hardSolved = solvedList.filter(p => p.difficulty === 'Hard').length;
  const enrolledList = courseCatalog.filter(course =>
    course.is_enrolled || enrolledCourses.includes(course.id)
  );
  const profileFields = [
    currentUser?.display_name || currentUser?.name,
    currentUser?.bio,
    currentUser?.college,
    currentUser?.phone,
    Array.isArray(currentUser?.skills) ? currentUser.skills.length > 0 : Boolean(currentUser?.skills)
  ];
  const profileCompletion = Math.round(
    (profileFields.filter(Boolean).length / profileFields.length) * 100
  );

  return (
    <div className="max-width-wrapper animate-fade-in" style={{ padding: '24px 0 60px 0' }}>
      
      <section className="profile-hero">
        <div className="profile-cover" aria-hidden="true">
          <span className="profile-cover-orb profile-cover-orb-one" />
          <span className="profile-cover-orb profile-cover-orb-two" />
        </div>
        <div className="profile-hero-content">
          <div className="profile-identity-row">
            <div className="profile-avatar">
              {currentUser?.avatar_url
                ? <img src={currentUser.avatar_url} alt={`${currentUser?.display_name || currentUser?.name || 'User'} avatar`} />
                : <span>{(currentUser?.display_name || currentUser?.name || 'U').trim().charAt(0).toUpperCase()}</span>}
            </div>
            <div className="profile-identity">
              <span className="profile-eyebrow">CODIFICATOR PROFILE</span>
              <h1>{currentUser?.display_name || currentUser?.name || 'Your profile'}</h1>
              <div className="profile-meta">
                {currentUser?.email && <span><Mail size={15} />{currentUser.email}</span>}
                {currentUser?.college && <span><GraduationCap size={16} />{currentUser.college}</span>}
                {currentUser?.role && <span className="profile-role">{currentUser.role}</span>}
              </div>
            </div>
            <button className="profile-edit-button" onClick={() => setIsEditProfileOpen(true)}>
              <Edit3 size={16} /> Edit profile
            </button>
          </div>
          {userBio && <p className="profile-bio">{userBio}</p>}
        </div>
      </section>

      <section className="profile-details-grid" aria-label="Profile details">
        <div className="profile-completion-card">
          <div className="profile-section-heading">
            <div>
              <span className="profile-eyebrow">YOUR PROFILE</span>
              <h2>Make your profile stand out</h2>
            </div>
            <span className="profile-completion-value">{profileCompletion}%</span>
          </div>
          <p>Add a few details so your learning profile reflects you.</p>
          <div className="profile-completion-track" role="progressbar" aria-valuenow={profileCompletion} aria-valuemin="0" aria-valuemax="100">
            <span style={{ width: `${profileCompletion}%` }} />
          </div>
          <button className="profile-text-button" onClick={() => setIsEditProfileOpen(true)}>
            Complete your profile <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="profile-about-card">
          <div className="profile-section-heading">
            <div>
              <span className="profile-eyebrow">ABOUT</span>
              <h2>Personal information</h2>
            </div>
            <button className="profile-icon-button" aria-label="Edit profile information" onClick={() => setIsEditProfileOpen(true)}>
              <Edit3 size={16} />
            </button>
          </div>
          <div className="profile-facts">
            <div><Briefcase size={16} /><span>{currentUser?.college || 'Add your institution'}</span></div>
            <div><Phone size={16} /><span>{currentUser?.phone || 'Add a phone number'}</span></div>
            <div><Globe size={16} /><span>{Array.isArray(currentUser?.preferred_languages) ? currentUser.preferred_languages.join(', ') : currentUser?.preferred_languages || 'Add your languages'}</span></div>
          </div>
        </div>
      </section>

      {/* 2. CORE METRICS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            CODING SCORE
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary-color)', margin: '6px 0 2px 0' }}>
            {userPoints} pts
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {userPoints > 0 ? 'Active learner' : 'Start solving to earn XP'}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            PROBLEMS SOLVED
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
            {solvedProblems.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Easy: {easySolved} • Med: {medSolved} • Hard: {hardSolved}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            CURRENT STREAK
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#d97706', margin: '6px 0 2px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={26} color="#f59e0b" /> {streak} Days
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {streak > 0 ? 'Daily streak active' : 'Solve a problem today'}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            CONTEST RATING
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#3b82f6', margin: '6px 0 2px 0' }}>
            Unrated
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Join upcoming contests to get ranked
          </div>
        </div>
      </div>

      {/* 2b. VERIFIED LMS LEARNING ANALYTICS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={14} color="var(--brand-green)" /> LESSONS COMPLETED
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--brand-green)', margin: '6px 0 2px 0' }}>
            {lmsAnalytics?.metrics?.lessonsCompleted ?? completedLessons.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Modules finished: {lmsAnalytics?.metrics?.modulesCompleted ?? 0}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileQuestion size={14} color="#6366f1" /> ASSESSMENTS PASSED
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#6366f1', margin: '6px 0 2px 0' }}>
            {lmsAnalytics?.metrics?.quizzesPassed ?? 0} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>/ {lmsAnalytics?.metrics?.quizAttempts ?? 0}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Avg Score: {lmsAnalytics?.metrics?.avgQuizScore ?? 0}%
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={14} color="#f59e0b" /> VERIFIED CERTIFICATES
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#f59e0b', margin: '6px 0 2px 0' }}>
            {lmsAnalytics?.metrics?.certificatesEarned ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Courses completed: {lmsAnalytics?.metrics?.coursesCompleted ?? 0}
          </div>
        </div>
      </div>

      {/* 3. 365-DAY SUBMISSION ACTIVITY HEATMAP */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '28px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Annual Coding Activity Heatmap
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {solvedProblems.length} submissions made across DSA problems and challenges in the last year.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Less</span>
            <span style={{ width: '10px', height: '10px', background: 'var(--bg-secondary)', borderRadius: '2px' }} />
            <span style={{ width: '10px', height: '10px', background: '#86efac', borderRadius: '2px' }} />
            <span style={{ width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px' }} />
            <span style={{ width: '10px', height: '10px', background: '#15803d', borderRadius: '2px' }} />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridTemplateRows: 'repeat(7, 12px)',
          gap: '3px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {heatmapWeeks.map((week, wIdx) => (
            week.map((day, dIdx) => {
              let bg = 'var(--bg-secondary)';
              if (day.count > 0 && day.count <= 2) bg = '#86efac';
              else if (day.count > 2 && day.count <= 4) bg = '#22c55e';
              else if (day.count > 4) bg = '#15803d';

              return (
                <div
                  key={`${wIdx}-${dIdx}`}
                  title={`${day.count} contributions on Day ${dIdx + 1}, Week ${wIdx + 1}`}
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: bg,
                    borderRadius: '2px',
                    transition: 'transform 0.1s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                />
              );
            })
          ))}
        </div>
      </div>

      {/* 4. NAVIGATION TABS */}
      <div className="profile-tabs" role="tablist" aria-label="Profile sections">
        {[
          { id: 'overview', label: 'Overview & Badges' },
          { id: 'problems', label: `Solved Problems (${solvedProblems.length})` },
          { id: 'courses', label: `Enrolled Courses & Certificates (${enrolledList.length})` },
          { id: 'billing', label: 'Course Orders & Receipts' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--brand-green)' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--brand-green)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '14.5px',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & BADGES */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Badges Grid */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
              Earned Badges & Honors ({badges.filter(b => b.unlocked).length} Unlocked)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {badges.map(b => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: b.unlocked ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    opacity: b.unlocked ? 1 : 0.5
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                    {b.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                      {b.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0' }}>
                      {b.desc}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      background: b.tier === 'Gold' ? '#fef3c7' : '#f1f5f9',
                      color: b.tier === 'Gold' ? '#b45309' : '#475569',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {b.tier.toUpperCase()} TIER
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty & Language Distribution */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                Problem Breakdown by Difficulty
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>Easy</span>
                    <span>{easySolved} / {problemsList.filter(p => p.difficulty === 'Easy').length}</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${problemsList.filter(p => p.difficulty === 'Easy').length > 0 ? (easySolved / problemsList.filter(p => p.difficulty === 'Easy').length) * 100 : 0}%`, height: '100%', background: '#22c55e' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#f59e0b' }}>Medium</span>
                    <span>{medSolved} / {problemsList.filter(p => p.difficulty === 'Medium').length}</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${problemsList.filter(p => p.difficulty === 'Medium').length > 0 ? (medSolved / problemsList.filter(p => p.difficulty === 'Medium').length) * 100 : 0}%`, height: '100%', background: '#f59e0b' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>Hard</span>
                    <span>{hardSolved} / {problemsList.filter(p => p.difficulty === 'Hard').length}</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${problemsList.filter(p => p.difficulty === 'Hard').length > 0 ? (hardSolved / problemsList.filter(p => p.difficulty === 'Hard').length) * 100 : 0}%`, height: '100%', background: '#ef4444' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SOLVED PROBLEMS */}
      {activeTab === 'problems' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
            Recent Accepted Submissions
          </h3>

          {solvedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
              <Code2 size={40} color="var(--text-light)" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>No problems solved yet</h4>
              <p style={{ fontSize: '14px', maxWidth: '420px', margin: '0 auto 16px auto' }}>
                Visit the Practice Arena to solve your first coding challenge and build your verified portfolio.
              </p>
              <button
                onClick={() => onNavigateToPractice && onNavigateToPractice()}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '13.5px' }}
              >
                Go to Practice Arena
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {solvedList.map(prob => (
              <div
                key={prob.id}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#22c55e" />
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>{prob.title}</span>
                    <span className={`badge badge-${prob.difficulty.toLowerCase()}`}>
                      {prob.difficulty}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Tags: {prob.tags.join(', ')} • Companies: {prob.companies.join(', ')}
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToPractice && onNavigateToPractice(prob.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--primary-color)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Solve Again <ExternalLink size={14} />
                </button>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* TAB 3: ENROLLED COURSES & CERTIFICATES */}
      {activeTab === 'courses' && (
        <div>
          {/* Official Earned Certificates Section */}
          {userCertificates.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="#059669" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Earned Certificates ({userCertificates.length})
                  </h3>
                </div>
                <span style={{ fontSize: '12px', color: '#059669', background: '#dcfce7', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                  Cryptographically Verified
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                {userCertificates.map(cert => (
                  <div
                    key={cert.id}
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                      border: '1.5px solid #86efac',
                      borderRadius: '16px',
                      padding: '20px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{
                          background: '#047857',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          letterSpacing: '0.05em'
                        }}>
                          {cert.certificate_code}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                            {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase() : 'DATE NOT PROVIDED'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '4px 0 8px 0', lineHeight: 1.3 }}>
                        {cert.course_title}
                      </h4>
                      <div style={{ fontSize: '13px', color: '#475569' }}>
                        Awarded to: <strong style={{ color: '#0f172a' }}>{cert.student_name || currentUser?.display_name || currentUser?.name || currentUser?.email || 'You'}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #bbf7d0' }}>
                      <button
                        onClick={() => setSelectedCertificateCourse(cert)}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '9px 12px',
                          background: '#047857',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <Award size={15} /> View Certificate
                      </button>

                      <a
                        href={`#verify-certificate?code=${cert.certificate_code}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '9px 14px',
                          background: '#ffffff',
                          color: '#047857',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                        title="Open live public verification registry"
                      >
                        Verify <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enrolled Courses Grid */}
          {enrolledList.length === 0 && userCertificates.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '48px 24px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <BookOpen size={44} color="var(--text-muted)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                No Enrolled Courses
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
                You have not enrolled in any courses yet.
              </p>
            </div>
          ) : (
            enrolledList.length > 0 && (
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                  Active Course Enrollments
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                  {enrolledList.map(course => {
                    const courseCert = userCertificates.find(c => c.course_id === course.id);
                    const progress = courseCert ? 100 : Math.min(100, Math.max(0, Number(course.student_progress) || 0));
                    return (
                      <div
                        key={course.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <div style={{ background: 'linear-gradient(120deg, #123b2a, #2f8d46)', padding: '20px', color: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>
                              ENROLLED
                            </span>
                            {courseCert && (
                              <span style={{ fontSize: '11px', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 800 }}>
                                CERTIFIED: {courseCert.certificate_code}
                              </span>
                            )}
                          </div>
                          <h4 style={{ fontSize: '18px', fontWeight: 800, margin: '8px 0 4px 0' }}>
                            {course.title}
                          </h4>
                          <div style={{ fontSize: '12px', opacity: 0.9 }}>
                            {course.instructor_name ? `Instructor: ${course.instructor_name}` : (course.category || 'Self-paced course')}
                          </div>
                        </div>

                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Curriculum Completion</span>
                              <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                                {progress}% complete
                              </span>
                            </div>
                            <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', background: courseCert ? '#10b981' : 'var(--brand-green)' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                            <button
                              onClick={() => onNavigateToCourse && onNavigateToCourse(course.id)}
                              style={{
                                flex: 1,
                                background: 'var(--primary-color)',
                                color: '#fff',
                                border: 'none',
                                padding: '10px',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer'
                              }}
                            >
                              Resume Learning
                            </button>
                            <button
                              onClick={() => setSelectedCertificateCourse(courseCert || course)}
                              style={{
                                background: courseCert ? '#ecfdf5' : 'var(--bg-secondary)',
                                border: courseCert ? '1px solid #10b981' : '1px solid var(--border-color)',
                                color: courseCert ? '#059669' : 'inherit',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                              title={courseCert ? `View Certificate (${courseCert.certificate_code})` : 'View Certificate'}
                            >
                              <Award size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 4: COURSE PURCHASES & RECEIPTS */}
      {activeTab === 'billing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Orders & Receipts Statement Card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Billing History & Receipts
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {billingData?.orders?.length || 0} transaction receipts recorded on your account.
                </div>
              </div>

              {billingData?.orders?.length > 0 && (
                <button
                  onClick={() => {
                    window.open(lmsApi.getBillingReceiptsCsvUrl(), '_blank');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={15} /> Download CSV Receipts
                </button>
              )}
            </div>

            {(!billingData?.orders || billingData.orders.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <CreditCard size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <div style={{ fontSize: '15px', fontWeight: 600 }}>No Billing Records Yet</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  Your subscription invoices and course purchase receipts will appear here.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Order ID</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.orders.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '14px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {o.id}
                        </td>
                        <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {o.course_title || 'Course Access'}
                        </td>
                        <td style={{ padding: '14px', color: 'var(--text-muted)' }}>
                          Individual Course
                        </td>
                        <td style={{ padding: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          ₹{o.amount}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            background: o.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: o.status === 'COMPLETED' ? 'var(--brand-green)' : '#ef4444',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '12px',
                            fontWeight: 700
                          }}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRICING MODAL */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => {
          setIsPricingModalOpen(false);
          loadBilling();
        }}
        onSuccess={() => {
          loadBilling();
        }}
      />

      {/* CERTIFICATE MODAL */}
      {(() => {
        const matchedCert = userCertificates.find(c => 
          c.certificate_code === selectedCertificateCourse?.certificate_code ||
          c.course_id === selectedCertificateCourse?.id ||
          c.id === selectedCertificateCourse?.id
        ) || (userCertificates.length > 0 ? userCertificates[0] : null);

        const activeCertId = selectedCertificateCourse?.certificate_code || matchedCert?.certificate_code || '';
        const activeStudentName = selectedCertificateCourse?.student_name || matchedCert?.student_name || currentUser?.name || currentUser?.display_name || '';
        const activeCourseTitle = selectedCertificateCourse?.course_title || matchedCert?.course_title || selectedCertificateCourse?.title || '';
        const activeIssueDate = (() => {
          const rawDate = selectedCertificateCourse?.issue_date || matchedCert?.issue_date || matchedCert?.completion_date;
          if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`;
            }
          }
          return 'DATE NOT PROVIDED';
        })();

        return (
          <CertificateModal
            isOpen={Boolean(selectedCertificateCourse)}
            onClose={() => setSelectedCertificateCourse(null)}
            certificateId={activeCertId}
            issuedOn={activeIssueDate}
            studentName={activeStudentName}
            courseTitle={activeCourseTitle}
            studyHours={selectedCertificateCourse?.duration || 'Self-paced'}
            courseDuration="4 Weeks"
            skillLevel={selectedCertificateCourse?.level || 'Beginner to Intermediate'}
            onNavigateVerify={(code) => {
              setSelectedCertificateCourse(null);
              window.location.hash = `verify-certificate?code=${code}`;
            }}
          />
        );
      })()}

      {/* Profile Editor Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          if (onUserUpdated) onUserUpdated(updated);
        }}
      />
    </div>
  );
}
