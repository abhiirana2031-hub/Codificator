import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle2, Circle, BookOpen, HelpCircle, ArrowRight, Award, ShieldCheck, Download, Sparkles, Code2, Play, Lock, Check, AlertCircle, FileCode, RotateCcw, Target, Compass, Lightbulb, AlertTriangle, Scale, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { coursesList } from '../data/coursesData';
import { curriculumCatalog } from '../data/curriculum/catalog';
import LessonContentRenderer from './LessonContentRenderer';

export default function ClassroomView({
  courseId = "placement-360-cip",
  onBackToCatalog,
  completedLessons = [],
  onLessonComplete
}) {
  const allAvailableCourses = [
    ...coursesList,
    ...curriculumCatalog.filter(c => !coursesList.some(cl => cl.id === c.id))
  ];
  const course = allAvailableCourses.find(c => c.id === courseId) || allAvailableCourses[0];

  // Flatten all lessons (supporting both modules.chapters.lessons and modules.lessons)
  const allLessons = [];
  if (course && course.modules) {
    course.modules.forEach(m => {
      if (m.chapters && m.chapters.length > 0) {
        m.chapters.forEach(ch => {
          if (ch.lessons && ch.lessons.length > 0) {
            ch.lessons.forEach(l => {
              allLessons.push({ ...l, moduleTitle: m.title, chapterTitle: ch.title });
            });
          }
        });
      } else if (m.lessons && m.lessons.length > 0) {
        m.lessons.forEach(l => {
          allLessons.push({ ...l, moduleTitle: m.title });
        });
      }
    });
  }

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'assignment' | 'quiz'
  
  // Assignment state
  const [assignmentCode, setAssignmentCode] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [assignmentPassed, setAssignmentPassed] = useState(false);

  // Quiz state
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  const [showCertificate, setShowCertificate] = useState(false);

  // Current lesson object
  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];

  // Normalize assignment and quiz
  const activeAssignment = currentLesson?.assignment || (currentLesson?.exercises && currentLesson.exercises[0] ? {
    title: `Coding Exercise: ${currentLesson.title}`,
    instructions: currentLesson.exercises[0].prompt,
    starterCode: currentLesson.exercises[0].starterCode || '// Write your solution here',
    testCases: currentLesson.exercises[0].testCases || []
  } : null);

  const activeQuiz = Array.isArray(currentLesson?.quiz)
    ? currentLesson.quiz[0]
    : currentLesson?.quiz;

  // Reset when courseId or lesson changes
  useEffect(() => {
    setCurrentLessonIndex(0);
    setActiveTab('notes');
    setSelectedQuizAnswer(null);
    setQuizChecked(false);
    setQuizPassed(false);
    setTestResults(null);
    setAssignmentPassed(false);
  }, [courseId]);

  useEffect(() => {
    if (activeAssignment) {
      setAssignmentCode(activeAssignment.starterCode || '');
      setTestResults(null);
      setAssignmentPassed(false);
    }
    setSelectedQuizAnswer(null);
    setQuizChecked(false);
    setQuizPassed(false);
    setActiveTab('notes');
  }, [currentLessonIndex, courseId]);

  if (!course) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <BookOpen size={48} color="var(--text-light)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>No Courses Available</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          All course catalog entries have been removed.
        </p>
        <button onClick={onBackToCatalog} className="btn-primary">
          Back to Catalog
        </button>
      </div>
    );
  }

  // Check if currently viewed lesson was already completed previously
  const isCurrentLessonAlreadyCompleted = completedLessons.includes(currentLesson?.id);

  // Ready to unlock next lesson?
  const canProceed = isCurrentLessonAlreadyCompleted || (quizPassed && (activeAssignment ? assignmentPassed : true));

  // Progress calculations
  const finishedCount = allLessons.filter(l => completedLessons.includes(l.id)).length;
  const progressPercent = allLessons.length > 0 ? Math.round((finishedCount / allLessons.length) * 100) : 0;

  // Run assignment unit tests
  const handleRunAssignment = () => {
    if (!activeAssignment) return;
    const testCases = activeAssignment.testCases || [];
    const results = [];
    let allPassed = true;

    try {
      // Evaluate user code safely in browser context
      const userFunc = new Function(`
        ${assignmentCode}
        const funcName = (${JSON.stringify(activeAssignment.starterCode || '')}).match(/function\\s+([a-zA-Z0-9_]+)/)?.[1] || (${JSON.stringify(assignmentCode || '')}).match(/function\\s+([a-zA-Z0-9_]+)/)?.[1];
        if (funcName && typeof eval(funcName) === 'function') {
          return eval(funcName);
        }
        throw new Error("Could not find function definition.");
      `)();

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        let actual;
        if (typeof tc.input === 'object' && tc.input !== null && !Array.isArray(tc.input)) {
          actual = userFunc(...Object.values(tc.input));
        } else {
          actual = userFunc(tc.input);
        }

        const passed = JSON.stringify(actual) === JSON.stringify(tc.expected);
        if (!passed) allPassed = false;

        results.push({
          testNum: i + 1,
          input: JSON.stringify(tc.input),
          expected: JSON.stringify(tc.expected),
          actual: JSON.stringify(actual),
          passed
        });
      }

      setTestResults(results);
      if (allPassed) {
        setAssignmentPassed(true);
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } else {
        setAssignmentPassed(false);
      }
    } catch (err) {
      setTestResults([{ error: err.message }]);
      setAssignmentPassed(false);
    }
  };

  // Check quiz answer
  const handleVerifyQuiz = () => {
    if (!activeQuiz) return;
    setQuizChecked(true);
    if (selectedQuizAnswer === activeQuiz.correctIndex) {
      setQuizPassed(true);
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } });
    } else {
      setQuizPassed(false);
    }
  };

  // Complete lesson & Unlock Next
  const handleCompleteAndNext = () => {
    if (!canProceed) return;

    onLessonComplete(currentLesson.id);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (currentLessonIndex < allLessons.length - 1) {
      setCurrentLessonIndex(prev => prev + 1);
    } else {
      setShowCertificate(true);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)'
    }}>
      {/* TOP SAAS CLASSROOM APP BAR */}
      <header style={{
        height: '64px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBackToCatalog}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={16} /> Course Catalog
          </button>

          <div>
            <span style={{ fontSize: '11px', color: 'var(--primary-color)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {course.category}
            </span>
            <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
              {course.title}
            </h2>
          </div>
        </div>

        {/* Course Progress & Gate Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '160px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Lesson {currentLessonIndex + 1} of {allLessons.length}</span>
              <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>{progressPercent}% Done</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Unlock / Next Lesson CTA */}
          <button
            onClick={handleCompleteAndNext}
            disabled={!canProceed}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: canProceed ? 'var(--primary-color)' : 'var(--bg-primary)',
              color: canProceed ? '#ffffff' : 'var(--text-muted)',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              fontWeight: 700,
              fontSize: '13.5px',
              boxShadow: canProceed ? '0 4px 14px rgba(47, 141, 70, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {canProceed ? (
              <>
                <span>{currentLessonIndex === allLessons.length - 1 ? 'Finish Course & Get Certificate' : 'Next Lesson'}</span>
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>Pass Quiz & Assignment to Unlock</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        flex: 1,
        minHeight: 'calc(100vh - 64px)'
      }}>
        {/* LEFT SYLLABUS SIDEBAR */}
        <aside style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          overflowY: 'auto',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>
              COURSE SYLLABUS
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Completed {finishedCount} / {allLessons.length} Lessons
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {course.modules?.map((module) => {
              const lessonsToRender = module.chapters
                ? module.chapters.flatMap(ch => ch.lessons || [])
                : (module.lessons || []);

              return (
                <div key={module.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    padding: '4px 8px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {module.title}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {lessonsToRender.map((lesson) => {
                      const idx = allLessons.findIndex(al => al.id === lesson.id);
                      const isSelected = idx === currentLessonIndex;
                      const isDone = completedLessons.includes(lesson.id);

                      return (
                        <div
                          key={lesson.id}
                          onClick={() => setCurrentLessonIndex(idx >= 0 ? idx : 0)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isSelected ? 'var(--brand-green-light)' : 'transparent',
                            color: isSelected ? 'var(--brand-green)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? '700' : '500',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {isDone ? (
                            <CheckCircle2 size={16} color="var(--brand-green)" />
                          ) : isSelected ? (
                            <Circle size={16} color="var(--brand-green)" />
                          ) : (
                            <Circle size={16} color="var(--text-muted)" opacity={0.5} />
                          )}

                          <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lesson.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Certificate Banner */}
          <div style={{
            marginTop: 'auto',
            background: 'var(--bg-primary)',
            border: '1.5px dashed var(--primary-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center'
          }}>
            <Award size={28} color="var(--primary-color)" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Verified Certification
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 10px 0' }}>
              Complete all quizzes & coding assignments to unlock.
            </div>
            <button
              onClick={() => setShowCertificate(true)}
              disabled={progressPercent < 100}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: progressPercent === 100 ? 'var(--primary-color)' : 'var(--bg-secondary)',
                color: progressPercent === 100 ? '#fff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '12px',
                cursor: progressPercent === 100 ? 'pointer' : 'not-allowed'
              }}
            >
              {progressPercent === 100 ? 'Claim Certificate' : `${progressPercent}% Completed`}
            </button>
          </div>
        </aside>

        {/* RIGHT INTERACTIVE COURSEWARE READER */}
        <main style={{
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-primary)'
        }}>
          {/* LESSON SUB-NAV TABS */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setActiveTab('notes')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  border: 'none',
                  borderBottom: activeTab === 'notes' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  background: 'transparent',
                  color: activeTab === 'notes' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'notes' ? 700 : 500,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <BookOpen size={16} /> Complete Detailed Notes
              </button>

              <button
                onClick={() => setActiveTab('assignment')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  border: 'none',
                  borderBottom: activeTab === 'assignment' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  background: 'transparent',
                  color: activeTab === 'assignment' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'assignment' ? 700 : 500,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <FileCode size={16} /> Hands-on Assignment
                {assignmentPassed ? (
                  <span style={{ fontSize: '10px', background: '#22c55e', color: '#fff', padding: '1px 6px', borderRadius: 'var(--radius-pill)', fontWeight: 800 }}>PASSED</span>
                ) : (
                  <span style={{ fontSize: '10px', background: '#f59e0b', color: '#fff', padding: '1px 6px', borderRadius: 'var(--radius-pill)', fontWeight: 800 }}>REQUIRED</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  border: 'none',
                  borderBottom: activeTab === 'quiz' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  background: 'transparent',
                  color: activeTab === 'quiz' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'quiz' ? 700 : 500,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <HelpCircle size={16} /> Checkpoint Quiz
                {quizPassed ? (
                  <span style={{ fontSize: '10px', background: '#22c55e', color: '#fff', padding: '1px 6px', borderRadius: 'var(--radius-pill)', fontWeight: 800 }}>PASSED</span>
                ) : (
                  <span style={{ fontSize: '10px', background: '#f59e0b', color: '#fff', padding: '1px 6px', borderRadius: 'var(--radius-pill)', fontWeight: 800 }}>REQUIRED</span>
                )}
              </button>
            </div>

            {/* Read Time */}
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {currentLesson.readTime || '12 min read'}
            </span>
          </div>

          {/* TAB 1: DETAILED LESSON NOTES (12-SECTION TEXTBOOK PEDAGOGY) */}
          {activeTab === 'notes' && (
            <div style={{ padding: '36px', maxWidth: '940px', margin: '0 auto', width: '100%', lineHeight: 1.7 }}>
              
              {/* Review Status & Provenance Header */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {currentLesson.reviewStatus === 'verified' ? (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={13} /> Verified OER Core
                    </span>
                  ) : currentLesson.reviewStatus === 'ai-assisted' ? (
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={13} /> AI-Assisted (Under Editorial Review)
                    </span>
                  ) : null}

                  {currentLesson.metadata?.licenseRecord?.type && (
                    <span style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: '11px', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                      License: {currentLesson.metadata.licenseRecord.type}
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {currentLesson.moduleTitle} {currentLesson.chapterTitle ? `• ${currentLesson.chapterTitle}` : ''}
                </span>

                <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 12px 0' }}>
                  {currentLesson.title}
                </h1>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span>{currentLesson.metadata?.licenseRecord?.author || 'Codificator Curriculum Team'}</span>
                  <span>•</span>
                  <span>Reviewed: {currentLesson.lastReviewedDate || 'Oct 2026'}</span>
                </div>
              </div>

              {/* SECTION 1: LEARNING OBJECTIVES */}
              {currentLesson.objectives && currentLesson.objectives.length > 0 && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px 24px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 800, fontSize: '14px', marginBottom: '10px' }}>
                    <Target size={18} /> 1. LEARNING OBJECTIVES
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14.5px', color: 'var(--text-primary)', lineHeight: 1.7 }}>
                    {currentLesson.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* SECTION 2: PREREQUISITES */}
              {currentLesson.prerequisites && currentLesson.prerequisites.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  padding: '12px 18px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '24px',
                  fontSize: '13px'
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Compass size={15} /> 2. Prerequisites:
                  </span>
                  {currentLesson.prerequisites.map((p, i) => (
                    <span key={i} style={{ background: 'var(--bg-card)', padding: '2px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                      {p.title}
                    </span>
                  ))}
                </div>
              )}

              {/* SECTION 3: DETAILED ORIGINAL EXPLANATIONS */}
              <div style={{
                fontSize: '15.5px',
                color: 'var(--text-primary)',
                background: 'var(--bg-card)',
                padding: '30px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '24px'
              }}>
                <LessonContentRenderer content={currentLesson.notes || currentLesson.explanation || currentLesson.content} />
              </div>

              {/* SECTION 4: DEFINITIONS AND KEY CONCEPTS */}
              {currentLesson.keyConcepts && currentLesson.keyConcepts.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lightbulb size={18} color="var(--primary-color)" /> 4. Definitions & Key Concepts
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    {currentLesson.keyConcepts.map((kc, i) => (
                      <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary-color)', marginBottom: '4px' }}>{kc.term}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{kc.definition}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 5: STEP-BY-STEP WORKED EXAMPLES */}
              {currentLesson.workedExamples && currentLesson.workedExamples.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px' }}>
                    5. Step-by-Step Worked Examples
                  </h3>
                  {currentLesson.workedExamples.map((ex, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>{ex.title}</h4>
                      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>{ex.scenario}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {ex.steps.map((st, sIdx) => (
                          <div key={sIdx} style={{ display: 'flex', gap: '12px', fontSize: '13px', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontWeight: 800, color: 'var(--primary-color)' }}>Step {st.stepNumber}:</span>
                            <div>
                              <span style={{ fontWeight: 600 }}>{st.action} — </span>
                              <span style={{ color: 'var(--text-secondary)' }}>{st.stateSnapshot}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {ex.result && (
                        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', fontWeight: 700, borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                          Result: {ex.result}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 6: PRODUCTION CODE SNIPPETS */}
              {currentLesson.codeSnippets && currentLesson.codeSnippets.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Code2 size={18} color="var(--primary-color)" /> 6. Production Code Snippets
                  </h3>
                  {currentLesson.codeSnippets.map((cs, i) => (
                    <div key={i} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                      <div style={{ background: '#1e293b', color: '#94a3b8', padding: '8px 16px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{cs.title}</span>
                        <span style={{ textTransform: 'uppercase', fontWeight: 700, color: '#38bdf8' }}>{cs.language}</span>
                      </div>
                      <pre style={{ margin: 0, padding: '16px', background: '#0f172a', color: '#e2e8f0', fontSize: '13px', overflowX: 'auto', fontFamily: 'monospace' }}>
                        <code>{cs.code}</code>
                      </pre>
                      {cs.annotation && (
                        <div style={{ padding: '8px 14px', background: 'var(--bg-secondary)', fontSize: '12.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
                          Note: {cs.annotation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 7: COMMON MISTAKES & CORRECTIONS */}
              {currentLesson.pitfalls && currentLesson.pitfalls.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626' }}>
                    <AlertTriangle size={18} /> 7. Common Mistakes & Corrections
                  </h3>
                  {currentLesson.pitfalls.map((pf, i) => (
                    <div key={i} style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', padding: '14px 18px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#dc2626', marginBottom: '4px' }}>Mistake: {pf.mistake}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}><strong>Why it happens:</strong> {pf.whyItHappens}</div>
                      <div style={{ fontSize: '13px', color: '#16a34a' }}><strong>Correction:</strong> {pf.correction}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 8: DIAGRAMS AND REFERENCE TABLES */}
              {currentLesson.visualAids && currentLesson.visualAids.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px' }}>
                    8. Diagrams & Structured Reference Tables
                  </h3>
                  {currentLesson.visualAids.map((va, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '14.5px', fontWeight: 800, margin: '0 0 10px 0' }}>{va.title}</h4>
                      <div style={{ fontSize: '13.5px', whiteSpace: 'pre-line', overflowX: 'auto' }}>
                        {va.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 11: CHAPTER SUMMARY & REVISION NOTES */}
              {currentLesson.summary && (
                <div style={{ marginBottom: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 10px 0' }}>
                    11. Chapter Summary & Revision Notes
                  </h3>
                  <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {currentLesson.summary.takeaways.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                  {currentLesson.summary.quickCheatSheet && (
                    <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px', fontFamily: 'monospace' }}>
                      <strong>Quick CheatSheet:</strong> {currentLesson.summary.quickCheatSheet}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 12: FURTHER READING & VERIFIED PROVENANCE */}
              {currentLesson.metadata && (
                <div style={{ marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '18px 22px', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Scale size={16} color="var(--primary-color)" /> 12. Further Reading & Verified License Provenance
                  </div>
                  {currentLesson.metadata.licenseRecord && (
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      <strong>Legal License:</strong> {currentLesson.metadata.licenseRecord.type} • {currentLesson.metadata.licenseRecord.attributionText}
                    </div>
                  )}
                  {currentLesson.metadata.furtherReading && currentLesson.metadata.furtherReading.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-muted)' }}>
                      {currentLesson.metadata.furtherReading.map((fr, i) => (
                        <li key={i}>
                          <a href={fr.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>
                            {fr.title}
                          </a>
                          {' '}- {fr.annotation}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Next Step Prompts */}
              <div style={{
                marginTop: '32px',
                padding: '20px 24px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>Ready to test your comprehension?</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Complete the hands-on assignment and checkpoint quiz to unlock the next lesson.</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setActiveTab('assignment')}
                    style={{
                      background: 'var(--primary-color)',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Go to Assignment →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HANDS-ON CODING ASSIGNMENT */}
          {activeTab === 'assignment' && activeAssignment && (
            <div style={{ padding: '36px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 800, textTransform: 'uppercase' }}>
                  SECTION 9: HANDS-ON CODING ASSIGNMENT
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '6px 0 10px 0' }}>
                  {activeAssignment.title}
                </h2>
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderLeft: '4px solid var(--primary-color)',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14.5px',
                  lineHeight: 1.6
                }}>
                  {activeAssignment.instructions}
                </div>
              </div>

              {/* Code Editor Container */}
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                marginBottom: '20px'
              }}>
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    JavaScript Solution Sandbox
                  </span>
                  <button
                    onClick={() => setAssignmentCode(activeAssignment.starterCode || '')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>

                <textarea
                  value={assignmentCode}
                  onChange={(e) => setAssignmentCode(e.target.value)}
                  rows={12}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontFamily: 'var(--font-code)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    border: 'none',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Evaluates across {(activeAssignment.testCases || []).length} automated test cases.
                </div>
                <button
                  onClick={handleRunAssignment}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--primary-color)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <Play size={16} /> Run & Verify Assignment
                </button>
              </div>

              {/* Test Results Display */}
              {testResults && (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {assignmentPassed ? (
                      <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={18} /> All Test Cases Passed! Assignment Completed.
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={18} /> Some Test Cases Failed. Please review output below.
                      </span>
                    )}
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {testResults.map((tr, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: tr.passed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          border: `1px solid ${tr.passed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          fontSize: '13px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        {tr.error ? (
                          <div style={{ color: '#ef4444' }}>Runtime Error: {tr.error}</div>
                        ) : (
                          <>
                            <div>
                              <strong>Test Case {tr.testNum}: </strong>
                              <span>Input: <code>{tr.input}</code></span>
                            </div>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                              <span>Expected: <code>{tr.expected}</code></span>
                              <span>Output: <code>{tr.actual}</code></span>
                              <span style={{ fontWeight: 800, color: tr.passed ? '#22c55e' : '#ef4444' }}>
                                {tr.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {assignmentPassed && !quizPassed && (
                    <div style={{ marginTop: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setActiveTab('quiz')}
                        style={{
                          background: 'var(--primary-color)',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Proceed to Checkpoint Quiz →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHECKPOINT QUIZ */}
          {activeTab === 'quiz' && activeQuiz && (
            <div style={{ padding: '36px', maxWidth: '820px', margin: '0 auto', width: '100%' }}>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: 800, textTransform: 'uppercase' }}>
                  SECTION 10: CONCEPT CHECKPOINT QUIZ
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '8px 0 0 0' }}>
                  {activeQuiz.question}
                </h3>
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {activeQuiz.options.map((opt, oIdx) => {
                  let optBg = 'var(--bg-card)';
                  let optBorder = '1px solid var(--border-color)';

                  if (quizChecked) {
                    if (oIdx === activeQuiz.correctIndex) {
                      optBg = 'rgba(34, 197, 94, 0.15)';
                      optBorder = '2px solid #22c55e';
                    } else if (selectedQuizAnswer === oIdx) {
                      optBg = 'rgba(239, 68, 68, 0.15)';
                      optBorder = '2px solid #ef4444';
                    }
                  } else if (selectedQuizAnswer === oIdx) {
                    optBg = 'var(--primary-light)';
                    optBorder = '2px solid var(--primary-color)';
                  }

                  return (
                    <div
                      key={oIdx}
                      onClick={() => !quizChecked && setSelectedQuizAnswer(oIdx)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: 'var(--radius-md)',
                        background: optBg,
                        border: optBorder,
                        fontSize: '15px',
                        cursor: quizChecked ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '2px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}>
                        {String.fromCharCode(65 + oIdx)}
                      </div>
                      <span style={{ flex: 1 }}>{opt}</span>
                    </div>
                  );
                })}
              </div>

              {/* Check Answer CTA */}
              {!quizChecked ? (
                <button
                  onClick={handleVerifyQuiz}
                  disabled={selectedQuizAnswer === null}
                  style={{
                    background: selectedQuizAnswer !== null ? 'var(--primary-color)' : 'var(--bg-secondary)',
                    color: selectedQuizAnswer !== null ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: selectedQuizAnswer !== null ? 'pointer' : 'not-allowed'
                  }}
                >
                  Submit & Check Answer
                </button>
              ) : (
                <div style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-md)',
                  background: quizPassed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${quizPassed ? '#22c55e' : '#ef4444'}`,
                  marginBottom: '20px'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: quizPassed ? '#22c55e' : '#ef4444', marginBottom: '6px' }}>
                    {quizPassed ? 'Correct Answer' : 'Incorrect. Review explanation below:'}
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                    {activeQuiz.explanation}
                  </div>

                  {!quizPassed && (
                    <button
                      onClick={() => { setQuizChecked(false); setSelectedQuizAnswer(null); }}
                      style={{
                        marginTop: '12px',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* VERIFIABLE CERTIFICATE MODAL */}
      {showCertificate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--primary-color)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '750px',
            width: '100%',
            padding: '40px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-xl)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Award size={36} color="var(--primary-color)" />
              </div>
            </div>

            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary-color)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              OFFICIAL CERTIFICATE OF COMPLETION
            </span>

            <h2 style={{ fontSize: '28px', fontWeight: 900, margin: '10px 0 6px 0', color: 'var(--text-primary)' }}>
              {course.title}
            </h2>

            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 24px auto' }}>
              This certifies that <strong>Alex Coder</strong> has successfully completed all required modules, comprehensive written notes, verified assignments, and checkpoint quizzes.
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              padding: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '28px',
              fontSize: '13px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Certificate ID:</span>
                <div style={{ fontWeight: 700 }}>CDF-2026-{course.id.toUpperCase().slice(0, 8)}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Issued:</span>
                <div style={{ fontWeight: 700 }}>20 October 2026</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <div style={{ fontWeight: 700, color: '#22c55e' }}>VERIFIED & SIGNED</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
              <button
                onClick={() => setShowCertificate(false)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => alert("Certificate PDF download initiated with ID: CDF-2026-" + course.id.toUpperCase().slice(0, 8))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--primary-color)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <Download size={16} /> Download Certificate PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
