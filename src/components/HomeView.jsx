import React, { useEffect, useState } from 'react';
import { 
  Search, ArrowRight, BookOpen, Code2, Terminal, Layers, 
  Trophy, Star, Sparkles, CheckCircle2, Play, Flame, ExternalLink, Clock, Users
} from 'lucide-react';
import { problemsList } from '../data/problemsData';
import { lmsApi } from '../api/lmsApi';

export default function HomeView({ 
  onNavigate, 
  onOpenSearch,
  currentUser = null,
  enrolledCourses = [],
  completedLessons = [],
  onEnterClassroom
}) {
  const [catalogCourses, setCatalogCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState('');

  useEffect(() => {
    let isMounted = true;

    lmsApi.getCourses()
      .then(res => {
        if (!isMounted) return;
        setCatalogCourses(res?.courses || []);
        setCoursesError('');
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to load homepage courses:', err);
        setCoursesError('We could not load the course catalog. Please try again.');
      })
      .finally(() => {
        if (isMounted) setCoursesLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const potd = problemsList[0] || {
    id: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    accuracy: '72%',
    points: 20
  };

  // Find enrolled course if user has learning activity
  const activeCourse = catalogCourses.find(course => course.is_enrolled || enrolledCourses.includes(course.id));

  // Primary 4 Learning Paths per specification
  const learningPaths = [
    {
      title: "Programming Fundamentals",
      description: "Master language syntax, OOP principles, and clean code fundamentals in Python and Java.",
      meta: "Foundation Track",
      icon: Terminal,
      actionText: "Explore Fundamentals",
      target: { view: "batch" }
    },
    {
      title: "Data Structures & Algorithms",
      description: "Build deep intuition with arrays, binary trees, dynamic programming, and graph algorithms.",
      meta: "Core Problem Solving",
      icon: Code2,
      actionText: "Explore DSA",
      target: { view: "tutorials", topic: "binary-search" }
    },
    {
      title: "Web Development",
      description: "Build full-stack modern web applications with React, Next.js, Node.js, and databases.",
      meta: "Full Stack Track",
      icon: Layers,
      actionText: "View Curriculum",
      target: { view: "courses", courseId: "vexor-fullstack" }
    },
    {
      title: "Interview Preparation",
      description: "Prepare for top product companies with the curated 160 SDE Sheet and system design guides.",
      meta: "Career Acceleration",
      icon: Trophy,
      actionText: "Open 160 SDE Sheet",
      target: { view: "sde-sheet" }
    }
  ];

  const recommendedCourses = catalogCourses;

  return (
    <div className="home-container animate-fade-in" style={{ paddingBottom: '70px' }}>
      {/* ========================================================= */}
      {/* HERO SECTION                                              */}
      {/* ========================================================= */}
      <section style={{
        background: 'radial-gradient(ellipse at 82% 12%, rgba(47, 141, 70, 0.12), transparent 36%), linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
        borderBottom: '1px solid var(--border-color)',
        padding: 'clamp(52px, 8vw, 88px) 0 clamp(44px, 6vw, 64px) 0',
        textAlign: 'center'
      }}>
        <div className="max-width-wrapper" style={{ maxWidth: '820px' }}>
          {/* Small Eyebrow */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--brand-green-light)',
            color: 'var(--brand-green)',
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '0.4px',
            marginBottom: '18px'
          }}>
            <Sparkles size={14} /> Learn. Practice. Build.
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: 'clamp(28px, 5.2vw, 50px)',
            fontWeight: '900',
            letterSpacing: '-1.2px',
            lineHeight: 1.15,
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}>
            Become Better at Coding, <br className="desktop-only" />
            <span style={{ color: 'var(--brand-green)' }}>One Step at a Time.</span>
          </h1>

          {/* Supporting Text */}
          <p style={{
            fontSize: 'clamp(15px, 2.4vw, 18px)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '640px',
            margin: '0 auto 28px auto'
          }}>
            Learn programming, strengthen your problem-solving skills, and prepare for technical interviews with structured courses and hands-on practice.
          </p>

          {/* Primary & Secondary CTAs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '32px'
          }}>
            <button
              onClick={() => onNavigate({ view: 'courses' })}
              className="btn-primary"
              style={{
                padding: '12px 26px',
                fontSize: '15px',
                fontWeight: '700',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              Explore Courses <ArrowRight size={16} />
            </button>

            <button
              onClick={() => onNavigate({ view: 'practice' })}
              className="btn-outline"
              style={{
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              Start Practicing
            </button>
          </div>

          {/* Prominent Hero Search Bar */}
          <div
            onClick={onOpenSearch}
            style={{
              maxWidth: '620px',
              margin: '0 auto',
              background: 'var(--bg-primary)',
              border: '1.5px solid var(--border-color)',
              borderRadius: 'var(--radius-full)',
              padding: '7px 8px 7px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--brand-green)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <Search size={18} color="var(--brand-green)" style={{ flexShrink: 0 }} />
            <span style={{
              flex: 1,
              textAlign: 'left',
              color: 'var(--text-muted)',
              fontSize: 'clamp(13px, 2.2vw, 14.5px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              Search courses, tutorials, or coding problems...
            </span>
            <kbd className="desktop-only" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '2px 7px',
              fontSize: '11px',
              fontWeight: '700',
              color: 'var(--text-secondary)'
            }}>
              Ctrl K
            </kbd>
            <button
              className="btn-primary"
              style={{
                padding: '7px 16px',
                fontSize: '13px',
                borderRadius: 'var(--radius-full)',
                flexShrink: 0
              }}
            >
              Search
            </button>
          </div>

          {/* Subdued Discovery Suggestions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '16px'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
              Popular:
            </span>
            {[
              { label: "Binary Search", target: { view: "tutorials", topic: "binary-search" } },
              { label: "160 SDE Sheet", target: { view: "sde-sheet" } },
              { label: "Python Decorators", target: { view: "tutorials", topic: "python-decorators" } },
              { label: "System Design", target: { view: "tutorials", topic: "lru-cache-design" } }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate(item.target)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Sections Container */}
      <div className="max-width-wrapper" style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '56px' }}>

        {/* ========================================================= */}
        {/* SECTION 1: CONTINUE LEARNING (Signed-in with activity)     */}
        {/* ========================================================= */}
        {currentUser && activeCourse && (
          <section aria-labelledby="continue-learning-heading">
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(20px, 3.5vw, 28px)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              <div style={{ flex: '1 1 300px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: 'var(--brand-green)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  marginBottom: '8px'
                }}>
                  <Play size={12} fill="var(--brand-green)" /> Continue Learning
                </div>
                <h3 id="continue-learning-heading" style={{
                  fontSize: 'clamp(18px, 3vw, 22px)',
                  fontWeight: '800',
                  color: 'var(--text-primary)',
                  marginBottom: '6px'
                }}>
                  {activeCourse.title}
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  {activeCourse.category} • Module 1 in progress
                </p>

                {/* Progress Bar */}
                <div style={{ maxWidth: '420px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Course Progress</span>
                    <span style={{ color: 'var(--brand-green)' }}>
                      {completedLessons.length > 0 ? `${Math.min(100, completedLessons.length * 25)}%` : '20%'}
                    </span>
                  </div>
                  <div style={{
                    height: '6px',
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: completedLessons.length > 0 ? `${Math.min(100, completedLessons.length * 25)}%` : '20%',
                      background: 'var(--brand-green)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => {
                    if (onEnterClassroom) {
                      onEnterClassroom(activeCourse.id);
                    } else {
                      onNavigate({ view: 'student-classroom', courseId: activeCourse.id });
                    }
                  }}
                  className="btn-primary"
                  style={{
                    padding: '11px 22px',
                    fontSize: '14px',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  Resume Course <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 2: EXPLORE LEARNING PATHS (Max 4 primary cards)    */}
        {/* ========================================================= */}
        <section aria-labelledby="learning-paths-heading">
          <div style={{ marginBottom: '22px' }}>
            <h2 id="learning-paths-heading" style={{
              fontSize: 'clamp(20px, 3.8vw, 26px)',
              fontWeight: '800',
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px'
            }}>
              Explore Learning Paths
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Structured, topic-driven paths tailored for software engineers and computer science students.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: '20px'
          }}>
            {learningPaths.map((path, idx) => {
              const IconComponent = path.icon;
              return (
                <div
                  key={idx}
                  onClick={() => onNavigate(path.target)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'var(--transition)'
                  }}
                  className="gfg-card"
                >
                  <div>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'var(--brand-green-light)',
                      color: 'var(--brand-green)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}>
                      <IconComponent size={22} />
                    </div>

                    <div style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px'
                    }}>
                      {path.meta}
                    </div>

                    <h3 style={{
                      fontSize: '17px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '8px',
                      lineHeight: 1.3
                    }}>
                      {path.title}
                    </h3>

                    <p style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5
                    }}>
                      {path.description}
                    </p>
                  </div>

                  <div style={{
                    marginTop: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--brand-green)',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}>
                    <span>{path.actionText}</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: PRACTICE CODING (Focused POTD + Online IDE)     */}
        {/* ========================================================= */}
        <section aria-labelledby="practice-coding-heading">
          <div style={{ marginBottom: '22px' }}>
            <h2 id="practice-coding-heading" style={{
              fontSize: 'clamp(20px, 3.8vw, 26px)',
              fontWeight: '800',
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px'
            }}>
              Practice Coding
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Test your logic and write algorithms with instant feedback in our multi-language environment.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '20px'
          }}>
            {/* Card 1: Problem of the Day */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(20px, 3vw, 26px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.4px'
                  }}>
                    <Flame size={13} /> Daily Challenge
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Accuracy: {potd.accuracy}
                  </span>
                </div>

                <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {potd.title}
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '18px' }}>
                  Master core algorithmic complexity and binary search boundaries. Earn XP and build your coding streak.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-green)' }}>
                  +{potd.points} XP Reward
                </span>
                <button
                  onClick={() => onNavigate({ view: 'practice', problemId: potd.id })}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
                >
                  Solve Problem <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Card 2: Online Cloud IDE */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(20px, 3vw, 26px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'var(--brand-green-light)',
                    color: 'var(--brand-green)',
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.4px'
                  }}>
                    <Terminal size={13} /> In-Browser Sandbox
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Python • C++ • Java • JS
                  </span>
                </div>

                <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Online Cloud Compiler
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '18px' }}>
                  Prototype ideas, test edge cases, and run algorithms with standard I/O directly in your browser. No local setup required.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)', gap: '12px' }}>
                <button
                  onClick={() => onNavigate({ view: 'practice' })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  All Problems →
                </button>
                <button
                  onClick={() => onNavigate({ view: 'ide' })}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
                >
                  Launch IDE <Terminal size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: RECOMMENDED COURSES (Curated selection)        */}
        {/* ========================================================= */}
        <section aria-labelledby="recommended-courses-heading">
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '22px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 id="recommended-courses-heading" style={{
                fontSize: 'clamp(20px, 3.8vw, 26px)',
                fontWeight: '800',
                color: 'var(--text-primary)',
                letterSpacing: '-0.5px'
              }}>
                Recommended Courses
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                In-depth curriculum with practical assignments and verified certificates.
              </p>
            </div>

            <button
              onClick={() => onNavigate({ view: 'courses' })}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-green)',
                fontSize: '13.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              View All Courses <ArrowRight size={15} />
            </button>
          </div>

          <div className="mobile-slider-indicator">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              Explore the course catalog
            </span>
            <span>{coursesLoading ? 'Loading…' : `${recommendedCourses.length} courses`}</span>
          </div>

          <div className="courses-cards-container slidable-on-mobile">
            {coursesLoading && Array.from({ length: 4 }, (_, index) => (
              <div className="home-course-skeleton" key={`course-skeleton-${index}`} aria-hidden="true" />
            ))}
            {!coursesLoading && coursesError && (
              <div className="home-courses-message" role="alert">
                <p>{coursesError}</p>
                <button
                  className="btn-outline"
                  onClick={() => window.location.reload()}
                  style={{ padding: '7px 14px', fontSize: '13px' }}
                >
                  Reload page
                </button>
              </div>
            )}
            {!coursesLoading && !coursesError && recommendedCourses.length === 0 && (
              <div className="home-courses-message">
                <p>There are no published courses yet. Check back soon.</p>
              </div>
            )}
            {recommendedCourses.map(course => {
              const price = Number(course.price || 0);
              const originalPrice = Number(course.original_price || 0);
              const moduleCount = Number(course.module_count || 0);
              const lessonCount = Number(course.lesson_count || 0);
              return (
              <article
                key={course.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'var(--transition)',
                  boxShadow: 'var(--shadow-sm)'
                }}
                className="gfg-card course-card-slide"
              >
                {/* Course Header Banner */}
                <div style={{
                  minHeight: '154px',
                  background: course.thumbnail
                    ? `linear-gradient(180deg, rgba(15, 23, 42, .08), rgba(15, 23, 42, .78)), url("${course.thumbnail}") center/cover`
                    : 'linear-gradient(135deg, #164e35, #2f8d46)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      background: 'rgba(0, 0, 0, 0.45)',
                      backdropFilter: 'blur(4px)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      {course.category}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      background: 'rgba(15, 23, 42, .65)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      letterSpacing: '.04em'
                    }}>
                      {course.level || 'All levels'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <BookOpen size={14} />
                    <span style={{ fontWeight: '700', fontSize: '12px' }}>
                      {moduleCount} modules
                    </span>
                    {lessonCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span style={{ fontSize: '12px' }}>{lessonCount} lessons</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Course Content Body */}
                <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '16.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.35 }}>
                      {course.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '14px' }}>
                      {course.description ? `${course.description.slice(0, 120)}${course.description.length > 120 ? '…' : ''}` : 'Explore the structured course curriculum.'}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} /> {course.estimated_duration || 'Self-paced'}
                      </span>
                      {Number(course.enrolled_count) > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Users size={13} /> {course.enrolled_count} {Number(course.enrolled_count) === 1 ? 'learner' : 'learners'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    <div>
                      {!price ? (
                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--brand-green)' }}>
                          Free
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            ₹{price.toLocaleString('en-IN')}
                          </span>
                          {originalPrice > price && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                              ₹{originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onNavigate({ view: 'courses', courseId: course.id })}
                      className="btn-outline"
                      style={{ padding: '6px 12px', fontSize: '12px', borderRadius: 'var(--radius-sm)' }}
                    >
                      View Syllabus
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
