import React, { useState, useEffect, useMemo } from 'react';
import { lmsApi } from '../../api/lmsApi';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Users,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Download,
  Filter,
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Layers,
  Code2,
  FileText,
  AlertTriangle,
  RotateCcw,
  Eye,
  X,
  ArrowRight,
  BookOpen,
  PieChart,
  Activity
} from 'lucide-react';

export default function CourseAnalyticsView({ courses = [], initialCourseId = null, onSelectCourse }) {
  // Navigation & Sub-views
  const [subTab, setSubTab] = useState('overview'); // 'overview' | 'funnel' | 'assessments' | 'students'

  // Selected Course & Time Filter
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || (courses[0]?.id || ''));
  const [timeWindow, setTimeWindow] = useState('all'); // '7d' | '30d' | '90d' | 'all' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);

  // Student Roster State
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatus, setStudentStatus] = useState('ALL');
  const [studentProgressFilter, setStudentProgressFilter] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentsData, setStudentsData] = useState({ students: [], pagination: { total: 0, page: 1, totalPages: 1 } });
  const [inspectStudent, setInspectStudent] = useState(null); // student detail modal

  // Notification Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync initialCourseId prop
  useEffect(() => {
    if (initialCourseId && initialCourseId !== selectedCourseId) {
      setSelectedCourseId(initialCourseId);
    }
  }, [initialCourseId]);

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        courseId: selectedCourseId || undefined,
        timeWindow: timeWindow !== 'custom' ? timeWindow : undefined,
        startDate: timeWindow === 'custom' && startDate ? startDate : undefined,
        endDate: timeWindow === 'custom' && endDate ? endDate : undefined
      };
      const res = await lmsApi.getInstructorAnalyticsOverview(params);
      setOverviewData(res);
    } catch (err) {
      setError(err.message || 'Failed to load analytics overview');
    } finally {
      setLoading(false);
    }
  };

  // Load Funnel Data
  const loadFunnel = async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await lmsApi.getCourseFunnelAnalytics(selectedCourseId, { timeWindow });
      setFunnelData(res);
    } catch (err) {
      setError(err.message || 'Failed to load progression funnel');
    } finally {
      setLoading(false);
    }
  };

  // Load Assessment Data
  const loadAssessments = async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await lmsApi.getCourseAssessmentAnalytics(selectedCourseId, { timeWindow });
      setAssessmentData(res);
    } catch (err) {
      setError(err.message || 'Failed to load assessment analytics');
    } finally {
      setLoading(false);
    }
  };

  // Load Students Data
  const loadStudents = async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      setError(null);
      let minProg = '';
      let maxProg = '';
      if (studentProgressFilter === '<25') { maxProg = '25'; }
      else if (studentProgressFilter === '25-75') { minProg = '25'; maxProg = '75'; }
      else if (studentProgressFilter === '>75') { minProg = '75'; }

      const res = await lmsApi.getCourseStudentsAnalytics(selectedCourseId, {
        search: studentSearch,
        status: studentStatus,
        minProgress: minProg,
        maxProgress: maxProg,
        page: studentPage,
        limit: 12
      });
      setStudentsData(res);
    } catch (err) {
      setError(err.message || 'Failed to load student roster');
    } finally {
      setLoading(false);
    }
  };

  // Trigger loads based on active subTab
  useEffect(() => {
    if (subTab === 'overview') {
      loadOverview();
    } else if (subTab === 'funnel') {
      loadFunnel();
    } else if (subTab === 'assessments') {
      loadAssessments();
    } else if (subTab === 'students') {
      loadStudents();
    }
  }, [subTab, selectedCourseId, timeWindow, startDate, endDate, studentPage, studentStatus, studentProgressFilter]);

  // Debounced search for student roster
  useEffect(() => {
    if (subTab === 'students') {
      const timer = setTimeout(() => {
        setStudentPage(1);
        loadStudents();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [studentSearch]);

  // Handle CSV Export
  const handleExportCsv = async (reportType) => {
    if (!selectedCourseId) {
      showToast('Please select a course to export', 'error');
      return;
    }
    try {
      showToast(`Generating ${reportType} CSV export...`, 'info');
      await lmsApi.downloadAnalyticsCsv(selectedCourseId, reportType, { timeWindow });
      showToast('CSV export downloaded securely! (Formula-injection protected)', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export CSV', 'error');
    }
  };

  // Inspect individual student
  const handleInspectStudent = async (studentUserId) => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      const detail = await lmsApi.getStudentCourseDetail(selectedCourseId, studentUserId);
      setInspectStudent(detail);
    } catch (err) {
      showToast(err.message || 'Failed to fetch student details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'error' ? 'var(--brand-red)' : toast.type === 'info' ? 'var(--brand-blue, #2563eb)' : 'var(--brand-green)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontWeight: 700,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {toast.msg}
        </div>
      )}

      {/* TOP FILTER & TOOLBAR CARD */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '18px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left: Course Selection & Sub-tab Pill Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Target Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                if (onSelectCourse) onSelectCourse(e.target.value);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '13.5px',
                minWidth: '240px',
                cursor: 'pointer'
              }}
            >
              <option value="">All Managed Courses (Aggregated)</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.status === 'DRAFT' ? '(Draft)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Time Window
            </label>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-color)' }}>
              {[
                { id: 'all', label: 'All Time' },
                { id: '90d', label: '90D' },
                { id: '30d', label: '30D' },
                { id: '7d', label: '7D' },
                { id: 'custom', label: 'Custom' }
              ].map(tw => (
                <button
                  key={tw.id}
                  onClick={() => setTimeWindow(tw.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: timeWindow === tw.id ? 'var(--brand-green)' : 'transparent',
                    color: timeWindow === tw.id ? 'white' : 'var(--text-secondary)',
                    fontWeight: timeWindow === tw.id ? 800 : 600,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tw.label}
                </button>
              ))}
            </div>
          </div>

          {timeWindow === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px' }}
              />
            </div>
          )}
        </div>

        {/* Right: Actions & CSV Exports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              if (subTab === 'overview') loadOverview();
              else if (subTab === 'funnel') loadFunnel();
              else if (subTab === 'assessments') loadAssessments();
              else if (subTab === 'students') loadStudents();
            }}
            title="Refresh analytics data"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} /> Refresh
          </button>

          {/* Export CSV Dropdown */}
          {selectedCourseId && (
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleExportCsv('students')}
                  title="Export student progression roster to CSV"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--brand-green-bg)',
                    color: 'var(--brand-green)',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} /> Export Students
                </button>
                <button
                  onClick={() => handleExportCsv('curriculum-funnel')}
                  title="Export module and lesson drop-off funnel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} /> Funnel
                </button>
                <button
                  onClick={() => handleExportCsv('assessments')}
                  title="Export assessment performance and question correctness"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} /> Assessments
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '2px solid var(--border-color)',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'overview', label: 'KPIs & Comparisons', icon: BarChart3 },
          { id: 'funnel', label: 'Progression & Drop-off Funnel', icon: TrendingDown },
          { id: 'assessments', label: 'Assessment Outcomes & Item Analysis', icon: Award },
          { id: 'students', label: 'Student-Level Progress Roster', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: isActive ? 'var(--brand-green)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div style={{
          background: 'var(--brand-red-bg)',
          color: 'var(--brand-red)',
          padding: '14px 20px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* LOADING SPINNER */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>Calculating authoritative learning analytics...</div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. OVERVIEW & COMPARISONS TAB */}
      {/* ========================================================================= */}
      {subTab === 'overview' && overviewData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* TOP KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Total Enrollments */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Total Enrollments
                </span>
                <Users size={18} color="var(--brand-green)" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {overviewData.metrics.totalEnrollments}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {overviewData.metrics.newEnrollments} registered in {overviewData.timeFilter.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                Denominator: All registered students
              </div>
            </div>

            {/* Active Students */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Active Learners
                </span>
                <Activity size={18} color="#0ea5e9" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {overviewData.metrics.activeStudents}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Distinct active users in window
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                Source: Lesson progress & quiz attempts
              </div>
            </div>

            {/* Course Completion Rate */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Completion Rate
                </span>
                <CheckCircle2 size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {overviewData.metrics.courseCompletionRate}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {overviewData.metrics.completedEnrollments} completed out of {overviewData.metrics.totalEnrollments}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                Formula: (Completions / Total Enrollments) × 100
              </div>
            </div>

            {/* Average Assessment Score */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Assessment Score
                </span>
                <Award size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {overviewData.metrics.avgQuizScore}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Median score: <strong>{overviewData.metrics.medianQuizScore}%</strong> ({overviewData.metrics.totalQuizAttempts} attempts)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                Mean and median across quiz submissions
              </div>
            </div>

            {/* Pending Reviews */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Pending Reviews
                </span>
                <FileText size={18} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {overviewData.metrics.pendingReviews}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Assignments awaiting evaluation
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                Certificates Issued: <strong>{overviewData.metrics.totalCertificatesIssued}</strong>
              </div>
            </div>
          </div>

          {/* PROGRESS DISTRIBUTION BUCKETS */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={18} color="var(--brand-green)" /> Student Progress Distribution (Enrollments per Tier)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {Object.entries(overviewData.progressBuckets).map(([bucket, count]) => {
                const total = overviewData.metrics.totalEnrollments;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={bucket} style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      <span>Tier {bucket}</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>{count} students</div>
                    <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand-green)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COURSE COMPARISON TABLE */}
          {overviewData.courseComparisons.length > 0 && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                  Course Performance Comparisons ({overviewData.courseComparisons.length} Managed Courses)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                  Click a course to inspect its deep progression funnel
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '10px 14px' }}>Course Title</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Enrollments</th>
                      <th style={{ padding: '10px 14px' }}>Active (Window)</th>
                      <th style={{ padding: '10px 14px' }}>Completion Rate</th>
                      <th style={{ padding: '10px 14px' }}>Avg Quiz</th>
                      <th style={{ padding: '10px 14px' }}>Pending Reviews</th>
                      <th style={{ padding: '10px 14px' }}>Greatest Drop-off Point</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.courseComparisons.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                          <div>{c.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{c.category} • {c.level}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: c.status === 'PUBLISHED' ? 'var(--brand-green-bg)' : c.status === 'ARCHIVED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.15)',
                            color: c.status === 'PUBLISHED' ? 'var(--brand-green)' : c.status === 'ARCHIVED' ? '#ef4444' : '#d97706'
                          }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{c.enrolledCount}</td>
                        <td style={{ padding: '12px 14px' }}>{c.activeCount}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '50px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${c.completionRate}%`, height: '100%', background: '#10b981' }} />
                            </div>
                            <span style={{ fontWeight: 800 }}>{c.completionRate}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                          {c.avgQuizScore > 0 ? `${c.avgQuizScore}%` : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {c.pendingReviews > 0 ? (
                            <span style={{ color: 'var(--brand-red)', fontWeight: 800 }}>{c.pendingReviews} pending</span>
                          ) : (
                            <span style={{ color: 'var(--text-light)' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {c.highestDropoffModule ? (
                            <span style={{ fontSize: '11.5px', color: '#d97706', fontWeight: 700 }}>
                              {c.highestDropoffModule.title} (-{c.highestDropoffModule.dropCount})
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>None recorded</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setSelectedCourseId(c.id);
                              setSubTab('funnel');
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--brand-green)',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            View Funnel <ChevronRight size={12} style={{ display: 'inline' }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PROGRESSION & DROP-OFF FUNNEL TAB */}
      {/* ========================================================================= */}
      {subTab === 'funnel' && funnelData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* COURSE PROGRESSION FUNNEL STAGES */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Course Progression Funnel: {funnelData.course.title}
                </h3>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Track student retention across checkpoints from registration to verified completion
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Overall Conversion
                </span>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>
                  {funnelData.funnel.completionRate}%
                </div>
              </div>
            </div>

            {/* STAGES BAR CHART */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Stage 1: Enrolled */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  <span>1. Enrolled Students</span>
                  <span>{funnelData.funnel.enrolled} (100%)</span>
                </div>
                <div style={{ height: '14px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'var(--brand-green)' }} />
                </div>
              </div>

              {/* Stage 2: Course Started */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  <span>2. Started Learning (Opened Lesson 1+)</span>
                  <span>{funnelData.funnel.startedCourse} ({funnelData.funnel.startedPercent}%)</span>
                </div>
                <div style={{ height: '14px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${funnelData.funnel.startedPercent}%`, height: '100%', background: '#0ea5e9' }} />
                </div>
              </div>

              {/* Module Progression Stages */}
              {funnelData.funnel.modules.map((m, idx) => (
                <div key={m.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                    <span>
                      {idx + 3}. Completed {m.title}
                      {m.dropoffFromPrev > 0 && (
                        <span style={{ color: '#d97706', fontSize: '11px', marginLeft: '8px' }}>
                          (-{m.dropoffFromPrev} students / {m.dropoffRatePercent}% drop-off)
                        </span>
                      )}
                    </span>
                    <span>{m.studentsCompleted} ({m.completionRate}%)</span>
                  </div>
                  <div style={{ height: '14px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${m.completionRate}%`, height: '100%', background: '#8b5cf6' }} />
                  </div>
                </div>
              ))}

              {/* Stage: Course Completed */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  <span>Final. Course Completed & Certified</span>
                  <span>{funnelData.funnel.completedCourse} ({funnelData.funnel.completionRate}%)</span>
                </div>
                <div style={{ height: '14px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${funnelData.funnel.completionRate}%`, height: '100%', background: '#10b981' }} />
                </div>
              </div>
            </div>

            {/* HIGHEST DROP-OFF CALLOUT BANNER */}
            {funnelData.highestDropoffLesson && (
              <div style={{
                marginTop: '20px',
                padding: '14px 18px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <TrendingDown size={22} color="#d97706" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#d97706' }}>
                    Highest Student Abandonment Point Detected
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>{funnelData.highestDropoffLesson.title}</strong> in module <em>"{funnelData.highestDropoffLesson.moduleTitle}"</em> experienced a drop-off of <strong>{funnelData.highestDropoffLesson.dropoffCount} students ({funnelData.highestDropoffLesson.dropoffPercent}%)</strong> between starting and completing. Consider revising content or adding clarifying code examples.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GRANULAR LESSON-BY-LESSON PROGRESSION TABLE */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px' }}>
              Granular Lesson Progression & Drop-off Analysis
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '8px 12px' }}>#</th>
                    <th style={{ padding: '8px 12px' }}>Module</th>
                    <th style={{ padding: '8px 12px' }}>Lesson Title</th>
                    <th style={{ padding: '8px 12px' }}>Type</th>
                    <th style={{ padding: '8px 12px' }}>Started</th>
                    <th style={{ padding: '8px 12px' }}>Completed</th>
                    <th style={{ padding: '8px 12px' }}>Completion %</th>
                    <th style={{ padding: '8px 12px' }}>Retention %</th>
                    <th style={{ padding: '8px 12px' }}>Drop-off Count</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {funnelData.lessonProgression.map(lp => (
                    <tr key={lp.lessonId} style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: lp.isHighestDropoff ? 'rgba(245, 158, 11, 0.05)' : 'transparent'
                    }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{lp.sequence}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{lp.moduleTitle}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                        {lp.title}
                        {lp.isHighestDropoff && (
                          <span style={{
                            marginLeft: '8px',
                            background: '#d97706',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            MAX DROP
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-secondary)' }}>
                          {lp.lessonType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{lp.startedCount}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{lp.completedCount}</td>
                      <td style={{ padding: '10px 12px' }}>{lp.completionRate}%</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: lp.retentionRate > 75 ? 'var(--brand-green)' : '#d97706' }}>
                        {lp.retentionRate}%
                      </td>
                      <td style={{ padding: '10px 12px', color: lp.dropoffCount > 0 ? '#ef4444' : 'var(--text-light)', fontWeight: 700 }}>
                        {lp.dropoffCount} ({lp.dropoffPercent}%)
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {lp.dropoffPercent > 30 ? (
                          <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '11px' }}>High Friction</span>
                        ) : lp.dropoffPercent > 15 ? (
                          <span style={{ color: '#d97706', fontWeight: 700, fontSize: '11px' }}>Moderate</span>
                        ) : (
                          <span style={{ color: 'var(--brand-green)', fontWeight: 700, fontSize: '11px' }}>Healthy</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MEASURABLE ASSESSMENT ABANDONMENT */}
          {funnelData.assessmentAbandonment.length > 0 && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px' }}>
                Measurable Assessment Abandonment
              </h3>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Students who completed all prerequisite lessons in a module but abandoned the track before attempting the required checkpoint quiz.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '8px 12px' }}>Module</th>
                      <th style={{ padding: '8px 12px' }}>Checkpoint Quiz</th>
                      <th style={{ padding: '8px 12px' }}>Finished All Lessons</th>
                      <th style={{ padding: '8px 12px' }}>Attempted Quiz</th>
                      <th style={{ padding: '8px 12px' }}>Passed Quiz</th>
                      <th style={{ padding: '8px 12px' }}>Abandoned Before Attempt</th>
                      <th style={{ padding: '8px 12px' }}>Abandonment Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnelData.assessmentAbandonment.map(aa => (
                      <tr key={aa.quizId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{aa.moduleTitle}</td>
                        <td style={{ padding: '10px 12px' }}>{aa.quizTitle}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{aa.moduleLessonsCompletedCount}</td>
                        <td style={{ padding: '10px 12px' }}>{aa.quizAttemptedCount}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--brand-green)', fontWeight: 700 }}>{aa.quizPassedCount}</td>
                        <td style={{ padding: '10px 12px', color: aa.abandonedBeforeAttempt > 0 ? '#ef4444' : 'var(--text-light)', fontWeight: 800 }}>
                          {aa.abandonedBeforeAttempt}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 800,
                            fontSize: '11px',
                            background: aa.abandonmentRate > 25 ? 'rgba(239, 68, 68, 0.1)' : 'var(--brand-green-bg)',
                            color: aa.abandonmentRate > 25 ? '#ef4444' : 'var(--brand-green)'
                          }}>
                            {aa.abandonmentRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ASSESSMENT OUTCOMES & ITEM ANALYSIS TAB */}
      {/* ========================================================================= */}
      {subTab === 'assessments' && assessmentData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* FREQUENTLY MISSED QUESTIONS CALLOUT */}
          {assessmentData.frequentlyMissedQuestions.length > 0 && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> Frequently Missed Assessment Items (Lowest Correctness Rate)
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Questions answered incorrectly most frequently across all student attempts. Review these topics in future syllabus revisions.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {assessmentData.frequentlyMissedQuestions.map((q, idx) => (
                  <div key={q.id} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                          {q.quizTitle}
                        </span>
                        <span style={{
                          background: q.correctnessRate < 50 ? '#ef4444' : '#d97706',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {q.correctnessRate}% Correct
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {q.prompt}
                      </div>
                    </div>
                    {q.conceptToReview && (
                      <div style={{ marginTop: '10px', fontSize: '11.5px', color: 'var(--brand-green)', fontWeight: 700 }}>
                        Recommended Topic to Review: {q.conceptToReview}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUIZZES DETAILED OUTCOMES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '4px 0 0 0' }}>
              Quiz Performance & Score Distributions
            </h3>
            {assessmentData.quizzes.map(quiz => (
              <div key={quiz.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>{quiz.title}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Module: {quiz.moduleTitle} • Passing threshold: {quiz.passingPercentage}% • Max attempts: {quiz.maxAttempts}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 800 }}>ATTEMPTS</div>
                      <div style={{ fontSize: '16px', fontWeight: 900 }}>{quiz.totalAttempts}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 800 }}>PASS RATE</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--brand-green)' }}>{quiz.passRatePercent}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 800 }}>MEAN SCORE</div>
                      <div style={{ fontSize: '16px', fontWeight: 900 }}>{quiz.avgScore}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 800 }}>MEDIAN</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#8b5cf6' }}>{quiz.medianScore}%</div>
                    </div>
                  </div>
                </div>

                {/* Score Distribution Histogram */}
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Score Distribution
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {Object.entries(quiz.scoreDistribution).map(([bracket, count]) => (
                      <div key={bracket} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>{count}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{bracket}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question Item Analysis Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '6px 8px' }}>#</th>
                        <th style={{ padding: '6px 8px' }}>Question Prompt</th>
                        <th style={{ padding: '6px 8px' }}>Type</th>
                        <th style={{ padding: '6px 8px' }}>Total Answers</th>
                        <th style={{ padding: '6px 8px' }}>Correct</th>
                        <th style={{ padding: '6px 8px' }}>Correctness %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quiz.questions.map((quest, qIdx) => (
                        <tr key={quest.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px' }}>{qIdx + 1}</td>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{quest.prompt}</td>
                          <td style={{ padding: '8px', color: 'var(--text-light)' }}>{quest.questionType}</td>
                          <td style={{ padding: '8px' }}>{quest.totalAnswers}</td>
                          <td style={{ padding: '8px' }}>{quest.correctAnswers}</td>
                          <td style={{ padding: '8px', fontWeight: 800, color: quest.correctnessRate >= 70 ? 'var(--brand-green)' : '#d97706' }}>
                            {quest.correctnessRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* CODING EXERCISES ANALYTICS */}
          {assessmentData.codingExercises.length > 0 && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px' }}>
                Coding Practice Challenges & Automated Evaluation Metrics
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '8px 12px' }}>Challenge Title</th>
                      <th style={{ padding: '8px 12px' }}>Language</th>
                      <th style={{ padding: '8px 12px' }}>Difficulty</th>
                      <th style={{ padding: '8px 12px' }}>Total Submissions</th>
                      <th style={{ padding: '8px 12px' }}>Accepted</th>
                      <th style={{ padding: '8px 12px' }}>Acceptance Rate</th>
                      <th style={{ padding: '8px 12px' }}>Avg Runtime</th>
                      <th style={{ padding: '8px 12px' }}>Verdict Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentData.codingExercises.map(ce => (
                      <tr key={ce.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{ce.title}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-secondary)' }}>
                            {ce.language}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{ce.difficulty}</td>
                        <td style={{ padding: '10px 12px' }}>{ce.totalSubmissions}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--brand-green)', fontWeight: 700 }}>{ce.acceptedCount}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800 }}>{ce.acceptanceRatePercent}%</td>
                        <td style={{ padding: '10px 12px' }}>{ce.avgRuntimeMs} ms</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--brand-green)' }}>Accepted: {ce.statusBreakdown.ACCEPTED}</span>
                          <span style={{ fontSize: '11px', color: '#ef4444', marginLeft: '6px' }}>Wrong: {ce.statusBreakdown.WRONG_ANSWER}</span>
                          <span style={{ fontSize: '11px', color: '#f59e0b', marginLeft: '6px' }}>Error: {ce.statusBreakdown.RUNTIME_ERROR}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. STUDENT-LEVEL PROGRESS ROSTER TAB */}
      {/* ========================================================================= */}
      {subTab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SEARCH & FILTER CONTROLS */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="var(--text-light)" />
              <input
                type="text"
                placeholder="Search by student name or email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={studentStatus}
                onChange={(e) => {
                  setStudentStatus(e.target.value);
                  setStudentPage(1);
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', background: 'var(--bg-secondary)' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="DROPPED">Dropped</option>
              </select>

              <select
                value={studentProgressFilter}
                onChange={(e) => {
                  setStudentProgressFilter(e.target.value);
                  setStudentPage(1);
                }}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', background: 'var(--bg-secondary)' }}
              >
                <option value="">All Progress Tiers</option>
                <option value="<25">&lt; 25% Progress</option>
                <option value="25-75">25% - 75% Progress</option>
                <option value=">75">&gt; 75% Progress</option>
              </select>
            </div>
          </div>

          {/* STUDENT ROSTER TABLE */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
                Enrolled Students Progression Roster ({studentsData.pagination.total} Total)
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                Page {studentsData.pagination.page} of {studentsData.pagination.totalPages || 1}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '10px 12px' }}>Student</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Course Progress</th>
                    <th style={{ padding: '10px 12px' }}>Lessons</th>
                    <th style={{ padding: '10px 12px' }}>Quiz Score</th>
                    <th style={{ padding: '10px 12px' }}>Assignments</th>
                    <th style={{ padding: '10px 12px' }}>Last Activity</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsData.students.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
                        No enrolled students match the specified filters.
                      </td>
                    </tr>
                  ) : (
                    studentsData.students.map(s => (
                      <tr key={s.enrollmentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700 }}>{s.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{s.email}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: s.status === 'COMPLETED' ? 'var(--brand-green-bg)' : 'var(--bg-secondary)',
                            color: s.status === 'COMPLETED' ? 'var(--brand-green)' : 'var(--text-secondary)'
                          }}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '70px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${s.progressPercent}%`, height: '100%', background: s.progressPercent === 100 ? '#10b981' : 'var(--brand-green)' }} />
                            </div>
                            <span style={{ fontWeight: 800 }}>{s.progressPercent}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {s.completedLessons} / {s.totalLessons}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                          {s.avgQuizScore !== null ? `${s.avgQuizScore}%` : <span style={{ color: 'var(--text-light)' }}>None</span>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {s.assignmentSubmissionsCount} submitted
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11.5px', color: s.isInactive ? '#d97706' : 'var(--text-primary)' }}>
                            {new Date(s.lastActivity).toLocaleDateString()}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleInspectStudent(s.userId)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              fontWeight: 700,
                              fontSize: '11.5px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {studentsData.pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
                <button
                  disabled={studentPage <= 1}
                  onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: studentPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: studentPage <= 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={14} style={{ display: 'inline' }} /> Prev
                </button>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>
                  Page {studentPage} of {studentsData.pagination.totalPages}
                </span>
                <button
                  disabled={studentPage >= studentsData.pagination.totalPages}
                  onClick={() => setStudentPage(p => p + 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    cursor: studentPage >= studentsData.pagination.totalPages ? 'not-allowed' : 'pointer',
                    opacity: studentPage >= studentsData.pagination.totalPages ? 0.5 : 1
                  }}
                >
                  Next <ChevronRight size={14} style={{ display: 'inline' }} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PRIVACY-PRESERVING STUDENT DRILL-DOWN MODAL */}
      {/* ========================================================================= */}
      {inspectStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>
                  Student Progress Audit: {inspectStudent.student.name}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                  {inspectStudent.student.email} • Enrolled {new Date(inspectStudent.enrollment.enrolledAt).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => setInspectStudent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Summary Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 800 }}>STATUS</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--brand-green)' }}>{inspectStudent.enrollment.status}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 800 }}>PROGRESS</div>
                  <div style={{ fontSize: '15px', fontWeight: 900 }}>{inspectStudent.enrollment.progressPercent}%</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 800 }}>QUIZ ATTEMPTS</div>
                  <div style={{ fontSize: '15px', fontWeight: 900 }}>{inspectStudent.quizAttempts.length}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 800 }}>SUBMISSIONS</div>
                  <div style={{ fontSize: '15px', fontWeight: 900 }}>{inspectStudent.assignmentSubmissions.length}</div>
                </div>
              </div>

              {/* Completed Lessons Breakdown */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>
                  Curriculum Lessons Progression
                </h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      {inspectStudent.lessons.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{l.title}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-light)' }}>{l.moduleTitle}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: l.status === 'COMPLETED' ? 'var(--brand-green-bg)' : 'var(--bg-secondary)',
                              color: l.status === 'COMPLETED' ? 'var(--brand-green)' : 'var(--text-light)'
                            }}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quiz History */}
              {inspectStudent.quizAttempts.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>
                    Quiz Attempt History
                  </h4>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '6px 12px' }}>Quiz Title</th>
                          <th style={{ padding: '6px 12px' }}>Score</th>
                          <th style={{ padding: '6px 12px' }}>Percentage</th>
                          <th style={{ padding: '6px 12px' }}>Outcome</th>
                          <th style={{ padding: '6px 12px' }}>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectStudent.quizAttempts.map(a => (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{a.quizTitle}</td>
                            <td style={{ padding: '8px 12px' }}>{a.score} / {a.maxScore}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 800 }}>{a.percentage}%</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                color: a.isPassed ? 'var(--brand-green)' : '#ef4444',
                                fontWeight: 800
                              }}>
                                {a.isPassed ? 'PASSED' : 'FAILED'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-light)' }}>
                              {new Date(a.submittedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-secondary)' }}>
              <button
                onClick={() => setInspectStudent(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
