import React, { useState, useEffect, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import SubHeader from './components/SubHeader';
import HomeView from './components/HomeView';
import SearchModal from './components/SearchModal';
import UserProfileModal from './components/UserProfileModal';
import Footer from './components/Footer';
import FirebaseAuthModal from './components/auth/FirebaseAuthModal';
import { onFirebaseAuthState } from './config/firebase';
import { lmsApi, getActiveUserToken } from './api/lmsApi';

// Lazy-loaded Views for bundle size optimization & code-splitting
const TutorialsView = lazy(() => import('./components/TutorialsView'));
const PracticeView = lazy(() => import('./components/PracticeView'));
const CoursesView = lazy(() => import('./components/CoursesView'));
const SdeSheetView = lazy(() => import('./components/SdeSheetView'));
const OnlineIdeView = lazy(() => import('./components/OnlineIdeView'));
const ContestView = lazy(() => import('./components/ContestView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const OperatorDashboard = lazy(() => import('./components/lms/OperatorDashboard'));
const InstructorDashboard = lazy(() => import('./components/lms/InstructorDashboard'));
const StudentClassroom = lazy(() => import('./components/lms/StudentClassroom'));
const CertificateVerificationView = lazy(() => import('./components/lms/CertificateVerificationView'));
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const SignupPage = lazy(() => import('./components/auth/SignupPage'));
const AccessDeniedPage = lazy(() => import('./components/auth/AccessDeniedPage'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));

export default function App() {
  const getViewFromLocation = () => {
    const raw = window.location.hash.replace('#', '').trim();
    const path = window.location.pathname.replace('/', '').trim();
    const validViews = [
      'home', 'tutorials', 'practice', 'courses', 'classroom', 'sde-sheet',
      'ide', 'contests', 'profile',
      'operator-dashboard', 'operator_here', 'instructor-dashboard', 'student-classroom', 'verify-certificate',
      'login', 'signup', 'admin_accesshere', 'instructor_here'
    ];
    const cleanHash = raw.split('?')[0];
    if (cleanHash === 'checkout' || cleanHash === 'payment') return 'courses';
    if (cleanHash === 'classroom') return 'student-classroom';
    if (cleanHash === 'admin' || cleanHash === 'admin-login') return 'admin_accesshere';
    if (cleanHash === 'operator' || cleanHash === 'operator-dashboard' || cleanHash === 'operator_here' || cleanHash === 'operator-login') return 'operator_here';
    if (cleanHash === 'instructor' || cleanHash === 'instructor-dashboard') return 'instructor_here';
    if (cleanHash === 'verify' || cleanHash === 'verify-certificate' || cleanHash.startsWith('verify/')) return 'verify-certificate';
    if (validViews.includes(cleanHash)) return cleanHash;
    const cleanPath = path.split('?')[0];
    if (cleanPath === 'checkout' || cleanPath === 'payment') return 'courses';
    if (cleanPath === 'classroom') return 'student-classroom';
    if (cleanPath === 'admin' || cleanPath === 'admin-login') return 'admin_accesshere';
    if (cleanPath === 'operator' || cleanPath === 'operator-dashboard' || cleanPath === 'operator_here' || cleanPath === 'operator-login') return 'operator_here';
    if (cleanPath === 'instructor' || cleanPath === 'instructor-dashboard') return 'instructor_here';
    if (cleanPath === 'verify' || cleanPath === 'verify-certificate' || cleanPath.startsWith('verify/')) return 'verify-certificate';
    if (validViews.includes(cleanPath)) return cleanPath;
    return 'home';
  };

  const [currentView, setCurrentView] = useState(getViewFromLocation); // 'home' | 'tutorials' | 'practice' | 'courses' | 'classroom' | 'sde-sheet' | 'ide' | 'contests' | 'profile' | 'batch' | 'operator-dashboard' | 'instructor-dashboard' | 'student-classroom' | 'verify-certificate'
  const [selectedTopicId, setSelectedTopicId] = useState('binary-search');
  const [selectedProblemId, setSelectedProblemId] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState('vexor-fullstack');
  const [ideInitialCode, setIdeInitialCode] = useState('');
  const [ideInitialLang, setIdeInitialLang] = useState('python');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [pendingAutoCheckoutCourseId, setPendingAutoCheckoutCourseId] = useState(null);
  const getInitialVerificationCode = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : window.location.search);
      const code = params.get('code') || params.get('id');
      if (code) return code.trim();
    }
    return '';
  };
  const [verificationCode, setVerificationCode] = useState(getInitialVerificationCode);

  // Load current user from LMS API on startup if active session token exists
  useEffect(() => {
    if (!getActiveUserToken()) return;
    lmsApi.getMe()
      .then(res => {
        if (res?.user) setCurrentUser(res.user);
      })
      .catch(() => {});
  }, []);

  // Synchronize Firebase auth state automatically if signed in
  useEffect(() => {
    const unsubscribe = onFirebaseAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const res = await lmsApi.syncFirebaseUser(token, {
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            avatar_url: firebaseUser.photoURL,
            uid: firebaseUser.uid
          });
          if (res?.user) {
            setCurrentUser(res.user);
          }
        } catch (e) {
          console.warn('Firebase state sync warning:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUserSwitched = (user) => {
    setCurrentUser(user);
    if (user.role === 'OPERATOR' || user.role === 'ADMIN') {
      setCurrentView('operator-dashboard');
    } else if (user.role === 'INSTRUCTOR') {
      setCurrentView('instructor-dashboard');
    } else {
      setCurrentView('student-classroom');
    }
  };

  // Keep location hash in sync with view while preserving query params for certificate verification
  useEffect(() => {
    if (currentView === 'verify-certificate') {
      const currentHash = window.location.hash || '';
      const params = new URLSearchParams(currentHash.includes('?') ? currentHash.split('?')[1] : window.location.search);
      const codeInUrl = params.get('code');
      const targetCode = verificationCode || codeInUrl || '';
      if (targetCode && codeInUrl !== targetCode) {
        window.location.hash = `verify-certificate?code=${encodeURIComponent(targetCode)}`;
      }
    } else {
      window.location.hash = currentView;
    }
  }, [currentView, verificationCode]);

  useEffect(() => {
    const handleHashChange = () => {
      const v = getViewFromLocation();
      setCurrentView(v);
      if (typeof window !== 'undefined') {
        const hash = window.location.hash || '';
        const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : window.location.search);
        const code = params.get('code') || params.get('id');
        if (code) {
          setVerificationCode(code.trim());
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Persistence in localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('codificator_theme') || 'light';
  });

  const [userPoints, setUserPoints] = useState(() => {
    const pts = Number(localStorage.getItem('codificator_points'));
    return (pts && pts !== 320) ? pts : 0;
  });

  const [solvedProblems, setSolvedProblems] = useState(() => {
    try {
      const stored = localStorage.getItem('codificator_solved');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 1 && parsed[0] === 'binary-search') {
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [enrolledCourses, setEnrolledCourses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('codificator_courses')) || [];
    } catch {
      return [];
    }
  });

  const [completedLessons, setCompletedLessons] = useState(() => {
    try {
      const stored = localStorage.getItem('codificator_lessons');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 1 && (parsed[0] === 'm1-l1' || parsed[0] === 'cip-m1-l1')) {
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [checkedSheetProblems, setCheckedSheetProblems] = useState(() => {
    try {
      const stored = localStorage.getItem('codificator_sheet');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 2 && parsed.includes('sde-1') && parsed.includes('sde-6')) {
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const streak = solvedProblems.length > 0 ? 1 : 0;

  // Apply Theme to documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('codificator_theme', theme);
  }, [theme]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('codificator_points', userPoints.toString());
  }, [userPoints]);

  useEffect(() => {
    localStorage.setItem('codificator_solved', JSON.stringify(solvedProblems));
  }, [solvedProblems]);

  useEffect(() => {
    localStorage.setItem('codificator_courses', JSON.stringify(enrolledCourses));
  }, [enrolledCourses]);

  useEffect(() => {
    localStorage.setItem('codificator_lessons', JSON.stringify(completedLessons));
  }, [completedLessons]);

  useEffect(() => {
    localStorage.setItem('codificator_sheet', JSON.stringify(checkedSheetProblems));
  }, [checkedSheetProblems]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleProblemSolved = (probId, pointsAwarded) => {
    if (!solvedProblems.includes(probId)) {
      setSolvedProblems(prev => [...prev, probId]);
      setUserPoints(prev => prev + (pointsAwarded * 10));
    }
  };

  const handleEnrollCourse = (courseId) => {
    if (!enrolledCourses.includes(courseId)) {
      setEnrolledCourses(prev => [...prev, courseId]);
    }
  };

  const handleLessonComplete = (lessonId) => {
    if (!completedLessons.includes(lessonId)) {
      setCompletedLessons(prev => [...prev, lessonId]);
      setUserPoints(prev => prev + 25);
    }
  };

  const handleEnterClassroom = (courseId) => {
    setSelectedCourseId(courseId || 'vexor-fullstack');
    setCurrentView('student-classroom');
    window.location.hash = 'student-classroom';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSheetProblem = (probId) => {
    setCheckedSheetProblems(prev =>
      prev.includes(probId) ? prev.filter(id => id !== probId) : [...prev, probId]
    );
  };

  const handleNavigate = (target) => {
    if (target.type === 'openSearch') {
      setIsSearchOpen(true);
      return;
    }

    if (target.type === 'tutorial') {
      setSelectedTopicId(target.topicId);
      setCurrentView('tutorials');
    } else if (target.type === 'practice') {
      setSelectedProblemId(target.problemId);
      setCurrentView('practice');
    } else if (target.type === 'course') {
      setSelectedCourseId(target.courseId);
      setCurrentView('courses');
    } else if (target.view) {
      if (target.topic) setSelectedTopicId(target.topic);
      if (target.problemId) setSelectedProblemId(target.problemId);
      if (target.courseId) setSelectedCourseId(target.courseId);
      setCurrentView(target.view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubHeaderSelect = (item) => {
    if (item.view === 'tutorials' && item.topic) {
      setSelectedTopicId(item.topic);
    }
    if (item.view === 'practice' && item.problemId) {
      setSelectedProblemId(item.problemId);
    }
    if (item.view === 'courses' && item.courseId) {
      setSelectedCourseId(item.courseId);
    }
    setCurrentView(item.view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRunInIde = (codeSnippet, lang) => {
    setIdeInitialCode(codeSnippet);
    setIdeInitialLang(lang);
    setCurrentView('ide');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Primary Clean Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={() => {
          setCurrentView('profile');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateItem={handleNavigate}
        onOpenAuthModal={() => {
          setCurrentView('login');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSignOut={() => {
          lmsApi.logout();
          setCurrentUser(null);
          setCurrentView('home');
        }}
        currentUser={currentUser}
        streak={streak}
        userPoints={userPoints}
      />

      {/* Main Page Content */}
      <div className="main-content">
        {currentView === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            onOpenSearch={() => setIsSearchOpen(true)}
            currentUser={currentUser}
            enrolledCourses={enrolledCourses}
            completedLessons={completedLessons}
            onEnterClassroom={handleEnterClassroom}
          />
        )}

        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTopColor: 'var(--brand-green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '8px' }} />
              <p style={{ fontSize: '14px', fontWeight: '600' }}>Loading view...</p>
            </div>
          </div>
        }>

        {currentView === 'tutorials' && (
          <TutorialsView
            selectedTopicId={selectedTopicId}
            onSelectTopic={(id) => setSelectedTopicId(id)}
            onNavigateToPractice={(probId) => {
              setSelectedProblemId(probId);
              setCurrentView('practice');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToIde={handleRunInIde}
          />
        )}

        {currentView === 'practice' && (
          <PracticeView
            selectedProblemId={selectedProblemId}
            onSelectProblem={(id) => setSelectedProblemId(id)}
            onBackToList={() => setSelectedProblemId(null)}
            onNavigateToTutorial={(topicId) => {
              setSelectedTopicId(topicId);
              setCurrentView('tutorials');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            solvedProblems={solvedProblems}
            onProblemSolved={handleProblemSolved}
          />
        )}

        {currentView === 'courses' && (
          <CoursesView
            selectedCourseId={selectedCourseId}
            enrolledCourses={enrolledCourses}
            onEnrollCourse={handleEnrollCourse}
            onEnterClassroom={handleEnterClassroom}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onOpenAuthModal={(msg) => {
              setAuthModalMessage(msg || 'Sign in to purchase this course.');
              setIsAuthModalOpen(true);
            }}
            autoOpenCheckoutCourseId={pendingAutoCheckoutCourseId}
            onClearAutoOpenCheckout={() => setPendingAutoCheckoutCourseId(null)}
          />
        )}

        {currentView === 'classroom' && (
          <StudentClassroom
            courseId={selectedCourseId || 'vexor-fullstack'}
            onBackToCatalog={() => setCurrentView('courses')}
            onNavigateVerify={(code) => {
              setVerificationCode(code);
              setCurrentView('verify-certificate');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {(currentView === 'operator-dashboard' || currentView === 'operator_here') && (
          !currentUser ? (
            <LoginPage
              portalType="OPERATOR"
              onSuccess={(user) => {
                setCurrentUser(user);
                setCurrentView('operator_here');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigate={handleNavigate}
            />
          ) : (currentUser.role !== 'OPERATOR' && currentUser.role !== 'ADMIN') ? (
            <AccessDeniedPage
              requiredRole="OPERATOR"
              currentRole={currentUser.role}
              onNavigateHome={() => handleNavigate({ view: 'home' })}
            />
          ) : (
            <OperatorDashboard
              onPreviewCourse={(cId) => {
                setSelectedCourseId(cId);
                setCurrentView('student-classroom');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )
        )}

        {currentView === 'instructor-dashboard' && (
          <InstructorDashboard
            onPreviewCourse={(cId) => {
              setSelectedCourseId(cId);
              setCurrentView('student-classroom');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'student-classroom' && (
          <StudentClassroom
            courseId={selectedCourseId || 'vexor-fullstack'}
            onBackToCatalog={() => setCurrentView('courses')}
            onNavigateVerify={(code) => {
              setVerificationCode(code);
              setCurrentView('verify-certificate');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'verify-certificate' && (
          <CertificateVerificationView
            initialCode={verificationCode || ''}
          />
        )}

        {currentView === 'sde-sheet' && (
          <SdeSheetView
            onSolveProblem={(targetProbId) => {
              setSelectedProblemId(targetProbId);
              setCurrentView('practice');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            checkedSheetProblems={checkedSheetProblems}
            onToggleSheetProblem={handleToggleSheetProblem}
          />
        )}

        {currentView === 'ide' && (
          <OnlineIdeView
            initialCode={ideInitialCode}
            initialLang={ideInitialLang}
          />
        )}

        {currentView === 'contests' && (
          <ContestView
            onNavigateToPractice={(probId) => {
              setSelectedProblemId(probId);
              setCurrentView('practice');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            userPoints={userPoints}
            streak={streak}
            solvedProblems={solvedProblems}
            enrolledCourses={enrolledCourses}
            completedLessons={completedLessons}
            currentUser={currentUser}
            onUserUpdated={setCurrentUser}
            onNavigateToPractice={(probId) => {
              setSelectedProblemId(probId);
              setCurrentView('practice');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToCourse={(courseId) => {
              setSelectedCourseId(courseId);
              setCurrentView('classroom');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'login' && (
          <LoginPage
            portalType="STUDENT"
            onSuccess={(user) => {
              setCurrentUser(user);
              const pendingCourseId = sessionStorage.getItem('pending_checkout_course_id');
              if (pendingCourseId) {
                sessionStorage.removeItem('pending_checkout_course_id');
                sessionStorage.removeItem('pending_checkout_action');
                setSelectedCourseId(pendingCourseId);
                setPendingAutoCheckoutCourseId(pendingCourseId);
                setCurrentView('courses');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              if (user.role === 'ADMIN') {
                setCurrentView('admin_accesshere');
              } else if (user.role === 'INSTRUCTOR') {
                setCurrentView('instructor_here');
              } else {
                setCurrentView('courses');
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'signup' && (
          <SignupPage
            onSuccess={(user) => {
              setCurrentUser(user);
              const pendingCourseId = sessionStorage.getItem('pending_checkout_course_id');
              if (pendingCourseId) {
                sessionStorage.removeItem('pending_checkout_course_id');
                sessionStorage.removeItem('pending_checkout_action');
                setSelectedCourseId(pendingCourseId);
                setPendingAutoCheckoutCourseId(pendingCourseId);
                setCurrentView('courses');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              setCurrentView('courses');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'admin_accesshere' && (
          !currentUser ? (
            <LoginPage
              portalType="ADMIN"
              onSuccess={(user) => {
                setCurrentUser(user);
                setCurrentView('admin_accesshere');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigate={handleNavigate}
            />
          ) : currentUser.role !== 'ADMIN' ? (
            <AccessDeniedPage
              requiredRole="ADMIN"
              currentRole={currentUser.role}
              onNavigateHome={() => handleNavigate({ view: 'home' })}
            />
          ) : (
            <AdminDashboard
              currentUser={currentUser}
              onNavigate={handleNavigate}
            />
          )
        )}

        {currentView === 'instructor_here' && (
          !currentUser ? (
            <LoginPage
              portalType="INSTRUCTOR"
              onSuccess={(user) => {
                setCurrentUser(user);
                setCurrentView('instructor_here');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigate={handleNavigate}
            />
          ) : (currentUser.role !== 'INSTRUCTOR' && currentUser.role !== 'ADMIN') ? (
            <AccessDeniedPage
              requiredRole="INSTRUCTOR"
              currentRole={currentUser.role}
              onNavigateHome={() => handleNavigate({ view: 'home' })}
            />
          ) : (
            <InstructorDashboard
              onPreviewCourse={(cId) => {
                setSelectedCourseId(cId);
                setCurrentView('student-classroom');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )
        )}
        </Suspense>
      </div>

      {/* GfG Multi-Column Footer */}
      {currentView !== 'practice' &&
       currentView !== 'ide' &&
       currentView !== 'classroom' &&
       currentView !== 'student-classroom' &&
       currentView !== 'login' &&
       currentView !== 'signup' &&
       currentView !== 'admin_accesshere' &&
       currentView !== 'instructor_here' && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* Search Command Palette (Ctrl+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* User Profile & XP Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userPoints={userPoints}
        streak={streak}
        solvedCount={solvedProblems.length}
        enrolledCount={enrolledCourses.length}
        onOpenFullProfile={() => {
          setIsProfileOpen(false);
          setCurrentView('profile');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Firebase Authentication Modal */}
      <FirebaseAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        customNotice={authModalMessage}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          const pendingCourseId = sessionStorage.getItem('pending_checkout_course_id');
          if (pendingCourseId) {
            sessionStorage.removeItem('pending_checkout_course_id');
            sessionStorage.removeItem('pending_checkout_action');
            setSelectedCourseId(pendingCourseId);
            setPendingAutoCheckoutCourseId(pendingCourseId);
            setCurrentView('courses');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          handleUserSwitched(user);
        }}
      />
    </div>
  );
}
