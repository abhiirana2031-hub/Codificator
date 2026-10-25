import React, { useState, useEffect } from 'react';
import { lmsApi } from '../api/lmsApi';
import { 
  BookOpen, Clock, CheckCircle2, ChevronRight, X, Search, 
  ArrowRight, Shield, Sparkles, Filter, Layers, Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import PricingModal from './lms/PricingModal';

export default function CoursesView({
  selectedCourseId,
  enrolledCourses = [],
  onEnrollCourse,
  onEnterClassroom,
  currentUser = null,
  onNavigate,
  onOpenAuthModal,
  autoOpenCheckoutCourseId = null,
  onClearAutoOpenCheckout
}) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All Courses");
  const [activeTab, setActiveTab] = useState("explore"); // 'explore' | 'my-learning'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All Levels");
  const [viewingSyllabus, setViewingSyllabus] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [courseToPurchase, setCourseToPurchase] = useState(null);
  const [learningProgress, setLearningProgress] = useState({});

  // Categories extracted dynamically from courses
  const allCategories = [
    "All Courses",
    ...Array.from(new Set(courses.map(c => c.category).filter(Boolean)))
  ];

  // Fetch published courses from authoritative backend API on mount
  const loadCoursesAndProgress = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await lmsApi.getCourses();

      if (res?.courses) {
        // Authoritative courses from database
        const serverCourses = res.courses.map(sc => {
          return {
            ...sc,
            id: sc.id,
            title: sc.title,
            subtitle: sc.subtitle || '',
            target_audience: sc.target_audience || '',
            slug: sc.slug,
            description: sc.description || '',
            category: sc.category || 'Computer Science',
            level: sc.level || 'Beginner to Intermediate',
            price: Number(sc.price !== undefined ? sc.price : 0),
            originalPrice: Number(sc.original_price || (sc.price ? sc.price * 2 : 0)),
            currency: 'INR',
            thumbnail: sc.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
            free: Number(sc.price) === 0,
            instructor_name: sc.instructor_name || 'Codificator Faculty',
            estimated_duration: sc.estimated_duration || '40 hours',
            modules: sc.modules || []
          };
        });

        setCourses(serverCourses);

        // Build student progress mapping
        const pMap = {};
        res.courses.forEach(c => {
          if (c.is_enrolled || enrolledCourses.includes(c.id)) {
            pMap[c.id] = {
              progress_percent: c.student_progress || 0,
              status: c.student_progress >= 100 ? 'COMPLETED' : (c.student_progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED')
            };
          }
        });
        setLearningProgress(pMap);
      } else {
        setCourses([]);
      }
    } catch (err) {
      console.error('Failed to load courses from API:', err);
      setLoadError(err.message || 'Unable to connect to course server. Please check your network connection and retry.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoursesAndProgress();
  }, [enrolledCourses]);

  // Handle returning from login to automatically reopen checkout
  useEffect(() => {
    const targetCourseId = autoOpenCheckoutCourseId || sessionStorage.getItem('pending_checkout_course_id');
    if (targetCourseId && courses.length > 0) {
      const target = courses.find(c => c.id === targetCourseId);
      if (target) {
        sessionStorage.removeItem('pending_checkout_course_id');
        sessionStorage.removeItem('pending_checkout_action');
        if (onClearAutoOpenCheckout) onClearAutoOpenCheckout();
        // If not already enrolled, automatically launch checkout
        const isAlreadyEnrolled = enrolledCourses.includes(target.id) || Boolean(learningProgress[target.id]);
        if (!isAlreadyEnrolled) {
          handleEnrollOrBuy(target);
        }
      }
    }
  }, [autoOpenCheckoutCourseId, courses, enrolledCourses]);

  const filteredCourses = courses.filter(c => {
    const matchesCategory = activeCategory === "All Courses" || c.category === activeCategory;
    const matchesLevel = selectedLevel === "All Levels" || (c.level && c.level.toLowerCase().includes(selectedLevel.toLowerCase()));
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || (
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q))
    );
    const isEnrolled = enrolledCourses.includes(c.id) || learningProgress[c.id];
    const matchesTab = activeTab === 'explore' || isEnrolled;

    return matchesCategory && matchesLevel && matchesSearch && matchesTab;
  });

  const enrolledCount = courses.filter(c => enrolledCourses.includes(c.id) || learningProgress[c.id]).length;

  const handleEnrollOrBuy = async (course) => {
    // 1. If already enrolled, navigate straight into the classroom
    const isAlreadyEnrolled = enrolledCourses.includes(course.id) || Boolean(learningProgress[course.id]);
    if (isAlreadyEnrolled) {
      onEnterClassroom(course.id);
      return;
    }

    // 2. ENFORCE LOGIN BEFORE CHECKOUT
    if (!currentUser) {
      const isFreeCourse = course.free || Number(course.price) === 0;
      sessionStorage.setItem('pending_checkout_course_id', course.id);
      sessionStorage.setItem('pending_checkout_action', isFreeCourse ? 'enroll' : 'buy');

      const redirectMsg = isFreeCourse
        ? 'Sign in to enroll in this free course.'
        : `Sign in to purchase "${course.title}".`;

      if (onNavigate) {
        onNavigate({
          view: 'login',
          message: redirectMsg,
          courseId: course.id
        });
      } else if (onOpenAuthModal) {
        onOpenAuthModal(redirectMsg);
      }
      return;
    }

    // 3. Paid Course: Open server-verified Razorpay checkout modal
    if (!course.free && Number(course.price) > 0) {
      setCourseToPurchase({
        id: course.id,
        title: course.title,
        category: course.category,
        level: course.level,
        price: Number(course.price),
        originalPrice: Number(course.originalPrice || course.original_price || (course.price * 2)),
        description: course.description
      });
      setIsCheckoutOpen(true);
      return;
    }

    // 4. Free course direct enrollment for authenticated student
    try {
      await onEnrollCourse(course.id);
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (err) {
      if (err.status === 402 || err.data?.requires_payment) {
        setCourseToPurchase({
          id: course.id,
          title: course.title,
          category: course.category,
          level: course.level,
          price: Number(err.data?.course?.price || course.price || 199),
          originalPrice: Number(course.originalPrice || 499),
          description: course.description
        });
        setIsCheckoutOpen(true);
      } else {
        alert(err.message || 'Enrollment failed');
      }
    }
  };

  return (
    <div className="max-width-wrapper animate-fade-in" style={{ padding: 'clamp(20px, 4vw, 36px) 16px', minHeight: '80vh' }}>
      {/* Header & Tabs */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(24px, 4.5vw, 32px)',
              fontWeight: '800',
              margin: '0 0 6px 0',
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px'
            }}>
              Computer Science &amp; Engineering Courses
            </h1>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: 'clamp(13.5px, 2.5vw, 15px)',
              margin: 0,
              maxWidth: '680px',
              lineHeight: 1.5
            }}>
              Structured, cohort-grade curriculums with hands-on coding exercises, modular milestones, and verified certifications.
            </p>
          </div>

          {/* Catalog vs My Learning Switcher */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-secondary)',
            padding: '3px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            alignSelf: 'flex-start'
          }}>
            <button
              onClick={() => setActiveTab('explore')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: '700',
                background: activeTab === 'explore' ? 'var(--brand-green)' : 'transparent',
                color: activeTab === 'explore' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Explore Catalog ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('my-learning')}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: '700',
                background: activeTab === 'my-learning' ? 'var(--brand-green)' : 'transparent',
                color: activeTab === 'my-learning' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              My Learning ({enrolledCount})
            </button>
          </div>
        </div>

        {/* Search & Level Filters Toolbar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px'
        }}>
          {/* Search Input */}
          <div style={{
            position: 'relative',
            flex: '1 1 240px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses by topic, skill, or title..."
              style={{
                width: '100%',
                padding: '9px 34px 9px 36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Level Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Level:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All Levels">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          {(searchQuery || selectedLevel !== 'All Levels' || activeCategory !== 'All Courses') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLevel('All Levels');
                setActiveCategory('All Courses');
              }}
              style={{
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#dc2626',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 8px'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Category Chips */}
        {allCategories.length > 1 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            paddingTop: '4px'
          }}>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  border: '1px solid var(--border-color)',
                  background: activeCategory === cat ? 'var(--brand-green)' : 'var(--bg-card)',
                  color: activeCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Courses Responsive Grid */}
      <div 
        className="courses-catalog-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
          width: '100%'
        }}
      >
        {loading ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '64px 24px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--brand-green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '16px' }} />
            <div style={{ fontSize: '15px', fontWeight: '700' }}>Loading Published Courses...</div>
          </div>
        ) : loadError ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '48px 24px',
            background: 'rgba(239, 68, 68, 0.08)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #ef4444',
            color: 'var(--text-primary)'
          }}>
            <div style={{ color: '#ef4444', fontSize: '16px', fontWeight: '800', marginBottom: '8px' }}>
              Failed to Load Course Catalog
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 18px' }}>
              {loadError}
            </p>
            <button
              onClick={() => loadCoursesAndProgress()}
              className="btn-primary"
              style={{ padding: '8px 22px', fontSize: '13px' }}
            >
              Retry Loading Catalog
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '64px 24px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <BookOpen size={44} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
              No Courses Match Your Criteria
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 auto 16px', maxWidth: '420px' }}>
              {courses.length === 0
                ? 'No published courses are currently available in the system catalog.'
                : 'Try adjusting your search terms, changing the level, or resetting category filters.'}
            </p>
            {courses.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLevel('All Levels');
                  setActiveCategory('All Courses');
                }}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          filteredCourses.map(course => {
            const isEnrolled = enrolledCourses.includes(course.id) || Boolean(learningProgress[course.id]);
            const price = Number(course.price !== undefined ? course.price : 249);
            const isFree = course.free || price === 0;

            return (
              <div key={course.id} className="course-card">
                {/* 16:9 Thumbnail Container */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  overflow: 'hidden',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <img
                    src={course.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800'}
                    alt={course.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.src = '/logo.png';
                      e.target.style.objectFit = 'contain';
                      e.target.style.padding = '20px';
                    }}
                  />

                  {/* Category Chip */}
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.3px'
                  }}>
                    {course.category}
                  </span>

                  {/* Level / Free Badge */}
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: isFree ? 'rgba(16, 185, 129, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: '800'
                  }}>
                    {isFree ? 'FREE' : course.level}
                  </span>
                </div>

                {/* Card Body */}
                <div style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '17.5px',
                      fontWeight: '800',
                      color: 'var(--text-primary)',
                      margin: '0 0 6px 0',
                      lineHeight: 1.4
                    }}>
                      {course.title}
                    </h3>

                    {course.subtitle && (
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--brand-green)',
                        marginBottom: '8px'
                      }}>
                        {course.subtitle}
                      </div>
                    )}

                    <p style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      margin: '0 0 14px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {course.description || 'Comprehensive curriculum with practical coding modules and verified certificate.'}
                    </p>

                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span>Level: <strong style={{ color: 'var(--text-secondary)' }}>{course.level}</strong></span>
                      {course.instructor_name && (
                        <>
                          <span>•</span>
                          <span>Faculty: <strong style={{ color: 'var(--text-secondary)' }}>{course.instructor_name}</strong></span>
                        </>
                      )}
                      {course.target_audience && (
                        <>
                          <span>•</span>
                          <span>For: <strong style={{ color: 'var(--text-secondary)' }}>{course.target_audience}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Footer with Price and Actions */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      paddingTop: '14px',
                      borderTop: '1px solid var(--border-color)',
                      marginBottom: '14px'
                    }}>
                      <div>
                        {isFree ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--brand-green)' }}>
                              Free
                            </span>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              Open Access
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '22px', fontWeight: '900', color: 'var(--brand-green)' }}>
                              ₹{price.toLocaleString('en-IN')}
                            </span>
                            {course.originalPrice && course.originalPrice > price && (
                              <span style={{ fontSize: '13px', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                                ₹{course.originalPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setViewingSyllabus(course)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--brand-green)',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          padding: '4px 0'
                        }}
                      >
                        View Syllabus →
                      </button>
                    </div>

                    {/* Enrollment Action Button */}
                    {isEnrolled ? (
                      <button
                        onClick={() => onEnterClassroom(course.id)}
                        className="btn-primary"
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          fontSize: '13.5px',
                          fontWeight: '700',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        Continue Learning <ArrowRight size={15} />
                      </button>
                    ) : isFree ? (
                      <button
                        onClick={() => handleEnrollOrBuy(course)}
                        className="btn-primary"
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          fontSize: '13.5px',
                          fontWeight: '700',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        Enroll for Free <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnrollOrBuy(course)}
                        className="btn-primary"
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          fontSize: '13.5px',
                          fontWeight: '700',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        Enroll Now • ₹{price} <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Syllabus Drawer / Modal */}
      {viewingSyllabus && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '620px',
            width: '100%',
            maxHeight: '88vh',
            overflowY: 'auto',
            padding: 'clamp(20px, 4vw, 32px)',
            position: 'relative'
          }}>
            <button
              onClick={() => setViewingSyllabus(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <span style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'var(--brand-green-light)',
              color: 'var(--brand-green)',
              marginBottom: '10px'
            }}>
              {viewingSyllabus.category}
            </span>

            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
              {viewingSyllabus.title}
            </h2>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              {viewingSyllabus.description}
            </p>

            <h4 style={{ fontSize: '14.5px', fontWeight: '800', margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
              Course Curriculum Modules
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {viewingSyllabus.modules && viewingSyllabus.modules.length > 0 ? (
                viewingSyllabus.modules.map((m, idx) => (
                  <div key={m.id || idx} style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      {m.title}
                    </div>
                    {m.lessons && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {m.lessons.length} Lessons • Sequential Milestone
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Full hands-on curriculum modules and code sandboxes included.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setViewingSyllabus(null)}
                className="btn-outline"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = viewingSyllabus;
                  setViewingSyllabus(null);
                  handleEnrollOrBuy(target);
                }}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                {enrolledCourses.includes(viewingSyllabus.id)
                  ? 'Continue Learning'
                  : viewingSyllabus.free || Number(viewingSyllabus.price) === 0
                  ? 'Enroll for Free'
                  : `Enroll Now • ₹${viewingSyllabus.price}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Course Checkout Modal */}
      <PricingModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        courseToPurchase={courseToPurchase}
        currentUser={currentUser}
        onRequireAuth={(course) => {
          setIsCheckoutOpen(false);
          const redirectMsg = `Sign in to purchase "${course?.title || 'this course'}".`;
          sessionStorage.setItem('pending_checkout_course_id', course.id);
          sessionStorage.setItem('pending_checkout_action', 'buy');
          if (onNavigate) {
            onNavigate({
              view: 'login',
              message: redirectMsg,
              courseId: course.id
            });
          } else if (onOpenAuthModal) {
            onOpenAuthModal(redirectMsg);
          }
        }}
        onSuccess={() => {
          if (courseToPurchase?.id) {
            onEnrollCourse(courseToPurchase.id);
            loadCoursesAndProgress();
          }
        }}
      />
    </div>
  );
}
