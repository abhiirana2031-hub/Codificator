import React, { useState, useEffect, useRef } from 'react';
import { lmsApi } from '../../api/lmsApi';
import confetti from 'canvas-confetti';
import LessonContentRenderer, { slugifyHeading, calculateReadingTime } from './LessonContentRenderer';
import {
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  BookOpen,
  FileText,
  FileQuestion,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Award,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Check,
  AlignLeft,
  ListFilter,
  Eye,
  PanelRightClose,
  PanelRightOpen,
  Code2,
  Bookmark,
  Edit3,
  Save,
  Trash2,
  Unlock
} from 'lucide-react';
import CodingExerciseWidget from '../CodingExerciseWidget';
import CertificateModal from './CertificateModal';

export default function StudentClassroom({
  courseId = 'vexor-fullstack',
  onBackToCatalog,
  onNavigateVerify,
  currentUser = null
}) {
  const [courseData, setCourseData] = useState(null);
  const [resolvedCourseId, setResolvedCourseId] = useState(courseId);
  const [activeUser, setActiveUser] = useState(currentUser);

  useEffect(() => {
    if (currentUser) {
      setActiveUser(currentUser);
    } else {
      lmsApi.getMe().then(res => {
        if (res?.user) setActiveUser(res.user);
      }).catch(() => {});
    }
  }, [currentUser]);
  const [curriculum, setCurriculum] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'resources' | 'quiz' | 'assignment'
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Reading Experience State
  const [readingPercent, setReadingPercent] = useState(0);
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [isTocOpen, setIsTocOpen] = useState(true);
  const readingAreaRef = useRef(null);
  const lastProgressSyncRef = useRef(0);

  // Responsive Layout State
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [mobileSection, setMobileSection] = useState('reader'); // 'curriculum' | 'reader' | 'toc'

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Quiz State
  const [quizData, setQuizData] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  // Assignment State
  const [assignmentData, setAssignmentData] = useState(null);
  const [assignmentText, setAssignmentText] = useState('');
  const [assignmentFileUrl, setAssignmentFileUrl] = useState('');
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);

  // Certificate State
  const [certificate, setCertificate] = useState(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Coding Exercises for current lesson
  const [lessonExercises, setLessonExercises] = useState([]);

  // Study Tools: Bookmarks & Personal Notes
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  const [noteSaveStatus, setNoteSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [courseNotes, setCourseNotes] = useState([]);
  const noteDebounceTimerRef = useRef(null);

  useEffect(() => {
    setResolvedCourseId(courseId);
    setCourseData(null);
    setCurrentLesson(null);
    loadCourseCurriculum();
  }, [courseId]);

  // Extract headings whenever current lesson changes using deterministic slug tracking
  useEffect(() => {
    const rawLessonText = currentLesson?.content_markdown || currentLesson?.text_content;
    if (rawLessonText) {
      const extracted = [];
      const tracker = new Map();
      const lines = rawLessonText.split('\n');
      for (const line of lines) {
        const match = line.trim().match(/^(#{1,4})\s+(.*)$/);
        if (match) {
          const level = match[1].length;
          const rawText = match[2].replace(/[*_`]/g, '').trim();
          const id = slugifyHeading(rawText, tracker);
          extracted.push({ level, text: rawText, id });
        }
      }
      setHeadings(extracted);
      if (extracted.length > 0) {
        setActiveHeadingId(extracted[0].id);
      }

      // Initialize reading percent from stored lesson progress if available
      const savedPercent = currentLesson.progress?.watched_progress_percent || 0;
      setReadingPercent(Math.round(savedPercent));
    } else {
      setHeadings([]);
      setReadingPercent(0);
      setActiveHeadingId('');
    }
  }, [currentLesson]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCourseCurriculum = async () => {
    try {
      setLoading(true);
      let targetCourseId = courseId;
      let res;
      try {
        res = await lmsApi.getStudentCurriculum(targetCourseId);
      } catch (err) {
        if (err.status !== 404) throw err;

        const allRes = await lmsApi.getCourses();
        const fallbackCourse = allRes?.courses?.find(course => course.id === 'vexor-fullstack')
          || allRes?.courses?.[0];
        if (!fallbackCourse) throw err;

        targetCourseId = fallbackCourse.id;
        res = await lmsApi.getStudentCurriculum(targetCourseId);
      }

      setCourseData(res.course);
      setResolvedCourseId(res.course?.id || targetCourseId);
      setCurriculum(res.curriculum || []);
      
      let cert = res.certificate;
      if (!cert) {
        try {
          const myCerts = await lmsApi.getMyCertificates();
          const match = myCerts?.certificates?.find(c => c.course_id === targetCourseId || c.course_id === res.course?.id);
          if (match) cert = match;
        } catch {
          // unauthenticated or offline
        }
      }
      setCertificate(cert);

      const effectiveCourseId = res.course?.id || targetCourseId;

      // Determine initial lesson to load (resume lesson or first unlocked lesson)
      const resume = res.resume_lesson;
      if (resume) {
        await loadLesson(resume.lessonId, effectiveCourseId);
      } else if (res.curriculum?.[0]?.lessons?.[0]) {
        await loadLesson(res.curriculum[0].lessons[0].id, effectiveCourseId);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLesson = async (lessonId, overrideCourseId) => {
    try {
      const cId = overrideCourseId || courseData?.id || resolvedCourseId || courseId;
      const res = await lmsApi.getLessonContent(cId, lessonId);
      setCurrentLesson(res.lesson);
      setActiveTab('notes');
      setQuizResult(null);
      setSelectedAnswers({});

      // Scroll reader back to top
      if (readingAreaRef.current) {
        readingAreaRef.current.scrollTop = 0;
      }

      // Load quiz if module has quiz
      if (res.lesson.quiz) {
        try {
          const qRes = await lmsApi.getQuiz(res.lesson.quiz.id);
          setQuizData(qRes.quiz);
        } catch (e) {
          console.warn('Quiz load error:', e);
        }
      } else {
        setQuizData(null);
      }

      // Load assignment if module has assignment
      if (res.lesson.assignment) {
        try {
          const aRes = await lmsApi.getAssignment(res.lesson.assignment.id);
          setAssignmentData(aRes.assignment);
          if (aRes.submission?.content_text) {
            setAssignmentText(aRes.submission.content_text);
          }
        } catch (e) {
          console.warn('Assignment load error:', e);
        }
      } else {
        setAssignmentData(null);
      }

      // Load coding exercises for this lesson if available
      try {
        const exRes = await lmsApi.getLessonExercises(lessonId);
        setLessonExercises(exRes.exercises || []);
      } catch (e) {
        setLessonExercises([]);
      }

      // Load Bookmark status
      try {
        const bmRes = await lmsApi.getBookmarkStatus(lessonId);
        setIsBookmarked(Boolean(bmRes?.isBookmarked));
      } catch {
        setIsBookmarked(false);
      }

      // Load Personal Lesson Note
      try {
        const noteRes = await lmsApi.getLessonNote(lessonId);
        setPersonalNote(noteRes?.note?.content || '');
        setNoteSaveStatus('idle');
      } catch {
        setPersonalNote('');
      }

      // Load Course Notes overview
      try {
        const cNotes = await lmsApi.getCourseNotes(cId);
        setCourseNotes(cNotes?.notes || []);
      } catch {
        setCourseNotes([]);
      }
    } catch (err) {
      if (err.data?.is_locked) {
        showNotification(`${err.data.error} ${err.data.lock_reason}`, 'error');
      } else {
        showNotification(err.message, 'error');
      }
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentLesson) return;
    try {
      const res = await lmsApi.toggleBookmark(currentLesson.id);
      setIsBookmarked(res.bookmarked);
      showNotification(res.bookmarked ? 'Lesson bookmarked' : 'Bookmark removed');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleSavePersonalNote = async (textToSave = personalNote) => {
    if (!currentLesson) return;
    setNoteSaveStatus('saving');
    try {
      await lmsApi.saveLessonNote(currentLesson.id, textToSave);
      setNoteSaveStatus('saved');
      setTimeout(() => setNoteSaveStatus('idle'), 2500);
      lmsApi.getCourseNotes(resolvedCourseId).then(res => setCourseNotes(res?.notes || [])).catch(() => {});
    } catch (err) {
      setNoteSaveStatus('idle');
      showNotification('Failed to save note: ' + err.message, 'error');
    }
  };

  const handleNoteChange = (text) => {
    setPersonalNote(text);
    setNoteSaveStatus('saving');
    if (noteDebounceTimerRef.current) {
      clearTimeout(noteDebounceTimerRef.current);
    }
    noteDebounceTimerRef.current = setTimeout(() => {
      handleSavePersonalNote(text);
    }, 1200);
  };

  const handleDeletePersonalNote = async () => {
    if (!currentLesson) return;
    try {
      await lmsApi.deleteLessonNote(currentLesson.id);
      setPersonalNote('');
      setNoteSaveStatus('idle');
      showNotification('Personal note deleted');
      lmsApi.getCourseNotes(resolvedCourseId).then(res => setCourseNotes(res?.notes || [])).catch(() => {});
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Track reading scroll progress and active heading in view
  const handleReadingScroll = () => {
    if (!readingAreaRef.current || !currentLesson) return;
    const { scrollTop, scrollHeight, clientHeight } = readingAreaRef.current;
    const totalScrollable = scrollHeight - clientHeight;
    if (totalScrollable <= 0) return;

    const currentPercent = Math.min(100, Math.round((scrollTop / totalScrollable) * 100));
    if (currentPercent > readingPercent) {
      setReadingPercent(currentPercent);

      // Throttled backend sync every 8 seconds
      const now = Date.now();
      if (now - lastProgressSyncRef.current > 8000) {
        lastProgressSyncRef.current = now;
        lmsApi.recordReadingProgress(resolvedCourseId, currentLesson.id, currentPercent).catch(() => {});
      }
    }

    // Active heading tracking
    if (headings.length > 0) {
      for (let i = headings.length - 1; i >= 0; i--) {
        const el = document.getElementById(headings[i].id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= 140) {
            setActiveHeadingId(headings[i].id);
            break;
          }
        }
      }
    }
  };

  // Explicit user action to mark lesson completed
  const handleManualComplete = async () => {
    if (!currentLesson) return;
    try {
      await lmsApi.completeLesson(resolvedCourseId, currentLesson.id);
      showNotification('Lesson marked as completed! Progression updated.');
      const fresh = await lmsApi.getStudentCurriculum(resolvedCourseId);
      setCurriculum(fresh.curriculum);
      setCourseData(fresh.course);
      if (fresh.course.progress_percent >= 100) {
        triggerConfetti();
        setIsCertModalOpen(true);
      }
      loadLesson(currentLesson.id);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Admin Instant Unlock Handler for Course, Modules, and Certificate
  const handleAdminInstantUnlock = async (withCertificate = false) => {
    try {
      setLoading(true);
      const res = await lmsApi.adminUnlockCourse({
        courseId: resolvedCourseId,
        unlockAllModules: true,
        unlockCertificate: withCertificate,
        reason: 'Instant admin unlock directly from classroom'
      });
      showNotification(res.message || 'Course & all modules unlocked successfully!');
      if (withCertificate && res.certificate) {
        setCertificate(res.certificate);
        setIsCertModalOpen(true);
        triggerConfetti();
      }
      await loadCourseCurriculum();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, optionId, isMultiple = false) => {
    if (isMultiple) {
      const prev = selectedAnswers[questionId] || [];
      const next = prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId];
      setSelectedAnswers({ ...selectedAnswers, [questionId]: next });
    } else {
      setSelectedAnswers({ ...selectedAnswers, [questionId]: optionId });
    }
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    if (!quizData) return;
    try {
      setQuizSubmitting(true);
      const answersPayload = Object.entries(selectedAnswers).map(([qId, optVal]) => {
        const question = quizData.questions?.find(q => q.id === qId);
        if (question?.question_type === 'SHORT_ANSWER') {
          return { questionId: qId, textResponse: String(optVal || '') };
        }
        if (Array.isArray(optVal)) {
          return { questionId: qId, selectedOptionIds: optVal };
        }
        return { questionId: qId, selectedOptionId: optVal };
      });

      const res = await lmsApi.submitQuiz(quizData.id, answersPayload);
      setQuizResult(res.attempt);

      if (res.attempt.is_passed) {
        triggerConfetti();
        const unlockMsg = res.attempt.is_module_unlocked && res.attempt.next_module_title
          ? ` Next module "${res.attempt.next_module_title}" unlocked.`
          : ' Prerequisites satisfied.';
        showNotification(`Congratulations! You passed with ${res.attempt.percentage}%.${unlockMsg}`);
      } else {
        showNotification(`You scored ${res.attempt.percentage}%. Passing is ${res.attempt.passing_percentage}%. Review the feedback below and try again!`, 'error');
      }

      // Refresh curriculum to unlock subsequent module if policy satisfied
      const fresh = await lmsApi.getStudentCurriculum(resolvedCourseId);
      setCurriculum(fresh.curriculum);
      setCourseData(fresh.course);
      if (fresh.course.progress_percent >= 100) {
        setIsCertModalOpen(true);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentData) return;
    try {
      setAssignmentSubmitting(true);
      await lmsApi.submitAssignment(assignmentData.id, {
        contentText: assignmentText,
        fileUrl: assignmentFileUrl
      });
      showNotification('Assignment submitted successfully! Awaiting instructor evaluation.');
      const fresh = await lmsApi.getStudentCurriculum(resolvedCourseId);
      setCurriculum(fresh.curriculum);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const scrollToHeading = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveHeadingId(id);
    }
    if (isMobile) {
      setMobileSection('reader');
    }
  };

  if (loading && !courseData) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', minHeight: '80vh' }}>
        <Sparkles size={36} color="var(--brand-green)" className="animate-spin" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Loading Codificators Classroom...</h2>
      </div>
    );
  }

  const isCourseComplete = courseData?.progress_percent >= 100;
  const { minutes: estimatedReadMins, wordCount } = calculateReadingTime(currentLesson?.content_markdown || currentLesson?.text_content || '');

  // Next lesson lock verification
  const nextLessonInfo = (() => {
    if (!currentLesson?.next_lesson) return null;
    for (const m of curriculum) {
      const found = m.lessons?.find(l => l.id === currentLesson.next_lesson.id);
      if (found) {
        return {
          ...currentLesson.next_lesson,
          isLocked: !m.is_unlocked,
          lockReason: m.lock_reason || 'Complete previous module requirements to unlock.'
        };
      }
    }
    return { ...currentLesson.next_lesson, isLocked: false, lockReason: null };
  })();

  const showToc = headings.length > 0 && isTocOpen;

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          background: notification.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          fontWeight: 700,
          boxShadow: 'var(--shadow-lg)'
        }}>
          {notification.msg}
        </div>
      )}

      {/* Classroom Top Header */}
      <header style={{
        minHeight: '64px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '12px 16px' : '0 24px',
        position: 'sticky',
        top: '64px',
        zIndex: 800,
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={onBackToCatalog}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={16} /> Course Catalog
          </button>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase' }}>
              Text-Based E-Learning Course
            </div>
            <h1 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 900, color: 'var(--text-primary)' }}>
              {courseData?.title}
            </h1>
          </div>
        </div>

        {/* Progress Metric & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: isMobile ? '80px' : '120px', height: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
              <div style={{ width: `${courseData?.progress_percent || 0}%`, height: '100%', background: isCourseComplete ? '#10b981' : 'var(--brand-green)', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {courseData?.progress_percent || 0}%
            </span>
          </div>

          {/* Admin Controls Toolbar (Visible to ADMIN & OPERATOR) */}
          {(activeUser?.role === 'ADMIN' || activeUser?.role === 'OPERATOR') && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px dashed #ef4444'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#dc2626', textTransform: 'uppercase' }}>
                ADMIN / OPERATOR
              </span>
              <button
                onClick={() => handleAdminInstantUnlock(false)}
                title="Admin: Unlock course and all its modules immediately"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  borderRadius: '4px',
                  background: 'var(--bg-card)',
                  color: '#059669',
                  border: '1px solid #10b981',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Unlock size={12} /> Unlock All Modules
              </button>
              <button
                onClick={() => handleAdminInstantUnlock(true)}
                title="Admin: Unlock course, all modules, and generate certificate immediately"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
                }}
              >
                <Award size={12} /> Unlock Course & Certificate
              </button>
            </div>
          )}

          {isCourseComplete ? (
            <button
              onClick={() => setIsCertModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <Award size={16} /> View Certificate
            </button>
          ) : (
            <button
              onClick={() => loadCourseCurriculum()}
              title="Sync progression from database"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} /> Sync
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Tabs for Clean Viewport Ergonomics */}
      {isMobile && (
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '8px 12px',
          gap: '8px',
          position: 'sticky',
          top: '128px',
          zIndex: 790
        }}>
          <button
            type="button"
            onClick={() => setMobileSection('curriculum')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '6px',
              background: mobileSection === 'curriculum' ? 'var(--brand-green)' : 'var(--bg-card)',
              color: mobileSection === 'curriculum' ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
          >
            <BookOpen size={13} /> Curriculum
          </button>
          <button
            type="button"
            onClick={() => setMobileSection('reader')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '6px',
              background: mobileSection === 'reader' ? 'var(--brand-green)' : 'var(--bg-card)',
              color: mobileSection === 'reader' ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
          >
            <FileText size={13} /> Notes
          </button>
          {headings.length > 0 && (
            <button
              type="button"
              onClick={() => setMobileSection('toc')}
              style={{
                flex: 1,
                padding: '8px 6px',
                borderRadius: '6px',
                background: mobileSection === 'toc' ? 'var(--brand-green)' : 'var(--bg-card)',
                color: mobileSection === 'toc' ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <AlignLeft size={13} /> TOC ({headings.length})
            </button>
          )}
        </div>
      )}

      {/* Main Distraction-Free Layout: Left Sidebar + Center Reading + Right TOC */}
      <div style={{
        display: isMobile ? 'block' : 'grid',
        gridTemplateColumns: isMobile
          ? '1fr'
          : showToc
            ? (isTablet ? '260px 1fr 220px' : '300px 1fr 240px')
            : (isTablet ? '260px 1fr' : '300px 1fr'),
        flex: 1,
        minHeight: 'calc(100vh - 64px)'
      }}>
        {/* Left Sidebar: Modules & Lessons */}
        <aside style={{
          display: (!isMobile || mobileSection === 'curriculum') ? 'block' : 'none',
          background: 'var(--bg-card)',
          borderRight: isMobile ? 'none' : '1px solid var(--border-color)',
          overflowY: 'auto',
          maxHeight: isMobile ? 'none' : 'calc(100vh - 64px)',
          padding: '16px'
        }}>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '14px' }}>
            Curriculum Progression
          </div>

          {curriculum.map((mod) => {
            const isModUnlocked = mod.is_unlocked;
            const isModCompleted = mod.is_completed;

            return (
              <div
                key={mod.id}
                style={{
                  marginBottom: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: isModUnlocked ? 'var(--bg-card)' : 'var(--bg-secondary)',
                  overflow: 'hidden',
                  opacity: isModUnlocked ? 1 : 0.75
                }}
              >
                {/* Module Header */}
                <div style={{
                  padding: '12px 14px',
                  background: isModUnlocked ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ flex: 1, paddingRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {!isModUnlocked && <Lock size={13} color="#ef4444" />}
                      {isModCompleted && <CheckCircle2 size={13} color="#10b981" />}
                      <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {mod.title}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                      {mod.completed_lessons_count} of {mod.total_required_lessons_count} lessons done
                    </div>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isModCompleted ? '#dcfce7' : isModUnlocked ? 'var(--brand-green-light)' : '#fee2e2',
                    color: isModCompleted ? '#16a34a' : isModUnlocked ? 'var(--brand-green)' : '#dc2626'
                  }}>
                    {isModCompleted ? 'Done' : isModUnlocked ? `${mod.progress_percent}%` : 'Locked'}
                  </span>
                </div>

                {/* Lock Explanation Banner if Locked */}
                {!isModUnlocked && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#fef2f2',
                    borderBottom: '1px solid #fee2e2',
                    fontSize: '11.5px',
                    color: '#991b1b',
                    lineHeight: '1.4',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px'
                  }}>
                    <Lock size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{mod.lock_reason || 'Complete previous module requirements to unlock.'}</span>
                  </div>
                )}

                {/* Lessons List */}
                <div style={{ padding: '6px' }}>
                  {mod.lessons?.map(les => {
                    const isSelected = currentLesson?.id === les.id;
                    const isLessonLocked = les.status === 'LOCKED';
                    const isLessonDone = les.status === 'COMPLETED';

                    return (
                      <div
                        key={les.id}
                        onClick={() => {
                          if (isLessonLocked) {
                            showNotification(mod.lock_reason, 'error');
                          } else {
                            loadLesson(les.id);
                            if (isMobile) setMobileSection('reader');
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          marginBottom: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: isLessonLocked ? 'not-allowed' : 'pointer',
                          background: isSelected ? 'var(--brand-green-light)' : 'transparent',
                          color: isSelected ? 'var(--brand-green)' : isLessonLocked ? 'var(--text-light)' : 'var(--text-primary)',
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: '12.5px',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          {isLessonDone ? (
                            <CheckCircle2 size={14} color="#10b981" />
                          ) : isLessonLocked ? (
                            <Lock size={14} color="#94a3b8" />
                          ) : (
                            <Circle size={14} color="var(--text-light)" />
                          )}
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {les.title}
                          </span>
                        </div>

                        <span style={{ fontSize: '11px', color: 'var(--text-light)', flexShrink: 0 }}>
                          {les.duration_minutes || 10}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        {/* Center Reading Stage */}
        <main
          ref={readingAreaRef}
          onScroll={handleReadingScroll}
          style={{
            display: (!isMobile || mobileSection === 'reader') ? 'block' : 'none',
            padding: isMobile ? '16px 14px' : '28px 48px',
            overflowY: 'auto',
            maxHeight: isMobile ? 'none' : 'calc(100vh - 64px)',
            scrollBehavior: 'smooth'
          }}
        >
          {currentLesson ? (
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              {/* Breadcrumb Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-light)', marginBottom: '8px' }}>
                <span>{courseData?.title}</span>
                <span>/</span>
                <span style={{ color: 'var(--brand-green)', fontWeight: 700 }}>{currentLesson.module?.title}</span>
              </div>

              {/* Lesson Title & Summary */}
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: '1.25' }}>
                  {currentLesson.title}
                </h1>
                {currentLesson.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '6px', lineHeight: '1.6' }}>
                    {currentLesson.description}
                  </p>
                )}
              </div>

              {/* Text-Based Reading Stats Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderRadius: '8px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                marginBottom: '24px',
                fontSize: '12.5px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Clock size={14} color="var(--brand-green)" />
                    <strong>{estimatedReadMins} min</strong> read ({wordCount} words)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <BookOpen size={14} color="var(--brand-green)" />
                    Structured Technical Notes
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Reading Progress:</span>
                    <div style={{ width: '90px', height: '6px', borderRadius: '3px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                      <div style={{ width: `${readingPercent}%`, height: '100%', background: 'var(--brand-green)', transition: 'width 0.2s ease' }} />
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--brand-green)' }}>{readingPercent}%</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleBookmark}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: isBookmarked ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                      background: isBookmarked ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary)',
                      color: isBookmarked ? '#d97706' : 'var(--text-secondary)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title={isBookmarked ? "Remove Bookmark" : "Bookmark this lesson for quick review"}
                  >
                    <Bookmark size={13} fill={isBookmarked ? "#f59e0b" : "none"} />
                    {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>

                  {headings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsTocOpen(!isTocOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: isTocOpen ? 'var(--brand-green-light)' : 'var(--bg-secondary)',
                        color: isTocOpen ? 'var(--brand-green)' : 'var(--text-secondary)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Toggle Table of Contents"
                    >
                      {isTocOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
                      TOC
                    </button>
                  )}
                </div>
              </div>

              {/* Lesson Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '8px' }}>
                <button
                  onClick={() => setActiveTab('notes')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: activeTab === 'notes' ? 800 : 600,
                    color: activeTab === 'notes' ? 'var(--brand-green)' : 'var(--text-secondary)',
                    borderBottom: activeTab === 'notes' ? '2px solid var(--brand-green)' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <BookOpen size={15} /> Lesson Content
                </button>

                <button
                  onClick={() => setActiveTab('personal-notes')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: activeTab === 'personal-notes' ? 800 : 600,
                    color: activeTab === 'personal-notes' ? 'var(--brand-green)' : 'var(--text-secondary)',
                    borderBottom: activeTab === 'personal-notes' ? '2px solid var(--brand-green)' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Edit3 size={15} /> My Study Notes {personalNote?.trim() ? '•' : ''}
                </button>

                <button
                  onClick={() => setActiveTab('resources')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: activeTab === 'resources' ? 800 : 600,
                    color: activeTab === 'resources' ? 'var(--brand-green)' : 'var(--text-secondary)',
                    borderBottom: activeTab === 'resources' ? '2px solid var(--brand-green)' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={15} /> Resources ({currentLesson.resources?.length || 0})
                </button>

                {quizData && (
                  <button
                    onClick={() => setActiveTab('quiz')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13.5px',
                      fontWeight: activeTab === 'quiz' ? 800 : 600,
                      color: activeTab === 'quiz' ? 'var(--brand-green)' : 'var(--text-secondary)',
                      borderBottom: activeTab === 'quiz' ? '2px solid var(--brand-green)' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <FileQuestion size={15} /> Module Quiz
                  </button>
                )}

                {assignmentData && (
                  <button
                    onClick={() => setActiveTab('assignment')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13.5px',
                      fontWeight: activeTab === 'assignment' ? 800 : 600,
                      color: activeTab === 'assignment' ? 'var(--brand-green)' : 'var(--text-secondary)',
                      borderBottom: activeTab === 'assignment' ? '2px solid var(--brand-green)' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <FileText size={15} /> Assignment
                  </button>
                )}

                {lessonExercises.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('coding')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13.5px',
                      fontWeight: activeTab === 'coding' ? 800 : 600,
                      color: activeTab === 'coding' ? '#3b82f6' : 'var(--text-secondary)',
                      borderBottom: activeTab === 'coding' ? '2px solid #3b82f6' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <Code2 size={15} /> Coding Practice ({lessonExercises.length})
                  </button>
                )}
              </div>

              {/* TAB 1: TEXT LESSON CONTENT */}
              {activeTab === 'notes' && (
                <div
                  className="classroom-drm-protected"
                  onContextMenu={(e) => {
                    e.preventDefault();
                  }}
                  onCopy={(e) => {
                    e.preventDefault();
                    showNotification('Content is protected by Codificator Intellectual Property DRM. Copying is restricted.', 'error');
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    padding: '32px 36px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                >
                  {/* Rich Markdown/Text Content Renderer */}
                  <LessonContentRenderer content={currentLesson.content_markdown || currentLesson.text_content} />

                  {/* Coding Practice Callout if exercises exist for this lesson */}
                  {lessonExercises.length > 0 && (
                    <div style={{
                      marginTop: '36px',
                      padding: '16px 20px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Code2 size={20} color="#3b82f6" />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                            Hands-On Coding Practice Available
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            This lesson includes {lessonExercises.length} interactive programming {lessonExercises.length === 1 ? 'exercise' : 'exercises'}.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('coding')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Open Coding Practice →
                      </button>
                    </div>
                  )}

                  {/* Manual Mark Complete Action */}
                  <div style={{
                    marginTop: '28px',
                    paddingTop: '24px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {currentLesson.progress?.status === 'COMPLETED' ? (
                        <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={16} /> Completed on {new Date(currentLesson.progress.completed_at || Date.now()).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>Read and understood the material? Mark lesson complete to record progress.</span>
                      )}
                    </div>

                    <button
                      onClick={handleManualComplete}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        background: currentLesson.progress?.status === 'COMPLETED' ? '#dcfce7' : 'var(--brand-green)',
                        color: currentLesson.progress?.status === 'COMPLETED' ? '#16a34a' : 'white',
                        border: currentLesson.progress?.status === 'COMPLETED' ? '1px solid #86efac' : 'none',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Check size={16} />
                      {currentLesson.progress?.status === 'COMPLETED' ? 'Completed' : 'Mark as Complete'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 1.5: PERSONAL STUDY NOTES */}
              {activeTab === 'personal-notes' && (
                <div style={{
                  background: 'var(--bg-card)',
                  padding: '28px 32px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                        Personal Study Notes
                      </h2>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Private notes for <strong>{currentLesson.title}</strong>. Auto-saves to your account.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        background: noteSaveStatus === 'saved' ? '#dcfce7' : noteSaveStatus === 'saving' ? '#fef3c7' : 'var(--bg-secondary)',
                        color: noteSaveStatus === 'saved' ? '#16a34a' : noteSaveStatus === 'saving' ? '#d97706' : 'var(--text-light)',
                        border: '1px solid var(--border-color)'
                      }}>
                        {noteSaveStatus === 'saving' ? 'Saving...' : noteSaveStatus === 'saved' ? 'Saved' : 'Autosave enabled'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSavePersonalNote(personalNote)}
                        disabled={noteSaveStatus === 'saving'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '6px',
                          background: 'var(--brand-green)',
                          color: 'white',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Save size={14} /> Save Note
                      </button>

                      {personalNote?.trim() && (
                        <button
                          type="button"
                          onClick={handleDeletePersonalNote}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '7px 12px',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: '#dc2626',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                          title="Delete note for this lesson"
                        >
                          <Trash2 size={13} /> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <textarea
                      value={personalNote}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      placeholder="Write your key takeaways, summaries, code snippets, or personal mnemonics here... (Markdown supported)"
                      rows={12}
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '13.5px',
                        lineHeight: '1.6',
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {personalNote?.trim() && (
                    <div style={{
                      padding: '16px 20px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      marginBottom: '24px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-light)', marginBottom: '10px' }}>
                        Note Preview
                      </div>
                      <LessonContentRenderer content={personalNote} />
                    </div>
                  )}

                  {/* Course Notes Notebook Overview */}
                  {courseNotes.length > 0 && (
                    <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>
                        Notebook Overview ({courseNotes.length} {courseNotes.length === 1 ? 'lesson note' : 'lesson notes'} in this course)
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {courseNotes.map(n => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (n.lesson_id !== currentLesson.id) {
                                loadLesson(n.lesson_id);
                              }
                            }}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '6px',
                              background: n.lesson_id === currentLesson.id ? 'var(--brand-green-light)' : 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {n.lesson_title}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                                Updated {new Date(n.updated_at).toLocaleDateString()} • {n.content.length} characters
                              </div>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--brand-green)', fontWeight: 700 }}>
                              {n.lesson_id === currentLesson.id ? 'Current Lesson' : 'Jump to Lesson →'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DOWNLOADABLE RESOURCES */}
              {activeTab === 'resources' && (
                <div style={{ background: 'var(--bg-card)', padding: '28px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px' }}>Downloadable Learning Materials</h3>
                  {(!currentLesson.resources || currentLesson.resources.length === 0) ? (
                    <div style={{ color: 'var(--text-light)', fontSize: '13px' }}>
                      No downloadable files attached to this lesson. You can also view master notes in the course catalog.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {currentLesson.resources.map(res => (
                        <div key={res.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Download size={18} color="var(--brand-green)" />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{res.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{res.file_type} • {res.file_size}</div>
                            </div>
                          </div>
                          <a
                            href={res.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              background: 'var(--brand-green-light)',
                              color: 'var(--brand-green)',
                              fontWeight: 700,
                              fontSize: '12px',
                              textDecoration: 'none'
                            }}
                          >
                            Open File
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MODULE QUIZ */}
              {activeTab === 'quiz' && quizData && (
                <div style={{ background: 'var(--bg-card)', padding: '28px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{quizData.title}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                        Passing threshold: {quizData.passing_percentage}% • Time Limit: {quizData.time_limit_minutes} min • {quizData.questions?.length || 0} Questions
                      </p>
                    </div>

                    {quizResult && (
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontWeight: 800,
                        fontSize: '13px',
                        background: quizResult.is_passed ? '#dcfce7' : '#fee2e2',
                        color: quizResult.is_passed ? '#16a34a' : '#dc2626'
                      }}>
                        {quizResult.is_passed ? `Passed: ${quizResult.percentage}%` : `Score: ${quizResult.percentage}% (Needs Review)`}
                      </span>
                    )}
                  </div>

                  {quizResult && quizResult.is_passed && (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      padding: '14px 18px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      color: '#166534',
                      fontSize: '13.5px'
                    }}>
                      <strong>Assessment Passed ({quizResult.score} / {quizResult.max_score} pts):</strong>{' '}
                      {quizResult.is_module_unlocked && quizResult.next_module_title
                        ? `Module progression criteria satisfied. "${quizResult.next_module_title}" is now unlocked in your curriculum!`
                        : 'Great work! You have satisfied the assessment requirements for this module.'}
                    </div>
                  )}

                  {quizResult && !quizResult.is_passed && (
                    <div style={{
                      background: '#fef2f2',
                      border: '1px solid #fca5a5',
                      padding: '14px 18px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      color: '#991b1b',
                      fontSize: '13.5px'
                    }}>
                      <strong>Passing Score Not Reached:</strong> You achieved {quizResult.percentage}% (required: {quizResult.passing_percentage}%). Review the question explanations and recommended concept references below, then retake the assessment.
                    </div>
                  )}

                  <form onSubmit={handleSubmitQuiz}>
                    {quizData.questions?.map((q, qIdx) => {
                      const evalAns = quizResult?.evaluated_answers?.find(a => a.questionId === q.id);

                      return (
                        <div key={q.id} style={{
                          marginBottom: '20px',
                          padding: '18px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          border: evalAns ? (evalAns.isCorrect ? '1px solid #86efac' : '1px solid #fca5a5') : '1px solid var(--border-color)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '14px' }}>Question {qIdx + 1}</span>
                              <span style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'var(--bg-card)',
                                color: 'var(--text-secondary)',
                                fontWeight: 700
                              }}>
                                {q.question_type === 'MULTIPLE_CHOICE' ? 'Multi-Select' : q.question_type === 'SHORT_ANSWER' ? 'Short Answer' : q.question_type === 'TRUE_FALSE' ? 'True / False' : 'Single Choice'}
                              </span>
                            </div>

                            {evalAns && (
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '4px',
                                background: evalAns.isCorrect ? '#dcfce7' : '#fee2e2',
                                color: evalAns.isCorrect ? '#16a34a' : '#dc2626'
                              }}>
                                {evalAns.isCorrect ? `Correct (+${evalAns.marksAwarded} pt)` : 'Incorrect (0 pts)'}
                              </span>
                            )}
                          </div>

                          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px', lineHeight: '1.5' }}>
                            {q.prompt}
                          </div>

                          {q.question_type === 'SHORT_ANSWER' ? (
                            <div>
                              <input
                                type="text"
                                disabled={Boolean(quizResult)}
                                value={selectedAnswers[q.id] || ''}
                                onChange={e => setSelectedAnswers({ ...selectedAnswers, [q.id]: e.target.value })}
                                placeholder="Type exact answer (e.g., keyword or function name)..."
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  borderRadius: '6px',
                                  border: evalAns ? (evalAns.isCorrect ? '2px solid #22c55e' : '2px solid #ef4444') : '1px solid var(--border-color)',
                                  background: 'var(--bg-card)',
                                  color: 'var(--text-primary)',
                                  fontSize: '14px'
                                }}
                              />
                              {evalAns && !evalAns.isCorrect && (
                                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '6px', fontWeight: 600 }}>
                                  Accepted Answer: {evalAns.correctOptions?.join(' or ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {q.options?.map(opt => {
                                const isChecked = q.question_type === 'MULTIPLE_CHOICE'
                                  ? (selectedAnswers[q.id] || []).includes(opt.id)
                                  : selectedAnswers[q.id] === opt.id;

                                const isCorrectOpt = evalAns?.correctOptionIds?.includes(opt.id);
                                const isWrongSelection = isChecked && evalAns && !isCorrectOpt;

                                let optBorder = isChecked ? '1px solid var(--brand-green)' : '1px solid var(--border-color)';
                                let optBg = isChecked ? 'var(--brand-green-light)' : 'var(--bg-card)';
                                if (evalAns) {
                                  if (isCorrectOpt) {
                                    optBorder = '2px solid #22c55e';
                                    optBg = '#f0fdf4';
                                  } else if (isWrongSelection) {
                                    optBorder = '2px solid #ef4444';
                                    optBg = '#fef2f2';
                                  }
                                }

                                return (
                                  <label
                                    key={opt.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      padding: '9px 12px',
                                      borderRadius: '6px',
                                      background: optBg,
                                      border: optBorder,
                                      cursor: quizResult ? 'default' : 'pointer',
                                      fontSize: '13.5px'
                                    }}
                                  >
                                    <input
                                      type={q.question_type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                                      name={q.id}
                                      disabled={Boolean(quizResult)}
                                      checked={isChecked}
                                      onChange={() => handleAnswerSelect(q.id, opt.id, q.question_type === 'MULTIPLE_CHOICE')}
                                    />
                                    <span style={{ flex: 1 }}>{opt.text}</span>
                                    {evalAns && isCorrectOpt && (
                                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800 }}>Correct Option</span>
                                    )}
                                    {isWrongSelection && (
                                      <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 800 }}>Your Choice</span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {evalAns && (
                            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                <strong>Explanation:</strong> {evalAns.explanation}
                              </div>
                              {evalAns.conceptToReview && (
                                <div style={{
                                  marginTop: '8px',
                                  padding: '8px 12px',
                                  background: 'var(--bg-card)',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'var(--brand-green)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <strong>Recommended Review:</strong> {evalAns.conceptToReview}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                      {quizResult ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setQuizResult(null);
                              setSelectedAnswers({});
                            }}
                            style={{
                              padding: '10px 20px',
                              borderRadius: '6px',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              fontWeight: 700,
                              fontSize: '14px',
                              cursor: 'pointer'
                            }}
                          >
                            Retake Assessment
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('notes')}
                            style={{
                              padding: '10px 24px',
                              borderRadius: '6px',
                              background: 'var(--brand-green)',
                              color: 'white',
                              border: 'none',
                              fontWeight: 800,
                              fontSize: '14px',
                              cursor: 'pointer'
                            }}
                          >
                            Return to Lesson Notes
                          </button>
                        </>
                      ) : (
                        <button
                          type="submit"
                          disabled={quizSubmitting}
                          style={{
                            padding: '10px 24px',
                            borderRadius: '6px',
                            background: 'var(--brand-green)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          {quizSubmitting ? 'Evaluating...' : 'Submit Answers'}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: ASSIGNMENT */}
              {activeTab === 'assignment' && assignmentData && (
                <div style={{ background: 'var(--bg-card)', padding: '28px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{assignmentData.title}</h3>
                    <span style={{ fontSize: '12px', background: '#e0e7ff', color: '#4f46e5', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                      Max Marks: {assignmentData.max_marks} pts
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '18px', whiteSpace: 'pre-wrap' }}>
                    {assignmentData.instructions}
                  </div>

                  <form onSubmit={handleSubmitAssignment}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                        Your Written Response or Code Implementation
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={assignmentText}
                        onChange={(e) => setAssignmentText(e.target.value)}
                        placeholder="Paste your source code or project notes here..."
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                      />
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                        Public GitHub Repo or Cloud File URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={assignmentFileUrl}
                        onChange={(e) => setAssignmentFileUrl(e.target.value)}
                        placeholder="https://github.com/your-username/codificator-project"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={assignmentSubmitting}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '6px',
                        background: 'var(--brand-green)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        cursor: 'pointer'
                      }}
                    >
                      {assignmentSubmitting ? 'Submitting...' : 'Submit Assignment for Instructor Grading'}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 5: CODING PRACTICE */}
              {activeTab === 'coding' && (
                <div style={{
                  background: 'var(--bg-card)',
                  padding: '24px 28px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                      Interactive Coding Practice
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                      Write, test, and submit your code solutions. All code is executed in an isolated runtime environment with automated test case validation.
                    </p>
                  </div>

                  {lessonExercises.map((ex) => (
                    <CodingExerciseWidget key={ex.id} exercise={ex} />
                  ))}
                </div>
              )}

              {/* Prev / Next Navigation Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '36px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', gap: '16px' }}>
                {currentLesson.prev_lesson ? (
                  <button
                    onClick={() => loadLesson(currentLesson.prev_lesson.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <ChevronLeft size={16} /> Previous: {currentLesson.prev_lesson.title}
                  </button>
                ) : <div />}

                {nextLessonInfo && (
                  <button
                    onClick={() => {
                      if (nextLessonInfo.isLocked) {
                        showNotification(`Lesson Locked: ${nextLessonInfo.lockReason}`, 'error');
                      } else {
                        loadLesson(nextLessonInfo.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      background: nextLessonInfo.isLocked ? '#f3f4f6' : 'var(--brand-green)',
                      color: nextLessonInfo.isLocked ? '#9ca3af' : 'white',
                      border: nextLessonInfo.isLocked ? '1px solid #d1d5db' : 'none',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: nextLessonInfo.isLocked ? 'not-allowed' : 'pointer'
                    }}
                    title={nextLessonInfo.isLocked ? nextLessonInfo.lockReason : `Next: ${nextLessonInfo.title}`}
                  >
                    {nextLessonInfo.isLocked ? (
                      <>
                        <Lock size={14} /> Next: {nextLessonInfo.title} (Locked)
                      </>
                    ) : (
                      <>
                        Next: {nextLessonInfo.title} <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-light)' }}>
              <BookOpen size={48} style={{ marginBottom: '12px' }} />
              <p>Select an unlocked lesson from the curriculum sidebar to begin reading.</p>
            </div>
          )}
        </main>

        {/* Right Sidebar: Dynamic Table of Contents (Auto-hidden if no headings) */}
        {showToc && (
          <aside style={{
            display: (!isMobile || mobileSection === 'toc') ? 'block' : 'none',
            background: 'var(--bg-card)',
            borderLeft: isMobile ? 'none' : '1px solid var(--border-color)',
            overflowY: 'auto',
            maxHeight: isMobile ? 'none' : 'calc(100vh - 64px)',
            padding: '20px 16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <AlignLeft size={14} color="var(--brand-green)" />
                <span>Table of Contents</span>
              </div>

              <button
                type="button"
                onClick={() => setIsTocOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', padding: '2px' }}
                title="Collapse TOC"
              >
                <PanelRightClose size={13} />
              </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {headings.map((h, hIdx) => {
                const isActive = activeHeadingId === h.id;
                return (
                  <button
                    key={hIdx}
                    type="button"
                    onClick={() => scrollToHeading(h.id)}
                    style={{
                      textAlign: 'left',
                      background: isActive ? 'var(--brand-green-light)' : 'none',
                      border: 'none',
                      padding: '5px 8px',
                      borderRadius: '5px',
                      fontSize: h.level === 1 ? '12.5px' : h.level === 2 ? '12px' : '11.5px',
                      fontWeight: isActive ? 800 : h.level === 1 ? 700 : 500,
                      paddingLeft: `${(h.level - 1) * 10 + 8}px`,
                      color: isActive ? 'var(--brand-green)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      lineHeight: '1.4',
                      borderLeft: isActive ? '2px solid var(--brand-green)' : '2px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {h.text}
                  </button>
                );
              })}
            </nav>

            <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '11.5px', color: 'var(--text-light)', lineHeight: '1.5' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Study Tip</div>
              Read through each section, review syntax examples, and test key takeaways before marking complete.
            </div>
          </aside>
        )}
      </div>

      {/* CERTIFICATE MODAL */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        certificateId={certificate?.certificate_code || 'CFWD-2026-10427'}
        issuedOn={certificate?.issue_date ? new Date(certificate.issue_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase() : '21 OCT 2026'}
        studentName={certificate?.student_name || 'Abhay Rana'}
        courseTitle={courseData?.title || 'Full-Stack Web Development Course'}
        studyHours={courseData?.estimated_duration || '120 Hours'}
        courseDuration="4 Weeks"
        skillLevel={courseData?.level || 'Beginner to Intermediate'}
        onNavigateVerify={(code) => {
          setIsCertModalOpen(false);
          if (onNavigateVerify) onNavigateVerify(code);
        }}
      />
    </div>
  );
}
