import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../api/lmsApi';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  FileQuestion,
  FileText,
  Award,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Video,
  FileCode,
  Save,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  Check,
  RotateCcw,
  UploadCloud,
  X
} from 'lucide-react';
import PdfCourseUploadModal from './PdfCourseUploadModal';
import MarkdownEditor from '../admin/MarkdownEditor';

export default function OperatorDashboard({ onPreviewCourse }) {
  const [activeTab, setActiveTab] = useState('courses'); // 'overview' | 'courses' | 'builder' | 'quizzes' | 'assignments' | 'certificates' | 'analytics' | 'settings'
  const [courses, setCourses] = useState([]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [curriculumData, setCurriculumData] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // New Course Modal State
  const [isNewCourseOpen, setIsNewCourseOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState('Full-Stack & APIs');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [newCoursePrice, setNewCoursePrice] = useState(499);
  const [newCourseOriginalPrice, setNewCourseOriginalPrice] = useState(999);
  const [newCourseDuration, setNewCourseDuration] = useState('4 Weeks');

  // Quick Price Edit State
  const [priceEditingCourseId, setPriceEditingCourseId] = useState(null);
  const [editPriceValue, setEditPriceValue] = useState(0);
  const [editCostValue, setEditCostValue] = useState(0);

  // New Module Modal State
  const [isNewModuleOpen, setIsNewModuleOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModulePolicy, setNewModulePolicy] = useState('POLICY_B_QUIZ');
  const [newModulePassingScore, setNewModulePassingScore] = useState(70);

  // New Lesson Modal State
  const [isNewLessonOpen, setIsNewLessonOpen] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState('TEXT');

  // Multi-Select Bulk Actions State
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [isBulkDeletingCourses, setIsBulkDeletingCourses] = useState(false);

  const handleToggleSelectCourse = (id) => {
    setSelectedCourseIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSelectAllCourses = () => {
    if (selectedCourseIds.length === courses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(courses.map(c => c.id));
    }
  };

  const handleBulkDeleteCourses = async () => {
    if (selectedCourseIds.length === 0) return;
    const confirmMsg = `Are you sure you want to permanently delete ${selectedCourseIds.length} selected course(s)? All corresponding modules, lessons, and records will be removed.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsBulkDeletingCourses(true);
      const res = await lmsApi.bulkDeleteCourses(selectedCourseIds, true);
      showNotification(`Successfully deleted ${res.deletedCount || selectedCourseIds.length} course(s).`);
      setSelectedCourseIds([]);
      await loadCourses();
    } catch (err) {
      showNotification(err.message || 'Failed to bulk delete courses', 'error');
    } finally {
      setIsBulkDeletingCourses(false);
    }
  };

  const handleBulkTogglePublish = async (targetPublishState) => {
    if (selectedCourseIds.length === 0) return;
    try {
      for (const cId of selectedCourseIds) {
        const c = courses.find(course => course.id === cId);
        if (c && Boolean(c.is_published) !== targetPublishState) {
          await lmsApi.togglePublishCourse(cId);
        }
      }
      showNotification(`Courses updated to ${targetPublishState ? 'Published' : 'Draft'}`);
      setSelectedCourseIds([]);
      await loadCourses();
    } catch (err) {
      showNotification(err.message || 'Failed to update courses', 'error');
    }
  };

  useEffect(() => {
    loadCourses();
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCurriculum(selectedCourseId);
    }
  }, [selectedCourseId]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await lmsApi.getCourses();
      setCourses(res.courses || []);
      if (!selectedCourseId && res.courses?.length > 0) {
        setSelectedCourseId(res.courses[0].id);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await lmsApi.getOverviewAnalytics();
      setAnalytics(res);
    } catch (err) {
      console.warn('Analytics load error:', err);
    }
  };

  const loadCurriculum = async (courseId) => {
    try {
      setLoading(true);
      const res = await lmsApi.getCurriculum(courseId);
      setCurriculumData(res);
      if (res?.modules?.length > 0) {
        setSelectedModuleId(res.modules[0].id);
        if (res.modules[0].lessons?.length > 0) {
          setSelectedLessonId(res.modules[0].lessons[0].id);
          setEditingLesson(res.modules[0].lessons[0]);
        }
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (courseId) => {
    try {
      const res = await lmsApi.togglePublishCourse(courseId);
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, is_published: res.is_published } : c));
      showNotification(res.is_published ? 'Course published to student catalog' : 'Course saved as draft');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to delete course "${courseTitle}"?`)) return;
    try {
      await lmsApi.deleteCourse(courseId);
      showNotification(`Course "${courseTitle}" deleted successfully`);
      loadCourses();
    } catch (err) {
      if (err.data?.error?.includes('active student progress')) {
        const force = window.confirm(`${err.data.error}\n\nDo you want to FORCE delete anyway? WARNING: This will erase all student enrollments and records.`);
        if (force) {
          await lmsApi.deleteCourse(courseId, true);
          showNotification('Course force deleted');
          loadCourses();
        }
      } else {
        showNotification(err.message, 'error');
      }
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    try {
      const res = await lmsApi.createCourse({
        title: newCourseTitle,
        category: newCourseCategory,
        description: newCourseDescription,
        price: Number(newCoursePrice) || 0,
        original_price: Number(newCourseOriginalPrice) || 0,
        estimated_duration: newCourseDuration || '4 Weeks'
      });
      showNotification(`Created course "${res.course.title}" at ₹${res.course.price || 0}`);
      setIsNewCourseOpen(false);
      setNewCourseTitle('');
      setNewCourseDescription('');
      setNewCoursePrice(499);
      setNewCourseOriginalPrice(999);
      setNewCourseDuration('4 Weeks');
      await loadCourses();
      setSelectedCourseId(res.course.id);
      setActiveTab('builder');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleStartEditPrice = (course) => {
    setPriceEditingCourseId(course.id);
    setEditPriceValue(course.price || 0);
    setEditCostValue(course.original_price || (course.price ? Math.round(course.price * 1.5) : 0));
  };

  const handleSaveQuickPrice = async (courseId) => {
    try {
      await lmsApi.updateCourse(courseId, {
        price: Number(editPriceValue) || 0,
        original_price: Number(editCostValue) || 0
      });
      setCourses(prev => prev.map(c => c.id === courseId ? {
        ...c,
        price: Number(editPriceValue) || 0,
        original_price: Number(editCostValue) || 0
      } : c));
      setPriceEditingCourseId(null);
      showNotification('Course pricing updated successfully');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!newModuleTitle.trim() || !selectedCourseId) return;
    try {
      await lmsApi.createModule(selectedCourseId, {
        title: newModuleTitle,
        completion_policy: newModulePolicy,
        min_passing_score: newModulePassingScore
      });
      showNotification(`Created module "${newModuleTitle}"`);
      setIsNewModuleOpen(false);
      setNewModuleTitle('');
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!newLessonTitle.trim() || !selectedModuleId) return;
    try {
      await lmsApi.createLesson(selectedModuleId, {
        title: newLessonTitle,
        lesson_type: newLessonType
      });
      showNotification(`Created lesson "${newLessonTitle}"`);
      setIsNewLessonOpen(false);
      setNewLessonTitle('');
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleReorderModules = async (direction, index) => {
    if (!curriculumData?.modules) return;
    const modules = [...curriculumData.modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    // Swap
    const temp = modules[index];
    modules[index] = modules[targetIndex];
    modules[targetIndex] = temp;

    const moduleIds = modules.map(m => m.id);
    try {
      await lmsApi.reorderModules(selectedCourseId, moduleIds);
      loadCurriculum(selectedCourseId);
      showNotification('Module order persisted to database');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleReorderLessons = async (moduleId, direction, index) => {
    const mod = curriculumData?.modules?.find(m => m.id === moduleId);
    if (!mod?.lessons) return;
    const lessons = [...mod.lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    // Swap
    const temp = lessons[index];
    lessons[index] = lessons[targetIndex];
    lessons[targetIndex] = temp;

    const lessonIds = lessons.map(l => l.id);
    try {
      await lmsApi.reorderLessons(moduleId, lessonIds);
      loadCurriculum(selectedCourseId);
      showNotification('Lesson order persisted to database');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveLesson = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingLesson) return;
    try {
      await lmsApi.updateLesson(editingLesson.id, {
        title: editingLesson.title,
        description: editingLesson.description,
        lesson_type: editingLesson.lesson_type,
        video_url: editingLesson.video_url,
        video_asset_id: editingLesson.video_asset_id,
        text_content: editingLesson.content_markdown || editingLesson.text_content,
        content_markdown: editingLesson.content_markdown || editingLesson.text_content,
        is_preview: editingLesson.is_preview ? 1 : 0,
        pdf_url: editingLesson.pdf_url,
        duration_minutes: editingLesson.duration_minutes,
        is_mandatory: editingLesson.is_mandatory !== undefined ? (editingLesson.is_mandatory ? 1 : 0) : 1,
        video_threshold_percent: editingLesson.video_threshold_percent
      });
      showNotification(`Lesson "${editingLesson.title}" updated successfully!`);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveLessonContentDirect = async (lessonToSave) => {
    if (!lessonToSave) return;
    try {
      await lmsApi.updateLesson(lessonToSave.id, {
        title: lessonToSave.title,
        description: lessonToSave.description,
        lesson_type: lessonToSave.lesson_type,
        video_url: lessonToSave.video_url,
        video_asset_id: lessonToSave.video_asset_id,
        text_content: lessonToSave.content_markdown || lessonToSave.text_content,
        content_markdown: lessonToSave.content_markdown || lessonToSave.text_content,
        is_preview: lessonToSave.is_preview ? 1 : 0,
        pdf_url: lessonToSave.pdf_url,
        duration_minutes: lessonToSave.duration_minutes,
        is_mandatory: lessonToSave.is_mandatory !== undefined ? (lessonToSave.is_mandatory ? 1 : 0) : 1,
        video_threshold_percent: lessonToSave.video_threshold_percent
      });
      showNotification(`Lesson "${lessonToSave.title}" saved with live Markdown!`);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const selectedModule = curriculumData?.modules?.find(m => m.id === selectedModuleId);

  return (
    <div className="max-width-wrapper animate-fade-in" style={{ padding: '24px 0 60px', minHeight: '85vh' }}>
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
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {notification.type === 'error' ? <AlertTriangle size={18} /> : <Check size={18} />}
          {notification.msg}
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'var(--brand-green-light)',
              color: 'var(--brand-green)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              Administration Console
            </span>
            <span style={{ color: 'var(--text-light)', fontSize: '13px' }}>|</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Full Relational Backend</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, marginTop: '6px' }}>
            Course Operator Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px' }}>
            Create structured curriculums, organize modules, configure prerequisites, and manage assessments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsNewCourseOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-green)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Plus size={16} /> New Course
          </button>
          <button
            onClick={() => setIsPdfModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <UploadCloud size={16} /> Upload Syllabus PDF
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '28px',
        overflowX: 'auto',
        gap: '4px'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'courses', label: 'Courses', icon: BookOpen },
          { id: 'builder', label: 'Course Builder', icon: Layers },
          { id: 'quizzes', label: 'Quizzes', icon: FileQuestion },
          { id: 'assignments', label: 'Assignments', icon: FileText },
          { id: 'certificates', label: 'Certificates', icon: Award },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? 'var(--brand-green)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--brand-green)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'var(--transition)'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Total Published Courses</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--brand-green)', marginTop: '4px' }}>
                {analytics?.metrics?.publishedCourses || courses.filter(c => c.is_published).length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                Out of {courses.length} total registered courses
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Total Enrolled Students</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#3b82f6', marginTop: '4px' }}>
                {analytics?.metrics?.totalEnrollments || 0}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                Active Learners: {analytics?.metrics?.activeLearners || 0}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Course Completion Rate</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#8b5cf6', marginTop: '4px' }}>
                {analytics?.metrics?.courseCompletionRate || 0}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                Certificates Issued: {analytics?.metrics?.certificatesIssued || 0}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Avg Quiz Performance</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#f59e0b', marginTop: '4px' }}>
                {analytics?.metrics?.avgQuizScore || 82}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                Evaluated server-side in real-time
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Quick Operations</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div
                onClick={() => setActiveTab('builder')}
                style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--brand-green)' }}>Open Course Builder</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Reorder modules, configure completion policies, and author structured technical reading materials.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('courses')}
                style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#3b82f6' }}>Manage Publication Status</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Publish draft cohorts or unpublish courses safely without corrupting progress.
                </p>
              </div>

              <div
                onClick={() => onPreviewCourse && onPreviewCourse('course-fullstack-web')}
                style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#8b5cf6' }}>Preview Student Experience</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Launch the Full Stack Web Development classroom to test sequential unlocking.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COURSES LIST */}
      {activeTab === 'courses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Registered Courses Catalog ({courses.length})</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Select multiple courses with checkboxes to bulk delete or change status in one click.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleSelectAllCourses}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {courses.length > 0 && selectedCourseIds.length === courses.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={() => setIsPdfModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <UploadCloud size={14} /> Import from Google Docs / PDF
              </button>
              <button
                onClick={() => setIsNewCourseOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'var(--brand-green)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Add Course
              </button>
            </div>
          </div>

          {/* Multi-Select Floating / Sticky Bulk Action Bar */}
          {selectedCourseIds.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              borderRadius: '10px',
              marginBottom: '16px',
              gap: '12px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12px'
                }}>
                  {selectedCourseIds.length} Selected
                </span>
                <span style={{ color: '#991b1b', fontSize: '13.5px', fontWeight: 600 }}>
                  Selected {selectedCourseIds.length} of {courses.length} courses
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleBulkTogglePublish(true)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #86efac',
                    color: '#059669',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Publish Selected
                </button>

                <button
                  onClick={() => handleBulkTogglePublish(false)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Unpublish Selected
                </button>

                <button
                  onClick={() => setSelectedCourseIds([])}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>

                <button
                  onClick={handleBulkDeleteCourses}
                  disabled={isBulkDeletingCourses}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <Trash2 size={14} />
                  {isBulkDeletingCourses ? 'Deleting...' : `Delete Selected (${selectedCourseIds.length})`}
                </button>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ width: '42px', padding: '14px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={courses.length > 0 && selectedCourseIds.length === courses.length}
                        onChange={handleSelectAllCourses}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#dc2626' }}
                        title="Select All Courses"
                      />
                    </th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>Course Title</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>Category</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>Price & Cost</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>Instructor</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>Modules</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>Enrolled</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800 }}>Status</th>
                    <th style={{ padding: '14px 16px', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
              <tbody>
                {courses.map(c => (
                  <tr 
                    key={c.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      background: selectedCourseIds.includes(c.id) ? 'rgba(239, 68, 68, 0.05)' : 'transparent' 
                    }}
                  >
                    <td style={{ width: '42px', padding: '14px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.includes(c.id)}
                        onChange={() => handleToggleSelectCourse(c.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#dc2626' }}
                      />
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={c.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100'}
                          alt={c.title}
                          style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                        <div>
                          <div>{c.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>slug: {c.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{c.category}</td>
                    
                    {/* Price & Cost Cell */}
                    <td style={{ padding: '14px 16px' }}>
                      {priceEditingCourseId === c.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '32px' }}>Sell:</span>
                            <input
                              type="number"
                              min="0"
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              style={{ width: '70px', padding: '2px 4px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '32px' }}>Cost:</span>
                            <input
                              type="number"
                              min="0"
                              value={editCostValue}
                              onChange={(e) => setEditCostValue(e.target.value)}
                              style={{ width: '70px', padding: '2px 4px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                            <button
                              onClick={() => handleSaveQuickPrice(c.id)}
                              style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '3px', background: 'var(--brand-green)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setPriceEditingCourseId(null)}
                              title="Cancel"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 6px', borderRadius: '3px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEditPrice(c)}
                          title="Click to edit course price and cost"
                          style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column' }}
                        >
                          <div style={{ fontWeight: 800, color: (c.price === 0 || !c.price) ? 'var(--brand-green)' : 'var(--text-primary)', fontSize: '13px' }}>
                            {(c.price === 0 || !c.price) ? 'FREE' : `₹${c.price}`}
                          </div>
                          {(c.original_price > 0 || c.price > 0) && (
                            <div style={{ fontSize: '11px', color: 'var(--text-light)', textDecoration: 'line-through' }}>
                              Cost: ₹{c.original_price || (c.price ? Math.round(c.price * 1.5) : 0)}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{c.instructor_name || 'Assigned Lead'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{c.module_count || 0}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{c.enrolled_count || 0}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => handleTogglePublish(c.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none',
                          background: c.is_published ? 'var(--brand-green-light)' : '#f3f4f6',
                          color: c.is_published ? 'var(--brand-green)' : '#6b7280'
                        }}
                      >
                        {c.is_published ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {c.is_published ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setSelectedCourseId(c.id);
                            setActiveTab('builder');
                          }}
                          title="Open in Builder"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={13} style={{ marginRight: '4px' }} /> Builder
                        </button>

                        <button
                          onClick={() => onPreviewCourse && onPreviewCourse(c.id)}
                          title="Preview Student Classroom"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'var(--brand-green-light)',
                            border: '1px solid var(--brand-green)',
                            color: 'var(--brand-green)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          onClick={() => handleDeleteCourse(c.id, c.title)}
                          title="Delete Course (with safe check)"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEDICATED COURSE BUILDER */}
      {activeTab === 'builder' && (
        <div>
          {/* Builder Top Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
            padding: '16px 20px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-secondary)' }}>Selected Course:</span>
              <select
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.is_published ? 'Published' : 'Draft'})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setIsNewModuleOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'var(--brand-green)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Add Module
              </button>

              <button
                onClick={() => onPreviewCourse && onPreviewCourse(selectedCourseId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <Eye size={14} /> Preview Student View
              </button>
            </div>
          </div>

          {/* Builder Layout: Left Curriculum Sidebar + Right Lesson Editor Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Left Curriculum Sidebar */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '16px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Curriculum Hierarchy
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>
                  Drag & Reorder
                </span>
              </div>

              {curriculumData?.modules?.map((m, mIdx) => (
                <div
                  key={m.id}
                  style={{
                    marginBottom: '14px',
                    borderRadius: '8px',
                    border: selectedModuleId === m.id ? '2px solid var(--brand-green)' : '1px solid var(--border-color)',
                    background: selectedModuleId === m.id ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Module Header */}
                  <div
                    onClick={() => {
                      setSelectedModuleId(m.id);
                      if (m.lessons?.length > 0) {
                        setSelectedLessonId(m.lessons[0].id);
                        setEditingLesson(m.lessons[0]);
                      }
                    }}
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                        {m.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                        {m.completion_policy.replace('POLICY_', '')} • Passing: {m.min_passing_score}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReorderModules('up', mIdx); }}
                        disabled={mIdx === 0}
                        style={{ padding: '3px', background: 'transparent', border: 'none', cursor: mIdx === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-light)' }}
                        title="Move Module Up"
                      >
                        <MoveUp size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReorderModules('down', mIdx); }}
                        disabled={mIdx === curriculumData.modules.length - 1}
                        style={{ padding: '3px', background: 'transparent', border: 'none', cursor: mIdx === curriculumData.modules.length - 1 ? 'not-allowed' : 'pointer', color: 'var(--text-light)' }}
                        title="Move Module Down"
                      >
                        <MoveDown size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Lessons inside Module */}
                  <div style={{ padding: '8px' }}>
                    {m.lessons?.map((l, lIdx) => (
                      <div
                        key={l.id}
                        onClick={() => {
                          setSelectedLessonId(l.id);
                          setEditingLesson(l);
                          setSelectedModuleId(m.id);
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: selectedLessonId === l.id ? 'var(--brand-green-light)' : 'transparent',
                          color: selectedLessonId === l.id ? 'var(--brand-green)' : 'var(--text-primary)',
                          fontWeight: selectedLessonId === l.id ? 700 : 500,
                          fontSize: '12.5px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          {l.lesson_type === 'VIDEO' ? <Video size={13} /> : <FileCode size={13} />}
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {l.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReorderLessons(m.id, 'up', lIdx); }}
                            disabled={lIdx === 0}
                            style={{ padding: '2px', background: 'transparent', border: 'none', cursor: lIdx === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-light)' }}
                          >
                            <MoveUp size={11} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReorderLessons(m.id, 'down', lIdx); }}
                            disabled={lIdx === m.lessons.length - 1}
                            style={{ padding: '2px', background: 'transparent', border: 'none', cursor: lIdx === m.lessons.length - 1 ? 'not-allowed' : 'pointer', color: 'var(--text-light)' }}
                          >
                            <MoveDown size={11} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        setSelectedModuleId(m.id);
                        setIsNewLessonOpen(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        marginTop: '4px',
                        background: 'transparent',
                        border: '1px dashed var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      + Add Lesson to Module
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Lesson Editing Panel */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '24px' }}>
              {editingLesson ? (
                <form onSubmit={handleSaveLesson}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-green)' }}>
                        Editing Lesson
                      </span>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>{editingLesson.title}</h2>
                    </div>

                    <button
                      type="submit"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 18px',
                        borderRadius: '6px',
                        background: 'var(--brand-green)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        cursor: 'pointer'
                      }}
                    >
                      <Save size={15} /> Save Changes
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        Lesson Title
                      </label>
                      <input
                        type="text"
                        value={editingLesson.title || ''}
                        onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        Lesson Format
                      </label>
                      <select
                        value={editingLesson.lesson_type || 'TEXT'}
                        onChange={(e) => setEditingLesson({ ...editingLesson, lesson_type: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        <option value="TEXT">Structured Educational Notes (Markdown)</option>
                        <option value="CODE">Coding Exercises & Syntax Breakdown</option>
                        <option value="PDF">Downloadable Digital Resource</option>
                      </select>
                    </div>
                  </div>

                  {/* Reading Metadata */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                          Estimated Reading Duration (Minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={editingLesson.duration_minutes || 10}
                          onChange={(e) => setEditingLesson({ ...editingLesson, duration_minutes: Number(e.target.value) })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', display: 'flex', alignItems: 'center' }}>
                        Codificator calculates real-time reading progress and word count for this lesson in the student classroom.
                      </div>
                    </div>
                  </div>

                  {/* Rich Markdown Editor with Live Preview */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Authoritative Lesson Content (Markdown Editor with Live Split-Preview)
                    </label>
                    <MarkdownEditor
                      initialContent={editingLesson.content_markdown || editingLesson.text_content || ''}
                      lessonTitle={editingLesson.title}
                      lessonId={editingLesson.id}
                      isPreview={Boolean(editingLesson.is_preview)}
                      onTogglePreview={(val) => setEditingLesson(prev => ({ ...prev, is_preview: val ? 1 : 0 }))}
                      isMandatory={Boolean(editingLesson.is_mandatory)}
                      onToggleMandatory={(val) => setEditingLesson(prev => ({ ...prev, is_mandatory: val ? 1 : 0 }))}
                      onSave={(newMarkdown) => {
                        const updated = {
                          ...editingLesson,
                          text_content: newMarkdown,
                          content_markdown: newMarkdown
                        };
                        setEditingLesson(updated);
                        handleSaveLessonContentDirect(updated);
                      }}
                    />
                  </div>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-light)' }}>
                  <Layers size={40} style={{ marginBottom: '12px' }} />
                  <p>Select a lesson from the left curriculum sidebar to inspect and edit its properties.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: QUIZZES */}
      {activeTab === 'quizzes' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Curriculum Quizzes & Assessments</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {curriculumData?.modules?.filter(m => m.quiz).map(m => (
              <div key={m.quiz.id} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-green)', textTransform: 'uppercase' }}>
                    {m.title}
                  </span>
                  <span style={{ fontSize: '11px', background: 'var(--brand-green-light)', color: 'var(--brand-green)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                    Passing: {m.quiz.passing_percentage}%
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>{m.quiz.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '12px' }}>
                  {m.quiz.description}
                </p>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  Questions: {m.quiz.questions?.length || 0} • Time limit: {m.quiz.time_limit_minutes || 15} mins • Auto-graded
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Assignments & Capstone Projects</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {curriculumData?.modules?.filter(m => m.assignment).map(m => (
              <div key={m.assignment.id} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>
                    {m.title}
                  </span>
                  <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                    Max: {m.assignment.max_marks} pts
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>{m.assignment.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '12px' }}>
                  {m.assignment.instructions}
                </p>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  Accepted Types: {m.assignment.accepted_types} • Instructor Manual Review Required
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: CERTIFICATES */}
      {activeTab === 'certificates' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Issued Credentials & Certificates</h2>
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <ShieldCheck size={20} color="var(--brand-green)" />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>
                Total Verified Credentials Issued: {analytics?.metrics?.certificatesIssued || 0}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '16px' }}>
              Certificates are automatically generated when a student completes all required lessons, passes the prerequisite quizzes, and receives approved grades on capstone assignments.
            </p>
            <div style={{ display: 'inline-block' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-green)' }}>
                Sample Issued Certificate Code: <code>CODIF-2026-ALX99</code>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Cohort Analytics & Progress Distribution</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>Learner Progress Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(analytics?.progressBuckets || { '0-25%': 2, '26-50%': 1, '51-75%': 0, '76-100%': 1 }).map(([range, count]) => (
                  <div key={range}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{range} Progress</span>
                      <span style={{ fontWeight: 800 }}>{count} Students</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, count * 35)}%`, height: '100%', background: 'var(--brand-green)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>Cohort Health Indicators</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Active Learners (last 7 days):</span>
                  <span style={{ fontWeight: 800, color: 'var(--brand-green)' }}>{analytics?.metrics?.activeLearners || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Students Falling Behind:</span>
                  <span style={{ fontWeight: 800, color: '#f59e0b' }}>{analytics?.metrics?.fallingBehind || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Inactive Learners (&gt; 14 days):</span>
                  <span style={{ fontWeight: 800, color: '#ef4444' }}>{analytics?.metrics?.inactiveLearners || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Pending Assignment Reviews:</span>
                  <span style={{ fontWeight: 800, color: '#3b82f6' }}>{analytics?.metrics?.pendingSubmissions || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE COURSE */}
      {isNewCourseOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '520px', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Create New Course</h3>
            <form onSubmit={handleCreateCourse}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Course Title</label>
                <input
                  type="text"
                  required
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems & Microservices"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Category</label>
                <select
                  value={newCourseCategory}
                  onChange={(e) => setNewCourseCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="Full-Stack & APIs">Full-Stack & APIs</option>
                  <option value="Computer Science Core">Computer Science Core</option>
                  <option value="Programming & Systems">Programming & Systems</option>
                  <option value="System Design">System Design</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Selling Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCoursePrice}
                    onChange={(e) => setNewCoursePrice(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="e.g. 499"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Original Cost / M.R.P. (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCourseOriginalPrice}
                    onChange={(e) => setNewCourseOriginalPrice(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="e.g. 999"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Cohort Structure Duration</label>
                <select
                  value={newCourseDuration}
                  onChange={(e) => setNewCourseDuration(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="4 Weeks">4-Week Cohort (Standard)</option>
                  <option value="6 Weeks">6-Week In-Depth Track</option>
                  <option value="8 Weeks">8-Week Advanced Specialization</option>
                  <option value="Self-Paced">Self-Paced (Open Access)</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={3}
                  value={newCourseDescription}
                  onChange={(e) => setNewCourseDescription(e.target.value)}
                  placeholder="Course overview and syllabus highlights..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewCourseOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--brand-green)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE MODULE */}
      {isNewModuleOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '480px', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Add New Module</h3>
            <form onSubmit={handleCreateModule}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Module Title</label>
                <input
                  type="text"
                  required
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Module 7: Redis Caching & Message Queues"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Completion Policy</label>
                <select
                  value={newModulePolicy}
                  onChange={(e) => setNewModulePolicy(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="POLICY_A_LESSONS">Policy A: Complete all required lessons</option>
                  <option value="POLICY_B_QUIZ">Policy B: Complete lessons + Pass quiz</option>
                  <option value="POLICY_C_ASSIGNMENT">Policy C: Lessons + Pass quiz + Approved assignment</option>
                  <option value="POLICY_D_SCORE">Policy D: Lessons + Minimum score</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Min Passing Score (%)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={newModulePassingScore}
                  onChange={(e) => setNewModulePassingScore(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewModuleOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--brand-green)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Add Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE LESSON */}
      {isNewLessonOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '440px', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Add Lesson</h3>
            <form onSubmit={handleCreateLesson}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Lesson Title</label>
                <input
                  type="text"
                  required
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="e.g. Lesson 4: Asynchronous Processing"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>Lesson Format</label>
                <select
                  value={newLessonType}
                  onChange={(e) => setNewLessonType(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="TEXT">Structured Educational Notes</option>
                  <option value="CODE">Coding Exercise & Syntax</option>
                  <option value="PDF">Downloadable Study Resource</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewLessonOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--brand-green)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Add Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Course Syllabus Upload & Scanner Modal */}
      <PdfCourseUploadModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onCourseImported={async (imported) => {
          await loadCourses();
          if (imported?.id) {
            setSelectedCourseId(imported.id);
            setActiveTab('courses');
          }
          setNotification({
            type: 'success',
            message: `Course "${imported?.title || 'Syllabus'}" imported successfully!`
          });
          setTimeout(() => setNotification(null), 5000);
        }}
      />
    </div>
  );
}
