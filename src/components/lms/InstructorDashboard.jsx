import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../api/lmsApi';
import LessonContentRenderer, { calculateReadingTime } from './LessonContentRenderer';
import CourseAnalyticsView from './CourseAnalyticsView';
import {
  Users,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Search,
  Filter,
  Check,
  X,
  RotateCcw,
  Award,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  Copy,
  ArrowUp,
  ArrowDown,
  Layers,
  Code2,
  CheckSquare,
  ShieldCheck,
  AlertTriangle,
  Send,
  Eye,
  Settings,
  RefreshCw,
  HelpCircle,
  BarChart3,
  UploadCloud
} from 'lucide-react';
import PdfCourseUploadModal from './PdfCourseUploadModal';

export default function InstructorDashboard({ onPreviewCourse }) {
  // Navigation
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'analytics' | 'builder' | 'students' | 'grading'
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Courses & Overview State
  const [overviewMetrics, setOverviewMetrics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Student Roster & Grading
  const [students, setStudents] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentActivity, setStudentActivity] = useState(null);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [marks, setMarks] = useState(90);
  const [feedback, setFeedback] = useState('');
  const [gradingStatus, setGradingStatus] = useState('APPROVED');

  // Filter state for students
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minProgress, setMinProgress] = useState('');

  // Course Filter state in Overview
  const [courseStatusFilter, setCourseStatusFilter] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'

  // Multi-selection state for Courses and Students
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [isBulkProcessingCourses, setIsBulkProcessingCourses] = useState(false);
  const [selectedStudentEnrollmentIds, setSelectedStudentEnrollmentIds] = useState([]);
  const [isBulkRemovingStudents, setIsBulkRemovingStudents] = useState(false);

  // Modals
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourseData, setEditingCourseData] = useState(null);

  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModuleData, setEditingModuleData] = useState(null);

  const [lessonEditorOpen, setLessonEditorOpen] = useState(false);
  const [editingLessonData, setEditingLessonData] = useState(null);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState(false);

  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuizData, setEditingQuizData] = useState(null);
  const [activeQuizModuleId, setActiveQuizModuleId] = useState(null);

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignmentData, setEditingAssignmentData] = useState(null);
  const [activeAssignmentModuleId, setActiveAssignmentModuleId] = useState(null);

  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [editingExerciseData, setEditingExerciseData] = useState(null);
  const [activeExerciseLessonId, setActiveExerciseLessonId] = useState(null);

  const [publishValidationModalOpen, setPublishValidationModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null); // { type, id, title, extraParams }

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    loadOverview();
    loadPendingSubmissions();
  }, []);

  useEffect(() => {
    if (selectedCourseId && (activeTab === 'builder' || activeTab === 'overview')) {
      loadCurriculum(selectedCourseId);
    }
  }, [selectedCourseId, activeTab]);

  useEffect(() => {
    if (selectedCourseId && activeTab === 'students') {
      loadStudents(selectedCourseId);
    }
  }, [selectedCourseId, activeTab, searchQuery, statusFilter, minProgress]);

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await lmsApi.getInstructorOverview();
      setOverviewMetrics(res.metrics || null);
      setCourses(res.courses || []);
      if (res.courses?.length > 0 && !selectedCourseId) {
        setSelectedCourseId(res.courses[0].id);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Curriculum for Builder
  const loadCurriculum = async (courseId) => {
    try {
      setLoading(true);
      const res = await lmsApi.getCurriculum(courseId);
      setCurriculum(res);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Enrolled Students
  const loadStudents = async (courseId) => {
    try {
      setLoading(true);
      const res = await lmsApi.getCourseStudents(courseId, {
        search: searchQuery,
        status: statusFilter,
        minProgress: minProgress
      });
      setStudents(res.students || []);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Pending Submissions
  const loadPendingSubmissions = async () => {
    try {
      const res = await lmsApi.getPendingSubmissions();
      setPendingSubmissions(res.submissions || []);
    } catch (err) {
      console.warn('Pending submissions load error:', err);
    }
  };

  // Handle Course Creation or Update
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingCourseData.id) {
        await lmsApi.updateCourse(editingCourseData.id, editingCourseData);
        showNotification(`Course "${editingCourseData.title}" updated.`);
      } else {
        const res = await lmsApi.createCourse(editingCourseData);
        showNotification(`Course "${res.course.title}" created successfully.`);
        setSelectedCourseId(res.course.id);
      }
      setCourseModalOpen(false);
      loadOverview();
      if (selectedCourseId) loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Handle Course Duplication
  const handleDuplicateCourse = async (courseId) => {
    try {
      setLoading(true);
      const res = await lmsApi.duplicateCourse(courseId);
      showNotification(`Course duplicated: "${res.course.title}".`);
      await loadOverview();
      setSelectedCourseId(res.course.id);
      setActiveTab('builder');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Pre-flight Publishing Validation
  const handleOpenPublishValidation = async (courseId) => {
    try {
      setLoading(true);
      const res = await lmsApi.validateCoursePublish(courseId);
      setValidationResult(res);
      setPublishValidationModalOpen(true);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Publish / Unpublish Course
  const handleTogglePublish = async (courseId) => {
    try {
      const res = await lmsApi.togglePublishCourse(courseId);
      showNotification(res.message);
      setPublishValidationModalOpen(false);
      loadOverview();
      if (selectedCourseId) loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseId, force = false) => {
    try {
      await lmsApi.deleteCourse(courseId, force);
      showNotification('Course deleted successfully.');
      setConfirmDeleteModal(null);
      await loadOverview();
      if (courses.length > 1) {
        setSelectedCourseId(courses[0].id);
      } else {
        setSelectedCourseId(null);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Bulk Course Handlers
  const handleToggleSelectCourse = (courseId) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSelectAllCourses = () => {
    const activeList = filteredCourses.map(c => c.id);
    if (selectedCourseIds.length === activeList.length && activeList.length > 0) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(activeList);
    }
  };

  const handleBulkDeleteCourses = async () => {
    if (selectedCourseIds.length === 0) return;
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedCourseIds.length} selected course(s) and their full curriculum? This action cannot be undone.`)) return;
    try {
      setIsBulkProcessingCourses(true);
      await lmsApi.bulkDeleteCourses(selectedCourseIds, true);
      showNotification(`Successfully deleted ${selectedCourseIds.length} course(s).`);
      setSelectedCourseIds([]);
      await loadOverview();
    } catch (err) {
      showNotification(err.message || 'Failed to delete selected courses', 'error');
    } finally {
      setIsBulkProcessingCourses(false);
    }
  };

  const handleBulkPublishCourses = async (publish) => {
    if (selectedCourseIds.length === 0) return;
    try {
      setIsBulkProcessingCourses(true);
      for (const id of selectedCourseIds) {
        const c = courses.find(x => x.id === id);
        if (c && Boolean(c.is_published) !== publish) {
          await lmsApi.togglePublishCourse(id);
        }
      }
      showNotification(`Updated publication status for ${selectedCourseIds.length} course(s).`);
      setSelectedCourseIds([]);
      await loadOverview();
    } catch (err) {
      showNotification(err.message || 'Failed to bulk update courses', 'error');
    } finally {
      setIsBulkProcessingCourses(false);
    }
  };

  // Bulk Student Enrollment Handlers
  const handleToggleSelectStudent = (enrollmentId) => {
    setSelectedStudentEnrollmentIds(prev =>
      prev.includes(enrollmentId) ? prev.filter(id => id !== enrollmentId) : [...prev, enrollmentId]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentEnrollmentIds.length === students.length && students.length > 0) {
      setSelectedStudentEnrollmentIds([]);
    } else {
      setSelectedStudentEnrollmentIds(students.map(s => s.enrollment_id));
    }
  };

  const handleBulkRemoveStudents = async () => {
    if (selectedStudentEnrollmentIds.length === 0 || !selectedCourseId) return;
    if (!confirm(`Are you sure you want to unenroll ${selectedStudentEnrollmentIds.length} selected student(s) from this course? Their progress in this course will be reset.`)) return;
    try {
      setIsBulkRemovingStudents(true);
      const res = await lmsApi.bulkRemoveCourseStudents(selectedCourseId, selectedStudentEnrollmentIds);
      showNotification(res.message || `Unenrolled ${selectedStudentEnrollmentIds.length} student(s).`);
      setSelectedStudentEnrollmentIds([]);
      loadStudents(selectedCourseId);
      loadOverview();
    } catch (err) {
      showNotification(err.message || 'Failed to unenroll students', 'error');
    } finally {
      setIsBulkRemovingStudents(false);
    }
  };

  // --- Curriculum Actions: Modules ---
  const handleSaveModule = async (e) => {
    e.preventDefault();
    try {
      if (editingModuleData.id) {
        await lmsApi.updateModule(editingModuleData.id, editingModuleData);
        showNotification('Module updated successfully.');
      } else {
        await lmsApi.createModule(selectedCourseId, editingModuleData);
        showNotification('Module created successfully.');
      }
      setModuleModalOpen(false);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDuplicateModule = async (moduleId) => {
    try {
      await lmsApi.duplicateModule(selectedCourseId, moduleId);
      showNotification('Module and its contents duplicated.');
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleMoveModule = async (moduleId, direction) => {
    if (!curriculum?.modules) return;
    const modules = [...curriculum.modules];
    const index = modules.findIndex(m => m.id === moduleId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    // Swap
    const temp = modules[index];
    modules[index] = modules[targetIndex];
    modules[targetIndex] = temp;

    const newOrderIds = modules.map(m => m.id);
    try {
      await lmsApi.reorderModules(selectedCourseId, newOrderIds);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteModule = async (moduleId, force = false) => {
    try {
      await lmsApi.deleteModule(moduleId, force);
      showNotification('Module deleted.');
      setConfirmDeleteModal(null);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // --- Curriculum Actions: Lessons ---
  const handleOpenLessonEditor = (lesson, moduleId) => {
    const draftKey = `codificator_draft_lesson_${lesson?.id || 'new'}`;
    const savedDraft = localStorage.getItem(draftKey);

    let initialData = lesson ? {
      ...lesson,
      moduleId: lesson.module_id || moduleId
    } : {
      title: 'New Lesson',
      description: '',
      lesson_type: 'TEXT',
      text_content: '# New Lesson\n\nWrite your markdown content here...\n\n```python\nprint("Hello Codificators!")\n```',
      duration_minutes: 15,
      reading_time_minutes: 5,
      key_takeaways: '["Key objective 1", "Key objective 2"]',
      is_mandatory: true,
      moduleId
    };

    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        initialData = { ...initialData, ...parsed, moduleId: initialData.moduleId };
        setDraftRestoredNotice(true);
      } catch (e) {}
    } else {
      setDraftRestoredNotice(false);
    }

    setEditingLessonData(initialData);
    setLessonEditorOpen(true);
  };

  const handleLessonTextChange = (text) => {
    const { minutes } = calculateReadingTime(text);
    const updated = {
      ...editingLessonData,
      text_content: text,
      reading_time_minutes: minutes
    };
    setEditingLessonData(updated);

    // Autosave to localStorage
    const draftKey = `codificator_draft_lesson_${editingLessonData.id || 'new'}`;
    localStorage.setItem(draftKey, JSON.stringify({
      text_content: text,
      title: editingLessonData.title,
      reading_time_minutes: minutes
    }));
  };

  const handleSaveLesson = async (e) => {
    if (e) e.preventDefault();
    try {
      const lessonTitle = (editingLessonData.title || '').trim() || 'New Lesson';
      const targetModuleId = editingLessonData.moduleId || editingLessonData.module_id;
      const payload = {
        ...editingLessonData,
        title: lessonTitle
      };

      if (editingLessonData.id) {
        await lmsApi.updateLesson(editingLessonData.id, payload);
        showNotification('Lesson saved successfully.');
      } else {
        await lmsApi.createLesson(targetModuleId, payload);
        showNotification('Lesson created successfully.');
      }

      // Clear draft
      const draftKey = `codificator_draft_lesson_${editingLessonData.id || 'new'}`;
      localStorage.removeItem(draftKey);

      setLessonEditorOpen(false);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDuplicateLesson = async (moduleId, lessonId) => {
    try {
      await lmsApi.duplicateLesson(moduleId, lessonId);
      showNotification('Lesson duplicated.');
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleMoveLesson = async (moduleId, lessonId, direction) => {
    const mod = curriculum?.modules?.find(m => m.id === moduleId);
    if (!mod || !mod.lessons) return;
    const lessons = [...mod.lessons];
    const index = lessons.findIndex(l => l.id === lessonId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    // Swap
    const temp = lessons[index];
    lessons[index] = lessons[targetIndex];
    lessons[targetIndex] = temp;

    const newOrderIds = lessons.map(l => l.id);
    try {
      await lmsApi.reorderLessons(moduleId, newOrderIds);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteLesson = async (lessonId, force = false) => {
    try {
      await lmsApi.deleteLesson(lessonId, force);
      showNotification('Lesson deleted.');
      setConfirmDeleteModal(null);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // --- Assessment Builder: Quizzes ---
  const handleOpenQuizEditor = async (moduleId, existingQuiz) => {
    setActiveQuizModuleId(moduleId);
    try {
      if (existingQuiz) {
        const res = await lmsApi.getModuleQuizAdmin(moduleId);
        setEditingQuizData(res.quiz || {
          title: 'Module Checkpoint Quiz',
          passing_percentage: 70,
          time_limit_minutes: 20,
          max_attempts: 3,
          is_required: 1,
          questions: []
        });
      } else {
        setEditingQuizData({
          title: 'Module Checkpoint Quiz',
          passing_percentage: 70,
          time_limit_minutes: 20,
          max_attempts: 3,
          is_required: 1,
          questions: [
            {
              prompt: 'Enter your question prompt here',
              question_type: 'SINGLE_CHOICE',
              marks: 1.0,
              explanation: '',
              options: [
                { text: 'Option A (Correct)', is_correct: true },
                { text: 'Option B', is_correct: false },
                { text: 'Option C', is_correct: false },
                { text: 'Option D', is_correct: false }
              ]
            }
          ]
        });
      }
      setQuizModalOpen(true);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createOrUpdateQuiz(activeQuizModuleId, editingQuizData);
      showNotification('Quiz saved successfully.');
      setQuizModalOpen(false);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // --- Assessment Builder: Assignments ---
  const handleOpenAssignmentEditor = async (moduleId, existingAssignment) => {
    setActiveAssignmentModuleId(moduleId);
    if (existingAssignment) {
      setEditingAssignmentData({ ...existingAssignment });
    } else {
      setEditingAssignmentData({
        title: 'Module Practical Project',
        instructions: 'Describe the practical requirements, submission links, or project specifications here...',
        max_marks: 100,
        due_date: '',
        is_required: 1,
        accepted_types: 'text,github,zip',
        rubric: 'Accuracy (40%), Code Quality (40%), Documentation (20%)'
      });
    }
    setAssignmentModalOpen(true);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    try {
      await lmsApi.createOrUpdateAssignment(activeAssignmentModuleId, editingAssignmentData);
      showNotification('Assignment assessment saved successfully.');
      setAssignmentModalOpen(false);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // --- Assessment Builder: Coding Exercises ---
  const handleOpenExerciseEditor = async (lessonId, existingExercise) => {
    setActiveExerciseLessonId(lessonId);
    try {
      if (existingExercise) {
        const res = await lmsApi.getExerciseAdmin(existingExercise.id);
        setEditingExerciseData(res.exercise);
      } else {
        setEditingExerciseData({
          title: 'New Coding Challenge',
          description: 'Solve the problem by implementing the required function.',
          difficulty: 'Easy',
          points: 5,
          language: 'python',
          function_name: 'solution',
          starter_code: 'def solution(x):\n    # Write your solution here\n    pass\n',
          sample_input: 'x = 5',
          sample_output: '10',
          hints: ['Think about edge cases', 'Consider time complexity'],
          explanation: 'Standard algorithmic solution.',
          course_id: selectedCourseId,
          lesson_id: lessonId,
          testCases: [
            { input: [5], expected: 10, is_private: false },
            { input: [10], expected: 20, is_private: true }
          ]
        });
      }
      setExerciseModalOpen(true);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleSaveExercise = async (e) => {
    e.preventDefault();
    try {
      if (editingExerciseData.id) {
        await lmsApi.updateExercise(editingExerciseData.id, editingExerciseData);
        showNotification('Coding exercise updated.');
      } else {
        await lmsApi.createExercise({
          ...editingExerciseData,
          course_id: selectedCourseId,
          lesson_id: activeExerciseLessonId
        });
        showNotification('Coding exercise created with server-protected test cases.');
      }
      setExerciseModalOpen(false);
      loadCurriculum(selectedCourseId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Submit Grading
  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    try {
      await lmsApi.gradeAssignmentSubmission(
        gradingSubmission.id,
        gradingStatus,
        marks,
        feedback
      );
      showNotification(`Submission evaluated: ${gradingStatus}`);
      setGradingSubmission(null);
      loadPendingSubmissions();
      loadOverview();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // View Student Activity
  const handleViewStudentActivity = async (student) => {
    setSelectedStudent(student);
    try {
      const res = await lmsApi.getStudentActivity(student.user_id, selectedCourseId);
      setStudentActivity(res);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  const filteredCourses = courses.filter(c => {
    if (courseStatusFilter === 'ALL') return true;
    if (courseStatusFilter === 'PUBLISHED') return c.status === 'PUBLISHED' || c.is_published;
    if (courseStatusFilter === 'DRAFT') return c.status === 'DRAFT' && !c.is_published;
    if (courseStatusFilter === 'ARCHIVED') return c.status === 'ARCHIVED';
    return true;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px', minHeight: '85vh' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: notification.type === 'error' ? 'var(--brand-red)' : 'var(--brand-green)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontWeight: 700,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {notification.msg}
        </div>
      )}

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: 'var(--brand-green-bg)',
              color: 'var(--brand-green)',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Instructor Portal
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>Phase 9 Curriculum & Course Builder</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, marginTop: '4px', letterSpacing: '-0.02em' }}>
            Course Builder & Curriculum Management
          </h1>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setEditingCourseData({
                title: '',
                slug: '',
                category: 'Full-Stack & APIs',
                level: 'Beginner',
                description: '',
                thumbnail_url: '',
                prerequisites: '',
                learning_objectives: '',
                status: 'DRAFT'
              });
              setCourseModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'var(--brand-green)',
              color: 'white',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontSize: '13.5px'
            }}
          >
            <Plus size={16} /> Create New Course
          </button>
          <button
            onClick={() => setIsPdfModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontSize: '13.5px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <UploadCloud size={16} /> Import from Google Docs / PDF
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        whiteSpace: 'nowrap'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: BookOpen },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'builder', label: 'Curriculum Builder', icon: Layers },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'grading', label: `Reviews (${pendingSubmissions.length})`, icon: Award }
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
                gap: '6px',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? 'var(--brand-green)' : 'var(--text-secondary)',
                borderBottom: isActive ? '3px solid var(--brand-green)' : '3px solid transparent',
                fontSize: '13px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 1. OVERVIEW TAB */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* Metrics Header Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                <span>MANAGED COURSES</span>
                <BookOpen size={16} color="var(--brand-green)" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, marginTop: '8px' }}>
                {overviewMetrics?.totalCourses || courses.length}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '4px' }}>
                {overviewMetrics?.publishedCourses || 0} published • {overviewMetrics?.draftCourses || 0} draft
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                <span>TOTAL ENROLLMENTS</span>
                <Users size={16} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, marginTop: '8px' }}>
                {overviewMetrics?.totalEnrollments || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '4px' }}>
                Active students across all courses
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                <span>STUDENT COMPLETIONS</span>
                <CheckCircle2 size={16} color="var(--brand-green)" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, marginTop: '8px' }}>
                {overviewMetrics?.totalCompletions || 0}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--brand-green)', marginTop: '4px', fontWeight: 700 }}>
                {overviewMetrics?.completionRate || 0}% Completion Rate
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                <span>PENDING REVIEWS</span>
                <AlertCircle size={16} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 900, marginTop: '8px', color: (overviewMetrics?.totalPendingReviews || 0) > 0 ? '#f59e0b' : 'inherit' }}>
                {overviewMetrics?.totalPendingReviews || pendingSubmissions.length}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '4px' }}>
                Assignments requiring your evaluation
              </div>
            </div>
          </div>

          {/* Courses Header & Filter Pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Courses Managed By You</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleSelectAllCourses}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckSquare size={13} />
                {selectedCourseIds.length === filteredCourses.length && filteredCourses.length > 0 ? 'Deselect All' : 'Select All'}
              </button>

              {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map(f => (
                <button
                  key={f}
                  onClick={() => setCourseStatusFilter(f)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: courseStatusFilter === f ? 'var(--brand-green)' : 'var(--bg-card)',
                    color: courseStatusFilter === f ? 'white' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Courses Bulk Action Bar */}
          {selectedCourseIds.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 18px',
              marginBottom: '20px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1.5px solid #3b82f6',
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 800, color: '#1d4ed8' }}>
                <CheckSquare size={16} />
                <span>{selectedCourseIds.length} course(s) selected</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleBulkPublishCourses(true)}
                  disabled={isBulkProcessingCourses}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'var(--brand-green)',
                    color: 'white',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Publish Selected
                </button>

                <button
                  onClick={() => handleBulkPublishCourses(false)}
                  disabled={isBulkProcessingCourses}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Unpublish Selected
                </button>

                <button
                  onClick={handleBulkDeleteCourses}
                  disabled={isBulkProcessingCourses}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                  {isBulkProcessingCourses ? 'Deleting...' : `Delete Selected (${selectedCourseIds.length})`}
                </button>

                <button
                  onClick={() => setSelectedCourseIds([])}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Course Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '18px',
            marginBottom: '36px'
          }}>
            {filteredCourses.map(course => {
              const isPublished = course.status === 'PUBLISHED' || course.is_published;
              const isArchived = course.status === 'ARCHIVED';
              const isSelected = selectedCourseIds.includes(course.id);
              return (
                <div
                  key={course.id}
                  style={{
                    background: isSelected ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-card)',
                    border: isSelected ? '1.5px solid #3b82f6' : '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    {/* Status Pill & Level & Checkbox */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCourse(course.id)}
                          title="Select course for bulk actions"
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: isPublished ? 'var(--brand-green-bg)' : (isArchived ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'),
                          color: isPublished ? 'var(--brand-green)' : (isArchived ? 'var(--brand-red)' : '#f59e0b')
                        }}>
                          {course.status || (isPublished ? 'PUBLISHED' : 'DRAFT')}
                        </span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-light)', fontWeight: 600 }}>
                        {course.category} • {course.level || 'Intermediate'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>
                      {course.title}
                    </h3>
                    <p style={{
                      fontSize: '12.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: '14px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {course.description || 'No description provided.'}
                    </p>

                    {/* Stats pills */}
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '10px 12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '12px'
                    }}>
                      <div>
                        <span style={{ fontWeight: 800 }}>{course.student_count || 0}</span>
                        <span style={{ color: 'var(--text-light)', marginLeft: '4px' }}>Students</span>
                      </div>
                      <div>•</div>
                      <div>
                        <span style={{ fontWeight: 800 }}>{course.module_count || 0}</span>
                        <span style={{ color: 'var(--text-light)', marginLeft: '4px' }}>Modules</span>
                      </div>
                      <div>•</div>
                      <div>
                        <span style={{ fontWeight: 800 }}>{course.avg_progress || 0}%</span>
                        <span style={{ color: 'var(--text-light)', marginLeft: '4px' }}>Avg Progress</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                    <button
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setActiveTab('builder');
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'var(--brand-green)',
                        color: 'white',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Layers size={14} /> Curriculum Builder
                    </button>

                    <button
                      onClick={() => {
                        if (onPreviewCourse) {
                          onPreviewCourse(course.id);
                        } else {
                          window.location.hash = 'student-classroom';
                        }
                      }}
                      title="Preview in Student Classroom"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      onClick={() => {
                        setEditingCourseData({ ...course });
                        setCourseModalOpen(true);
                      }}
                      title="Course Metadata & Settings"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Settings size={15} />
                    </button>

                    <button
                      onClick={() => handleDuplicateCourse(course.id)}
                      title="Duplicate entire course & curriculum"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <Copy size={15} />
                    </button>

                    <button
                      onClick={() => handleOpenPublishValidation(course.id)}
                      title="Publish Validation Workflow"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: isPublished ? 'var(--brand-green-bg)' : 'rgba(245,158,11,0.15)',
                        color: isPublished ? 'var(--brand-green)' : '#f59e0b',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <ShieldCheck size={15} />
                    </button>

                    <button
                      onClick={() => setConfirmDeleteModal({
                        type: 'COURSE',
                        id: course.id,
                        title: course.title
                      })}
                      title="Delete Course"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--brand-red)',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Submissions Queue */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Recent Student Submissions</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                  Student work submitted across courses you manage
                </p>
              </div>
              <button
                onClick={() => setActiveTab('grading')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--brand-green)',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Go to Grading Queue ({pendingSubmissions.length})
              </button>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--text-light)', fontSize: '13px' }}>
                All submissions have been evaluated. There are no pending reviews.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-light)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Student</th>
                      <th style={{ padding: '8px 12px' }}>Course & Module</th>
                      <th style={{ padding: '8px 12px' }}>Assignment</th>
                      <th style={{ padding: '8px 12px' }}>Submitted</th>
                      <th style={{ padding: '8px 12px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSubmissions.slice(0, 5).map(sub => (
                      <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>
                          {sub.student_name}
                          <div style={{ fontSize: '11.5px', color: 'var(--text-light)', fontWeight: 400 }}>{sub.student_email}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontWeight: 600 }}>{sub.course_title}</span>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-light)' }}>{sub.module_title}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontWeight: 700 }}>{sub.assignment_title}</span>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>Max Marks: {sub.max_marks}</div>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-light)', fontSize: '12px' }}>
                          {new Date(sub.submitted_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => {
                              setGradingSubmission(sub);
                              setMarks(sub.max_marks || 90);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'var(--brand-green)',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Review & Grade
                          </button>
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

      {/* ======================================================== */}
      {/* 2. VISUAL CURRICULUM BUILDER TAB */}
      {/* ======================================================== */}
      {activeTab === 'builder' && (
        <div>
          {/* Top Course Selection Bar & Workflow Actions */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                Active Course:
              </label>
              <select
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '14px',
                  minWidth: '260px'
                }}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status || (c.is_published ? 'PUBLISHED' : 'DRAFT')})
                  </option>
                ))}
              </select>

              {selectedCourse && (
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: (selectedCourse.status === 'PUBLISHED' || selectedCourse.is_published)
                    ? 'var(--brand-green-bg)'
                    : 'rgba(245,158,11,0.15)',
                  color: (selectedCourse.status === 'PUBLISHED' || selectedCourse.is_published)
                    ? 'var(--brand-green)'
                    : '#f59e0b'
                }}>
                  {selectedCourse.status || (selectedCourse.is_published ? 'PUBLISHED' : 'DRAFT')}
                </span>
              )}
            </div>

            {/* Quick Actions for Selected Course */}
            {selectedCourse && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleOpenPublishValidation(selectedCourse.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: (selectedCourse.status === 'PUBLISHED' || selectedCourse.is_published) ? 'var(--brand-green-bg)' : '#f59e0b',
                    color: (selectedCourse.status === 'PUBLISHED' || selectedCourse.is_published) ? 'var(--brand-green)' : 'white',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <ShieldCheck size={15} />
                  Validate & Publish
                </button>

                <button
                  onClick={() => {
                    if (onPreviewCourse) onPreviewCourse(selectedCourse.id);
                    else window.location.hash = 'student-classroom';
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={15} /> Preview
                </button>

                <button
                  onClick={() => {
                    setEditingCourseData({ ...selectedCourse });
                    setCourseModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <Settings size={15} /> Course Settings
                </button>

                <button
                  onClick={() => {
                    setEditingModuleData({
                      title: '',
                      description: '',
                      estimated_duration: '2 hours',
                      completion_policy: 'POLICY_B_QUIZ',
                      min_passing_score: 70,
                      prerequisite_module_id: null
                    });
                    setModuleModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'var(--brand-green)',
                    color: 'white',
                    fontWeight: 700,
                    border: 'none',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={15} /> Add Module
                </button>
              </div>
            )}
          </div>

          {/* Modules List View */}
          {!curriculum?.modules || curriculum.modules.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '2px dashed var(--border-color)',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <Layers size={40} color="var(--text-light)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                This Course Has No Modules Yet
              </h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px', maxWidth: '420px', margin: '0 auto 18px auto' }}>
                A course requires at least one module containing lessons before it can be validated and published to students.
              </p>
              <button
                onClick={() => {
                  setEditingModuleData({
                    title: 'Module 1: Introduction & Fundamentals',
                    description: '',
                    estimated_duration: '2 hours',
                    completion_policy: 'POLICY_A_LESSONS',
                    min_passing_score: 70,
                    prerequisite_module_id: null
                  });
                  setModuleModalOpen(true);
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: 'var(--brand-green)',
                  color: 'white',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13.5px'
                }}
              >
                <Plus size={16} /> Add First Module
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {curriculum.modules.map((mod, modIdx) => (
                <div
                  key={mod.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Module Header Bar */}
                  <div style={{
                    padding: '16px 20px',
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        background: 'var(--brand-green)',
                        color: 'white',
                        fontWeight: 900,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px'
                      }}>
                        {modIdx + 1}
                      </span>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                          {mod.title}
                        </h4>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>
                          Duration: {mod.estimated_duration} • Policy: {mod.completion_policy}
                          {mod.completion_policy === 'POLICY_B_QUIZ' && ` (Passing: ${mod.min_passing_score}%)`}
                        </div>
                      </div>
                    </div>

                    {/* Module Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handleMoveModule(mod.id, 'up')}
                        disabled={modIdx === 0}
                        title="Move Module Up"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          cursor: modIdx === 0 ? 'not-allowed' : 'pointer',
                          opacity: modIdx === 0 ? 0.4 : 1
                        }}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveModule(mod.id, 'down')}
                        disabled={modIdx === curriculum.modules.length - 1}
                        title="Move Module Down"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          cursor: modIdx === curriculum.modules.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: modIdx === curriculum.modules.length - 1 ? 0.4 : 1
                        }}
                      >
                        <ArrowDown size={14} />
                      </button>

                      <button
                        onClick={() => handleDuplicateModule(mod.id)}
                        title="Duplicate Module (with lessons & assessments)"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Copy size={13} /> Duplicate
                      </button>

                      <button
                        onClick={() => {
                          setEditingModuleData({ ...mod });
                          setModuleModalOpen(true);
                        }}
                        title="Edit Module Details"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Edit3 size={13} /> Edit
                      </button>

                      <button
                        onClick={() => setConfirmDeleteModal({
                          type: 'MODULE',
                          id: mod.id,
                          title: mod.title
                        })}
                        title="Delete Module"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          color: 'var(--brand-red)',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Module Content Body */}
                  <div style={{ padding: '16px 20px' }}>
                    {/* Lessons Section */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                          LESSONS ({mod.lessons?.length || 0})
                        </span>
                        <button
                          onClick={() => handleOpenLessonEditor(null, mod.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--brand-green)',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={13} /> Add Lesson
                        </button>
                      </div>

                      {(!mod.lessons || mod.lessons.length === 0) ? (
                        <div style={{
                          padding: '16px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontSize: '12.5px',
                          color: 'var(--text-light)'
                        }}>
                          No lessons in this module yet. Add your first lesson to provide learning content.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {mod.lessons.map((lesson, lIdx) => (
                            <div
                              key={lesson.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 14px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                flexWrap: 'wrap',
                                gap: '10px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-light)', minWidth: '18px' }}>
                                  {lIdx + 1}.
                                </span>
                                <FileText size={16} color="var(--brand-green)" />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '13.5px' }}>
                                    {lesson.title}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                                    {lesson.lesson_type} • Est. {lesson.reading_time_minutes || 5} min read
                                    {lesson.is_mandatory ? ' • Mandatory' : ' • Optional'}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  onClick={() => handleMoveLesson(mod.id, lesson.id, 'up')}
                                  disabled={lIdx === 0}
                                  style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: lIdx === 0 ? 'not-allowed' : 'pointer', opacity: lIdx === 0 ? 0.3 : 1 }}
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  onClick={() => handleMoveLesson(mod.id, lesson.id, 'down')}
                                  disabled={lIdx === mod.lessons.length - 1}
                                  style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: lIdx === mod.lessons.length - 1 ? 'not-allowed' : 'pointer', opacity: lIdx === mod.lessons.length - 1 ? 0.3 : 1 }}
                                >
                                  <ArrowDown size={12} />
                                </button>

                                <button
                                  onClick={() => handleOpenLessonEditor(lesson, mod.id)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--brand-green)',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Edit3 size={12} /> Edit Markdown
                                </button>

                                <button
                                  onClick={() => handleOpenExerciseEditor(lesson.id, null)}
                                  title="Add interactive coding exercise for this lesson"
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)',
                                    color: '#3b82f6',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Code2 size={12} /> + Coding Ex
                                </button>

                                <button
                                  onClick={() => handleDuplicateLesson(mod.id, lesson.id)}
                                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}
                                >
                                  <Copy size={12} />
                                </button>

                                <button
                                  onClick={() => setConfirmDeleteModal({
                                    type: 'LESSON',
                                    id: lesson.id,
                                    title: lesson.title
                                  })}
                                  style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--brand-red)', cursor: 'pointer' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assessments Section for Module (Quiz & Assignment) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '12px',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '14px'
                    }}>
                      {/* Quiz Card */}
                      <div style={{
                        padding: '12px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckSquare size={15} color="#8b5cf6" />
                            <span style={{ fontSize: '13px', fontWeight: 800 }}>
                              {mod.quiz ? mod.quiz.title : 'Module Checkpoint Quiz'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {mod.quiz
                              ? `${mod.quiz.questions?.length || 0} Questions • Pass: ${mod.quiz.passing_percentage}%`
                              : 'No quiz configured'}
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenQuizEditor(mod.id, mod.quiz)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '5px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: '#8b5cf6',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {mod.quiz ? 'Edit Quiz' : '+ Create Quiz'}
                        </button>
                      </div>

                      {/* Assignment Card */}
                      <div style={{
                        padding: '12px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Award size={15} color="#f59e0b" />
                            <span style={{ fontSize: '13px', fontWeight: 800 }}>
                              {mod.assignment ? mod.assignment.title : 'Practical Assignment'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                            {mod.assignment
                              ? `Max Marks: ${mod.assignment.max_marks} • Rubric: ${mod.assignment.rubric?.substring(0, 24)}...`
                              : 'No assignment configured'}
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenAssignmentEditor(mod.id, mod.assignment)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '5px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: '#f59e0b',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {mod.assignment ? 'Edit Assignment' : '+ Create Assignment'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ENROLLED STUDENTS TAB */}
      {/* ======================================================== */}
      {activeTab === 'students' && (
        <div>
          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            background: 'var(--bg-card)',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            >
              <option value="">All Enrollment Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DROPPED">DROPPED</option>
            </select>

            <select
              value={minProgress}
              onChange={(e) => setMinProgress(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            >
              <option value="">Any Progress</option>
              <option value="25">≥ 25% Complete</option>
              <option value="50">≥ 50% Complete</option>
              <option value="75">≥ 75% Complete</option>
              <option value="100">100% (Certified)</option>
            </select>
          </div>

          {/* Students Bulk Action Bar */}
          {selectedStudentEnrollmentIds.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 18px',
              marginBottom: '16px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid #ef4444',
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 800, color: '#dc2626' }}>
                <CheckSquare size={16} />
                <span>{selectedStudentEnrollmentIds.length} student enrollment(s) selected</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleBulkRemoveStudents}
                  disabled={isBulkRemovingStudents}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                  {isBulkRemovingStudents ? 'Unenrolling...' : `Unenroll Selected (${selectedStudentEnrollmentIds.length})`}
                </button>

                <button
                  onClick={() => setSelectedStudentEnrollmentIds([])}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Students Table */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            {students.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)', fontSize: '13.5px' }}>
                No enrolled students found for the current course and filter criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-light)', textAlign: 'left' }}>
                      <th style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={students.length > 0 && selectedStudentEnrollmentIds.length === students.length}
                          onChange={handleSelectAllStudents}
                          title="Select All Students"
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </th>
                      <th style={{ padding: '12px 16px' }}>Student</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Progress</th>
                      <th style={{ padding: '12px 16px' }}>Quiz Avg</th>
                      <th style={{ padding: '12px 16px' }}>Enrolled On</th>
                      <th style={{ padding: '12px 16px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.enrollment_id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedStudentEnrollmentIds.includes(s.enrollment_id) ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                        <td style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedStudentEnrollmentIds.includes(s.enrollment_id)}
                            onChange={() => handleToggleSelectStudent(s.enrollment_id)}
                            title="Select student"
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700 }}>{s.student_name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-light)' }}>{s.student_email}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: s.enrollment_status === 'COMPLETED' ? 'var(--brand-green-bg)' : 'rgba(59,130,246,0.1)',
                            color: s.enrollment_status === 'COMPLETED' ? 'var(--brand-green)' : '#3b82f6'
                          }}>
                            {s.enrollment_status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, minWidth: '60px', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${s.progress_percent}%`, height: '100%', background: 'var(--brand-green)' }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '12px' }}>{s.progress_percent}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                          {s.avg_quiz_score !== null ? `${s.avg_quiz_score}%` : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-light)', fontSize: '12px' }}>
                          {new Date(s.enrolled_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleViewStudentActivity(s)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '5px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--brand-green)',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              View Activity
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`Unenroll student "${s.student_name}" from this course?`)) {
                                  try {
                                    await lmsApi.bulkRemoveCourseStudents(selectedCourseId, [s.enrollment_id]);
                                    showNotification(`Unenrolled ${s.student_name}`);
                                    loadStudents(selectedCourseId);
                                    loadOverview();
                                  } catch (err) {
                                    showNotification(err.message, 'error');
                                  }
                                }
                              }}
                              title="Unenroll student"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid #fecaca',
                                background: '#fee2e2',
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
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. GRADING QUEUE TAB */}
      {/* ======================================================== */}
      {activeTab === 'grading' && (
        <div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              Pending Assignment Reviews
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-light)', marginBottom: '18px' }}>
              Submissions from your assigned courses waiting for your score and feedback
            </p>

            {pendingSubmissions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)', fontSize: '14px' }}>
                No submissions require review right now.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingSubmissions.map(sub => (
                  <div
                    key={sub.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '15px' }}>{sub.assignment_title}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: 'rgba(245,158,11,0.15)',
                          color: '#f59e0b'
                        }}>
                          {sub.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Student: <span style={{ fontWeight: 700 }}>{sub.student_name}</span> ({sub.student_email})
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-light)', marginTop: '2px' }}>
                        Course: {sub.course_title} • Module: {sub.module_title} • Submitted: {new Date(sub.submitted_at).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setGradingSubmission(sub);
                        setMarks(sub.max_marks || 90);
                        setFeedback('');
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'var(--brand-green)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Evaluate Submission
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. PHASE 10: LEARNING ANALYTICS TAB */}
      {/* ======================================================== */}
      {activeTab === 'analytics' && (
        <CourseAnalyticsView
          courses={courses}
          initialCourseId={selectedCourseId}
          onSelectCourse={(cId) => setSelectedCourseId(cId)}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: Course Settings & Metadata */}
      {/* ======================================================== */}
      {courseModalOpen && editingCourseData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              {editingCourseData.id ? 'Edit Course Settings' : 'Create New Course'}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-light)', marginBottom: '16px' }}>
              Configure metadata, prerequisites, and learning objectives for this course.
            </p>

            <form onSubmit={handleSaveCourse}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Course Title *</label>
                <input
                  type="text"
                  required
                  value={editingCourseData.title || ''}
                  onChange={(e) => setEditingCourseData({ ...editingCourseData, title: e.target.value })}
                  placeholder="e.g., Advanced Full-Stack Architecture"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Category *</label>
                  <input
                    type="text"
                    required
                    value={editingCourseData.category || ''}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, category: e.target.value })}
                    placeholder="e.g., Full-Stack, Python, AI"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Difficulty Level</label>
                  <select
                    value={editingCourseData.level || 'Intermediate'}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, level: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700 }}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Course Description *</label>
                <textarea
                  rows={3}
                  required
                  value={editingCourseData.description || ''}
                  onChange={(e) => setEditingCourseData({ ...editingCourseData, description: e.target.value })}
                  placeholder="Provide an overview of the curriculum and skills taught..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Thumbnail Image URL</label>
                <input
                  type="text"
                  value={editingCourseData.thumbnail_url || ''}
                  onChange={(e) => setEditingCourseData({ ...editingCourseData, thumbnail_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Prerequisites</label>
                  <textarea
                    rows={2}
                    value={editingCourseData.prerequisites || ''}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, prerequisites: e.target.value })}
                    placeholder="e.g., Basic JavaScript, HTML/CSS"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12.5px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Learning Objectives</label>
                  <textarea
                    rows={2}
                    value={editingCourseData.learning_objectives || ''}
                    onChange={(e) => setEditingCourseData({ ...editingCourseData, learning_objectives: e.target.value })}
                    placeholder="e.g., Master REST APIs, Build Full-Stack Apps"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12.5px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--brand-green)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  {editingCourseData.id ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Module Editor */}
      {/* ======================================================== */}
      {moduleModalOpen && editingModuleData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '540px', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              {editingModuleData.id ? 'Edit Module' : 'Add New Curriculum Module'}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-light)', marginBottom: '16px' }}>
              Modules group lessons sequentially and define completion gates for student progress.
            </p>

            <form onSubmit={handleSaveModule}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Module Title *</label>
                <input
                  type="text"
                  required
                  value={editingModuleData.title || ''}
                  onChange={(e) => setEditingModuleData({ ...editingModuleData, title: e.target.value })}
                  placeholder="e.g., Module 2: State Management & Persistence"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Estimated Duration</label>
                  <input
                    type="text"
                    value={editingModuleData.estimated_duration || '2 hours'}
                    onChange={(e) => setEditingModuleData({ ...editingModuleData, estimated_duration: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Completion Policy</label>
                  <select
                    value={editingModuleData.completion_policy || 'POLICY_B_QUIZ'}
                    onChange={(e) => setEditingModuleData({ ...editingModuleData, completion_policy: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700 }}
                  >
                    <option value="POLICY_A_LESSONS">Lessons Only (Auto Unlocks Next)</option>
                    <option value="POLICY_B_QUIZ">Passing Checkpoint Quiz Required</option>
                    <option value="POLICY_C_ASSIGNMENT">Approved Assignment Required</option>
                    <option value="POLICY_D_QUIZ_AND_ASSIGNMENT">Quiz + Assignment Required</option>
                  </select>
                </div>
              </div>

              {editingModuleData.completion_policy !== 'POLICY_A_LESSONS' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Minimum Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingModuleData.min_passing_score || 70}
                    onChange={(e) => setEditingModuleData({ ...editingModuleData, min_passing_score: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModuleModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--brand-green)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Visual Markdown Lesson Editor & Live Preview */}
      {/* ======================================================== */}
      {lessonEditorOpen && editingLessonData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            width: '95%',
            maxWidth: '1200px',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                  {editingLessonData.id ? `Edit Lesson: ${editingLessonData.title}` : 'Author New Lesson'}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                  Auto-calculated reading time: <span style={{ fontWeight: 700, color: 'var(--brand-green)' }}>{editingLessonData.reading_time_minutes} min</span> (225 words/min, excluding code blocks)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {draftRestoredNotice && (
                  <span style={{ fontSize: '11.5px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    Restored from draft
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setLessonEditorOpen(false)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLesson}
                  style={{
                    padding: '6px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--brand-green)',
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Lesson
                </button>
              </div>
            </div>

            {/* Lesson Title & Metadata Inputs */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-light)', marginBottom: '3px' }}>Lesson Title</label>
                <input
                  type="text"
                  value={editingLessonData.title || ''}
                  onChange={(e) => setEditingLessonData({ ...editingLessonData, title: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-light)', marginBottom: '3px' }}>Reading Time (Mins)</label>
                <input
                  type="number"
                  min="1"
                  value={editingLessonData.reading_time_minutes || 5}
                  onChange={(e) => setEditingLessonData({ ...editingLessonData, reading_time_minutes: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-light)', marginBottom: '3px' }}>Duration (Mins)</label>
                <input
                  type="number"
                  min="1"
                  value={editingLessonData.duration_minutes || 15}
                  onChange={(e) => setEditingLessonData({ ...editingLessonData, duration_minutes: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Split Screen Markdown Authoring Area */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
              {/* Left Column: Markdown Input */}
              <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 800, color: 'var(--text-light)' }}>
                  MARKDOWN AUTHORING
                </div>
                <textarea
                  value={editingLessonData.text_content || ''}
                  onChange={(e) => handleLessonTextChange(e.target.value)}
                  style={{
                    flex: 1,
                    width: '100%',
                    padding: '16px',
                    border: 'none',
                    outline: 'none',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13.5px',
                    lineHeight: '1.6',
                    resize: 'none'
                  }}
                  placeholder="# Lesson Title&#10;&#10;Write rich markdown here..."
                />
              </div>

              {/* Right Column: Live Markdown & Code Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 800, color: 'var(--brand-green)' }}>
                  LIVE PREVIEW (WITH SYNTAX HIGHLIGHTING)
                </div>
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: 'var(--bg-card)' }}>
                  <LessonContentRenderer rawContent={editingLessonData.text_content || ''} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Assessment Builder - Quiz */}
      {/* ======================================================== */}
      {quizModalOpen && editingQuizData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              Quiz Assessment Builder
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-light)', marginBottom: '16px' }}>
              Define multiple-choice, multi-select, and true/false questions. Answer keys remain server-side and protected.
            </p>

            <form onSubmit={handleSaveQuiz}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Quiz Title</label>
                  <input
                    type="text"
                    required
                    value={editingQuizData.title || ''}
                    onChange={(e) => setEditingQuizData({ ...editingQuizData, title: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Pass Score (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingQuizData.passing_percentage || 70}
                    onChange={(e) => setEditingQuizData({ ...editingQuizData, passing_percentage: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Time Limit (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingQuizData.time_limit_minutes || 20}
                    onChange={(e) => setEditingQuizData({ ...editingQuizData, time_limit_minutes: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Questions List */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800 }}>
                    Questions ({editingQuizData.questions?.length || 0})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const questions = [...(editingQuizData.questions || [])];
                      questions.push({
                        prompt: `Question ${questions.length + 1}`,
                        question_type: 'SINGLE_CHOICE',
                        marks: 1.0,
                        explanation: '',
                        options: [
                          { text: 'Option A (Correct)', is_correct: true },
                          { text: 'Option B', is_correct: false },
                          { text: 'Option C', is_correct: false },
                          { text: 'Option D', is_correct: false }
                        ]
                      });
                      setEditingQuizData({ ...editingQuizData, questions });
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--brand-green)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Add Question
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(editingQuizData.questions || []).map((q, qIdx) => (
                    <div
                      key={qIdx}
                      style={{
                        padding: '14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px' }}>Question {qIdx + 1}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            value={q.question_type || 'SINGLE_CHOICE'}
                            onChange={(e) => {
                              const questions = [...editingQuizData.questions];
                              questions[qIdx].question_type = e.target.value;
                              setEditingQuizData({ ...editingQuizData, questions });
                            }}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '11.5px', fontWeight: 700 }}
                          >
                            <option value="SINGLE_CHOICE">Multiple Choice (Single Option)</option>
                            <option value="MULTIPLE_CHOICE">Multiple Select (Checkboxes)</option>
                            <option value="TRUE_FALSE">True / False</option>
                            <option value="SHORT_ANSWER">Short Answer</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const questions = editingQuizData.questions.filter((_, idx) => idx !== qIdx);
                              setEditingQuizData({ ...editingQuizData, questions });
                            }}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--brand-red)', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={q.prompt || ''}
                        onChange={(e) => {
                          const questions = [...editingQuizData.questions];
                          questions[qIdx].prompt = e.target.value;
                          setEditingQuizData({ ...editingQuizData, questions });
                        }}
                        placeholder="Enter the question prompt..."
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '10px' }}
                      />

                      {/* Options */}
                      <div style={{ paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-light)', marginBottom: '6px' }}>
                          OPTIONS & ANSWER KEYS (Mark which options are correct)
                        </div>
                        {(q.options || []).map((opt, oIdx) => (
                          <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(opt.is_correct)}
                              onChange={(e) => {
                                const questions = [...editingQuizData.questions];
                                if (q.question_type === 'SINGLE_CHOICE' || q.question_type === 'TRUE_FALSE') {
                                  // Only one correct option allowed
                                  questions[qIdx].options.forEach((o, i) => {
                                    o.is_correct = i === oIdx;
                                  });
                                } else {
                                  questions[qIdx].options[oIdx].is_correct = e.target.checked;
                                }
                                setEditingQuizData({ ...editingQuizData, questions });
                              }}
                              title="Mark as Correct Answer"
                              style={{ width: '16px', height: '16px', accentColor: 'var(--brand-green)', cursor: 'pointer' }}
                            />
                            <input
                              type="text"
                              value={opt.text || ''}
                              onChange={(e) => {
                                const questions = [...editingQuizData.questions];
                                questions[qIdx].options[oIdx].text = e.target.value;
                                setEditingQuizData({ ...editingQuizData, questions });
                              }}
                              style={{ flex: 1, padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12.5px' }}
                            />
                            {opt.is_correct && (
                              <span style={{ fontSize: '11px', color: 'var(--brand-green)', fontWeight: 800 }}>
                                Correct Key
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setQuizModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--brand-green)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Quiz Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Assessment Builder - Assignment */}
      {/* ======================================================== */}
      {assignmentModalOpen && editingAssignmentData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '580px', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              Assignment Assessment Builder
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-light)', marginBottom: '16px' }}>
              Configure instructions, rubric guidelines, and maximum points for student submissions.
            </p>

            <form onSubmit={handleSaveAssignment}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={editingAssignmentData.title || ''}
                  onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Detailed Instructions *</label>
                <textarea
                  rows={4}
                  required
                  value={editingAssignmentData.instructions || ''}
                  onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, instructions: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Max Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={editingAssignmentData.max_marks || 100}
                    onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, max_marks: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Accepted Submission Types</label>
                  <input
                    type="text"
                    value={editingAssignmentData.accepted_types || 'text,github,zip'}
                    onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, accepted_types: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Grading Rubric</label>
                <input
                  type="text"
                  value={editingAssignmentData.rubric || ''}
                  onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, rubric: e.target.value })}
                  placeholder="e.g., Code Quality (40%), Functionality (40%), Tests (20%)"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAssignmentModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--brand-green)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Assessment Builder - Coding Exercise */}
      {/* ======================================================== */}
      {exerciseModalOpen && editingExerciseData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              Coding Practice Builder
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-light)', marginBottom: '16px' }}>
              Configure interactive coding challenges. Private test cases remain strictly server-side and are never exposed to clients.
            </p>

            <form onSubmit={handleSaveExercise}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Exercise Title *</label>
                  <input
                    type="text"
                    required
                    value={editingExerciseData.title || ''}
                    onChange={(e) => setEditingExerciseData({ ...editingExerciseData, title: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Language</label>
                  <select
                    value={editingExerciseData.language || 'python'}
                    onChange={(e) => setEditingExerciseData({ ...editingExerciseData, language: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700 }}
                  >
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript (Node)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Difficulty</label>
                  <select
                    value={editingExerciseData.difficulty || 'Easy'}
                    onChange={(e) => setEditingExerciseData({ ...editingExerciseData, difficulty: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700 }}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Function Name *</label>
                  <input
                    type="text"
                    required
                    value={editingExerciseData.function_name || ''}
                    onChange={(e) => setEditingExerciseData({ ...editingExerciseData, function_name: e.target.value })}
                    placeholder="e.g., solution"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Points Awarded</label>
                  <input
                    type="number"
                    min="1"
                    value={editingExerciseData.points || 5}
                    onChange={(e) => setEditingExerciseData({ ...editingExerciseData, points: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Starter Code *</label>
                <textarea
                  rows={4}
                  required
                  value={editingExerciseData.starter_code || ''}
                  onChange={(e) => setEditingExerciseData({ ...editingExerciseData, starter_code: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                />
              </div>

              {/* Test Cases Editor */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800 }}>
                    Test Cases (Public & Server-Side Protected Private)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const tcs = [...(editingExerciseData.testCases || [])];
                      tcs.push({ input: [], expected: null, is_private: true });
                      setEditingExerciseData({ ...editingExerciseData, testCases: tcs });
                    }}
                    style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--brand-green)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Test Case
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(editingExerciseData.testCases || []).map((tc, tcIdx) => (
                    <div
                      key={tcIdx}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        display: 'grid',
                        gridTemplateColumns: '2fr 2fr 1.5fr auto',
                        gap: '10px',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block' }}>Input JSON</label>
                        <input
                          type="text"
                          value={typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input)}
                          onChange={(e) => {
                            const tcs = [...editingExerciseData.testCases];
                            try { tcs[tcIdx].input = JSON.parse(e.target.value); } catch (_) { tcs[tcIdx].input = e.target.value; }
                            setEditingExerciseData({ ...editingExerciseData, testCases: tcs });
                          }}
                          placeholder="[5]"
                          style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block' }}>Expected JSON</label>
                        <input
                          type="text"
                          value={typeof tc.expected === 'string' ? tc.expected : JSON.stringify(tc.expected)}
                          onChange={(e) => {
                            const tcs = [...editingExerciseData.testCases];
                            try { tcs[tcIdx].expected = JSON.parse(e.target.value); } catch (_) { tcs[tcIdx].expected = e.target.value; }
                            setEditingExerciseData({ ...editingExerciseData, testCases: tcs });
                          }}
                          placeholder="10"
                          style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(tc.is_private)}
                          onChange={(e) => {
                            const tcs = [...editingExerciseData.testCases];
                            tcs[tcIdx].is_private = e.target.checked;
                            setEditingExerciseData({ ...editingExerciseData, testCases: tcs });
                          }}
                          style={{ accentColor: 'var(--brand-green)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: tc.is_private ? 'var(--brand-green)' : 'var(--text-light)' }}>
                          {tc.is_private ? 'Protected Secret' : 'Public Case'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const tcs = editingExerciseData.testCases.filter((_, idx) => idx !== tcIdx);
                          setEditingExerciseData({ ...editingExerciseData, testCases: tcs });
                        }}
                        style={{ marginTop: '14px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--brand-red)', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setExerciseModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--brand-green)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Coding Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Pre-Flight Publishing Validation */}
      {/* ======================================================== */}
      {publishValidationModalOpen && validationResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '580px', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              {validationResult.isValid ? (
                <CheckCircle2 size={24} color="var(--brand-green)" />
              ) : (
                <AlertTriangle size={24} color="var(--brand-red)" />
              )}
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Course Publishing Validation
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Checking course structure, lesson content, and assessment configs before publication:
            </p>

            {/* Validation Errors */}
            {validationResult.errors && validationResult.errors.length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--brand-red)', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontWeight: 800, color: 'var(--brand-red)', fontSize: '13px', marginBottom: '6px' }}>
                  Action Required: {validationResult.errors.length} Blocking Issue(s)
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                  {validationResult.errors.map((err, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Warnings */}
            {validationResult.warnings && validationResult.warnings.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '13px', marginBottom: '6px' }}>
                  Recommendations ({validationResult.warnings.length})
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                  {validationResult.warnings.map((w, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationResult.isValid && (!validationResult.warnings || validationResult.warnings.length === 0) && (
              <div style={{ background: 'var(--brand-green-bg)', border: '1px solid var(--brand-green)', borderRadius: '8px', padding: '14px', marginBottom: '16px', color: 'var(--brand-green)', fontSize: '13px', fontWeight: 700 }}>
                Course passed all curriculum and assessment checks. Ready for public student enrollment.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPublishValidationModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => handleTogglePublish(validationResult.courseId)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: validationResult.is_published ? '#f59e0b' : 'var(--brand-green)',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {validationResult.is_published ? 'Unpublish Course (Set to Draft)' : 'Publish Course Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Safe Destructive Confirmation */}
      {/* ======================================================== */}
      {confirmDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '480px', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={24} color="var(--brand-red)" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                Confirm Permanent Removal
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to delete {confirmDeleteModal.type.toLowerCase()} <strong>"{confirmDeleteModal.title}"</strong>?
              If students have completed lessons or submissions, progress integrity checks may prevent deletion unless forced.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDeleteModal.type === 'COURSE') handleDeleteCourse(confirmDeleteModal.id);
                  else if (confirmDeleteModal.type === 'MODULE') handleDeleteModule(confirmDeleteModal.id);
                  else if (confirmDeleteModal.type === 'LESSON') handleDeleteLesson(confirmDeleteModal.id);
                }}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--brand-red)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Grading Evaluation Dialog */}
      {/* ======================================================== */}
      {gradingSubmission && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '580px', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
              Grade Assignment: {gradingSubmission.assignment_title}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Student: {gradingSubmission.student_name} ({gradingSubmission.student_email})
            </p>

            <form onSubmit={handleSubmitGrade}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Submission Content
                </label>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', maxHeight: '140px', overflowY: 'auto', fontFamily: 'var(--font-mono)' }}>
                  {gradingSubmission.content_text || 'Submitted file: ' + gradingSubmission.file_url}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Review Decision
                  </label>
                  <select
                    value={gradingStatus}
                    onChange={(e) => setGradingStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 700 }}
                  >
                    <option value="APPROVED">APPROVED (Unlocks Next Module!)</option>
                    <option value="RESUBMISSION_REQUIRED">RESUBMISSION REQUIRED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Marks Awarded (Max: {gradingSubmission.max_marks || 100})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={gradingSubmission.max_marks || 100}
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Constructive Feedback
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback on code structure, semantic tags, and performance..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'var(--brand-green)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Student Activity Drawer */}
      {/* ======================================================== */}
      {selectedStudent && studentActivity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Student Learning Profile</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  {studentActivity.student.name} • {studentActivity.student.email}
                </p>
              </div>
              <button
                onClick={() => { setSelectedStudent(null); setStudentActivity(null); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Quiz attempts stream */}
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>Quiz Checkpoint Attempts</h4>
              {studentActivity.quiz_attempts?.length === 0 ? (
                <p style={{ color: 'var(--text-light)', fontSize: '12.5px' }}>No quiz attempts recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {studentActivity.quiz_attempts.map(q => (
                    <div key={q.id} style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700 }}>{q.quiz_title}</span>
                      <span style={{ fontWeight: 800, color: q.is_passed ? 'var(--brand-green)' : 'var(--brand-red)' }}>
                        {q.percentage}% {q.is_passed ? '(Passed)' : '(Failed)'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent lesson activity */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>Recent Lesson Progress</h4>
              {studentActivity.lesson_activities?.length === 0 ? (
                <p style={{ color: 'var(--text-light)', fontSize: '12.5px' }}>No lesson activity started yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {studentActivity.lesson_activities.map(lp => (
                    <div key={lp.id} style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600 }}>{lp.lesson_title}</span>
                      <span style={{ fontWeight: 800, color: lp.status === 'COMPLETED' ? 'var(--brand-green)' : '#f59e0b' }}>
                        {lp.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF Course Syllabus Upload & Scanner Modal */}
      <PdfCourseUploadModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onCourseImported={async (imported) => {
          await loadOverview();
          if (imported?.id) {
            setSelectedCourseId(imported.id);
            setActiveTab('overview');
          }
          showNotification(`Course "${imported?.title || 'Syllabus'}" imported successfully from PDF!`, 'success');
        }}
      />
    </div>
  );
}
