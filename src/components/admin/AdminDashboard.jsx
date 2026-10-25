import React, { useState, useEffect } from 'react';
import { 
  Users, Tag, BookOpen, CreditCard, Shield, Activity, Plus, Search, 
  Check, X, Trash2, Edit, RefreshCw, AlertCircle, CheckCircle2, ChevronRight,
  UserCheck, UserX, Lock, ArrowUpRight, BarChart3, Filter, CheckSquare
} from 'lucide-react';
import { lmsApi } from '../../api/lmsApi';

export default function AdminDashboard({ currentUser, onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'courses' | 'coupons' | 'orders'
  const [stats, setStats] = useState({
    usersCount: 0,
    coursesCount: 0,
    activeCouponsCount: 0,
    ordersCount: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 1. Users state
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // 2. Courses state
  const [coursesList, setCoursesList] = useState([]);

  // 3. Coupons state
  const [couponsList, setCouponsList] = useState([]);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [selectedCouponRedemptions, setSelectedCouponRedemptions] = useState(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: 20,
    max_discount: '',
    min_purchase_amount: '',
    eligible_course_id: '',
    eligible_email: '',
    eligible_phone: '',
    expiry_date: '',
    max_redemptions: 100,
    max_redemptions_per_user: 1,
    is_active: true,
    is_single_use: false
  });

  // 4. Orders state
  const [ordersList, setOrdersList] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [isGrantingEntitlement, setIsGrantingEntitlement] = useState(false);
  const [grantForm, setGrantForm] = useState({ userId: '', courseId: '', reason: '' });

  // 5. Multi-selection state
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectedCouponIds, setSelectedCouponIds] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    loadAllAdminData();
  }, [activeTab, orderStatusFilter]);

  // Clear selections on tab switch
  useEffect(() => {
    setSelectedUserIds([]);
    setSelectedCourseIds([]);
    setSelectedCouponIds([]);
  }, [activeTab]);

  // Bulk & Single User Operations
  const handleToggleSelectUser = (id) => {
    if (id === currentUser?.id) return;
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllUsers = () => {
    const selectable = usersList.filter(u => u.id !== currentUser?.id);
    if (selectedUserIds.length === selectable.length && selectable.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectable.map(u => u.id));
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === currentUser?.id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"? This will delete all their enrollments, progress, and submissions.`)) return;
    try {
      await lmsApi.deleteAdminUser(userId);
      setMessage(`User "${userName}" deleted successfully.`);
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedUserIds.length} selected user account(s)? This will cascade delete their enrollments, progress, and submissions.`)) return;
    try {
      setIsBulkProcessing(true);
      const res = await lmsApi.bulkDeleteAdminUsers(selectedUserIds);
      setMessage(res.message || `Successfully deleted ${selectedUserIds.length} user(s).`);
      setSelectedUserIds([]);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Failed to bulk delete users');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkUserStatus = async (activate) => {
    if (selectedUserIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      await Promise.all(selectedUserIds.map(id => lmsApi.toggleUserStatus(id, activate)));
      setMessage(`Updated status to ${activate ? 'ACTIVE' : 'DEACTIVATED'} for ${selectedUserIds.length} user(s).`);
      setSelectedUserIds([]);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Failed to update user statuses');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk & Single Course Operations
  const handleToggleSelectCourse = (id) => {
    setSelectedCourseIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllCourses = () => {
    if (selectedCourseIds.length === coursesList.length && coursesList.length > 0) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(coursesList.map(c => c.id));
    }
  };

  const handleDeleteCourse = async (courseId, title) => {
    if (!confirm(`Are you sure you want to permanently delete course "${title}"? This will cascade delete its modules, lessons, exercises, quizzes, and certificates.`)) return;
    try {
      await lmsApi.deleteCourse(courseId, true);
      setMessage(`Course "${title}" permanently deleted.`);
      setSelectedCourseIds(prev => prev.filter(id => id !== courseId));
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Failed to delete course');
    }
  };

  const handleBulkDeleteCourses = async () => {
    if (selectedCourseIds.length === 0) return;
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedCourseIds.length} selected course(s) and all their associated curriculum and student records?`)) return;
    try {
      setIsBulkProcessing(true);
      const res = await lmsApi.bulkDeleteCourses(selectedCourseIds, true);
      setMessage(res.message || `Successfully deleted ${selectedCourseIds.length} course(s).`);
      setSelectedCourseIds([]);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Failed to bulk delete courses');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkPublishCourses = async (publish) => {
    if (selectedCourseIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      for (const id of selectedCourseIds) {
        const c = coursesList.find(x => x.id === id);
        if (c && Boolean(c.is_published) !== publish) {
          await lmsApi.togglePublishCourse(id);
        }
      }
      setMessage(`Updated publication status for ${selectedCourseIds.length} course(s).`);
      setSelectedCourseIds([]);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Failed to bulk update courses');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk & Single Coupon Operations
  const handleToggleSelectCoupon = (id) => {
    setSelectedCouponIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllCoupons = () => {
    if (selectedCouponIds.length === couponsList.length && couponsList.length > 0) {
      setSelectedCouponIds([]);
    } else {
      setSelectedCouponIds(couponsList.map(c => c.id));
    }
  };

  const handleBulkDeleteCoupons = async () => {
    if (selectedCouponIds.length === 0) return;
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${selectedCouponIds.length} selected coupon(s)?`)) return;
    try {
      setIsBulkProcessing(true);
      const res = await lmsApi.bulkDeleteAdminCoupons(selectedCouponIds);
      setMessage(res.message || `Successfully deleted ${selectedCouponIds.length} coupon(s).`);
      setSelectedCouponIds([]);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Failed to bulk delete coupons');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkToggleCoupons = async (active) => {
    if (selectedCouponIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      await Promise.all(selectedCouponIds.map(id => lmsApi.updateAdminCoupon(id, { is_active: active })));
      setMessage(`Updated status for ${selectedCouponIds.length} coupon(s).`);
      setSelectedCouponIds([]);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Failed to update coupons');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      setError('');

      // High-performance single round-trip parallel fetch
      const [cRes, crRes, uRes, oRes] = await Promise.all([
        lmsApi.getAdminCoupons().catch(() => ({ coupons: [] })),
        lmsApi.getCourses().catch(() => ({ courses: [] })),
        lmsApi.getAdminUsers({ search: userSearch, role: userRoleFilter }).catch(() => ({ users: [] })),
        lmsApi.getAdminOrders({ search: orderSearch, status: orderStatusFilter }).catch(() => ({ orders: [] }))
      ]);

      if (cRes?.coupons) setCouponsList(cRes.coupons);
      if (crRes?.courses) setCoursesList(crRes.courses);
      if (uRes?.users) setUsersList(uRes.users);
      if (oRes?.orders) setOrdersList(oRes.orders);

      setStats({
        usersCount: uRes?.total || uRes?.users?.length || 0,
        coursesCount: crRes?.courses?.length || 0,
        activeCouponsCount: cRes?.coupons?.filter(c => c.is_active)?.length || 0,
        ordersCount: oRes?.orders?.length || 0,
        totalRevenue: oRes?.orders
          ?.filter(o => o.status === 'COMPLETED')
          ?.reduce((acc, o) => acc + (Number(o.amount) || 0), 0) || 0
      });
    } catch (err) {
      setError(err.message || 'Failed to load administration data');
    } finally {
      setLoading(false);
    }
  };

  // User Status Toggle (Activate / Deactivate)
  const handleToggleUser = async (userId, currentStatus) => {
    try {
      await lmsApi.toggleUserStatus(userId, !currentStatus);
      setMessage(`User account ${currentStatus ? 'deactivated' : 'activated'} successfully.`);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Could not update user account');
    }
  };

  // User Role Change
  const handleRoleChange = async (userId, newRole) => {
    try {
      await lmsApi.updateUserRole(userId, newRole);
      setMessage(`User role updated to ${newRole}.`);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Could not update user role');
    }
  };

  // Course Publish Toggle
  const handleToggleCoursePublish = async (courseId) => {
    try {
      await lmsApi.togglePublishCourse(courseId);
      setMessage('Course publication status toggled.');
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Could not update course publication');
    }
  };

  // Create Coupon
  const handleCreateCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await lmsApi.createAdminCoupon(couponForm);
      setMessage(`Coupon "${couponForm.code.toUpperCase()}" created successfully!`);
      setIsCreatingCoupon(false);
      setCouponForm({
        code: '',
        description: '',
        discount_type: 'PERCENTAGE',
        discount_value: 20,
        max_discount: '',
        min_purchase_amount: '',
        eligible_course_id: '',
        eligible_email: '',
        eligible_phone: '',
        expiry_date: '',
        max_redemptions: 100,
        max_redemptions_per_user: 1,
        is_active: true,
        is_single_use: false
      });
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Coupon Active Status
  const handleToggleCoupon = async (couponId, currentStatus) => {
    try {
      await lmsApi.updateAdminCoupon(couponId, { is_active: !currentStatus });
      setMessage(`Coupon ${currentStatus ? 'deactivated' : 'activated'}.`);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Could not update coupon');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (couponId, code) => {
    if (!confirm(`Are you sure you want to permanently delete coupon "${code}"?`)) return;
    try {
      await lmsApi.deleteAdminCoupon(couponId);
      setMessage(`Coupon "${code}" deleted.`);
      loadAllAdminData();
    } catch (err) {
      setError(err.message || 'Could not delete coupon');
    }
  };

  // View Redemptions
  const handleViewRedemptions = async (couponId) => {
    try {
      const res = await lmsApi.getCouponRedemptions(couponId);
      setSelectedCouponRedemptions(res?.redemptions || []);
    } catch (err) {
      setError(err.message || 'Could not load redemptions');
    }
  };

  return (
    <div className="admin-container animate-fade-in" style={{ padding: '32px 0 80px 0' }}>
      <div className="max-width-wrapper">
        {/* Top Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#dc2626',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '6px'
            }}>
              <Shield size={13} /> Administrative Governance
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)' }}>
              Platform Administrator Panel
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              Manage users, audit course availability, orchestrate coupons, and review financial orders.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate && onNavigate({ view: 'operator_here' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--brand-green)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
              title="Open Operator Dashboard (Curriculums, Modules & Lessons)"
            >
              <BookOpen size={14} /> Open Operator Console
            </button>
            <button
              onClick={loadAllAdminData}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <RefreshCw size={14} /> Refresh Data
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {message && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--brand-green-light)',
            color: 'var(--brand-green)',
            fontSize: '13.5px',
            fontWeight: '600',
            marginBottom: '20px'
          }}>
            <CheckCircle2 size={16} /> {message}
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: '13.5px',
            fontWeight: '600',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '8px',
          marginBottom: '28px'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users & Roles', icon: Users },
            { id: 'courses', label: 'Course Catalog', icon: BookOpen },
            { id: 'coupons', label: 'Coupons & Discounts', icon: Tag },
            { id: 'orders', label: 'Orders & Payments', icon: CreditCard }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMessage(''); setError(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13.5px',
                  fontWeight: isActive ? '800' : '600',
                  background: isActive ? 'var(--brand-green-light)' : 'transparent',
                  color: isActive ? 'var(--brand-green)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}

          <button
            onClick={() => onNavigate && onNavigate({ view: 'operator_here' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13.5px',
              fontWeight: '700',
              background: 'rgba(5, 150, 105, 0.08)',
              color: '#059669',
              border: '1px dashed #10b981',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginLeft: 'auto'
            }}
            title="Open Course Operator Console"
          >
            <BookOpen size={16} /> Operator Console ↗
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW METRICS                                   */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Users</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', marginTop: '6px' }}>{stats.usersCount}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Courses Catalog</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--brand-green)', marginTop: '6px' }}>{stats.coursesCount}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Coupons</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#4f46e5', marginTop: '6px' }}>{stats.activeCouponsCount}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Processed Orders</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#f59e0b', marginTop: '6px' }}>{stats.ordersCount}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '24px',
              borderRadius: 'var(--radius-md)'
            }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '14px' }}>Administrative Fast Actions</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setActiveTab('coupons'); setIsCreatingCoupon(true); }}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Plus size={15} /> Create New Coupon
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className="btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Users size={15} /> Manage User Accounts
                </button>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <BookOpen size={15} /> Audit Courses
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: USERS & ROLES                                      */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'var(--bg-card)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px' }}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadAllAdminData()}
                  placeholder="Search by name, email, or phone..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={userRoleFilter}
                  onChange={(e) => { setUserRoleFilter(e.target.value); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Students</option>
                  <option value="INSTRUCTOR">Instructors</option>
                  <option value="OPERATOR">Operators</option>
                  <option value="ADMIN">Admins</option>
                </select>
                <button onClick={loadAllAdminData} className="btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                  Filter
                </button>
              </div>
            </div>

            {/* Users Bulk Actions Bar */}
            {selectedUserIds.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 18px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1.5px solid #3b82f6',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 800, color: '#1d4ed8' }}>
                  <CheckSquare size={16} />
                  <span>{selectedUserIds.length} user account(s) selected</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleBulkUserStatus(true)}
                    disabled={isBulkProcessing}
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
                    Activate Selected
                  </button>

                  <button
                    onClick={() => handleBulkUserStatus(false)}
                    disabled={isBulkProcessing}
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
                    Deactivate Selected
                  </button>

                  <button
                    onClick={handleBulkDeleteUsers}
                    disabled={isBulkProcessing}
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
                    {isBulkProcessing ? 'Deleting...' : `Delete Selected (${selectedUserIds.length})`}
                  </button>

                  <button
                    onClick={() => setSelectedUserIds([])}
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

            {/* Users Table */}
            <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={usersList.filter(u => u.id !== currentUser?.id).length > 0 && selectedUserIds.length === usersList.filter(u => u.id !== currentUser?.id).length}
                        onChange={handleSelectAllUsers}
                        title="Select All Users"
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>User</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Email / Phone</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Role</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No users found matching query.
                      </td>
                    </tr>
                  ) : (
                    usersList.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedUserIds.includes(u.id) ? 'rgba(59, 130, 246, 0.04)' : 'transparent' }}>
                        <td style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            disabled={u.id === currentUser?.id}
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => handleToggleSelectUser(u.id)}
                            title={u.id === currentUser?.id ? 'Cannot select current active account' : 'Select user'}
                            style={{ cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={u.avatar_url || '/logo.png'} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</div>
                              {u.college && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{u.college}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ color: 'var(--text-primary)' }}>{u.email}</div>
                          {u.phone && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.phone}</div>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={u.id === currentUser?.id}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: u.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                              color: u.role === 'ADMIN' ? '#dc2626' : 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="INSTRUCTOR">INSTRUCTOR</option>
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: u.is_active ? 'var(--brand-green-light)' : 'rgba(239, 68, 68, 0.1)',
                            color: u.is_active ? 'var(--brand-green)' : '#ef4444'
                          }}>
                            {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleUser(u.id, u.is_active)}
                              disabled={u.id === currentUser?.id}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: u.is_active ? 'rgba(239, 68, 68, 0.1)' : 'var(--brand-green-light)',
                                color: u.is_active ? '#ef4444' : 'var(--brand-green)',
                                border: 'none',
                                cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              disabled={u.id === currentUser?.id}
                              title={u.id === currentUser?.id ? 'Cannot delete your own admin account' : 'Permanently Delete User'}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: '#dc2626',
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer',
                                opacity: u.id === currentUser?.id ? 0.4 : 1
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: COURSE CATALOG GOVERNANCE                          */}
        {/* ========================================================= */}
        {activeTab === 'courses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Courses Bulk Actions Bar */}
            {selectedCourseIds.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 18px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1.5px solid #3b82f6',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 800, color: '#1d4ed8' }}>
                  <CheckSquare size={16} />
                  <span>{selectedCourseIds.length} course(s) selected</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleBulkPublishCourses(true)}
                    disabled={isBulkProcessing}
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
                    disabled={isBulkProcessing}
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
                    disabled={isBulkProcessing}
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
                    {isBulkProcessing ? 'Deleting...' : `Delete Selected (${selectedCourseIds.length})`}
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

            <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={coursesList.length > 0 && selectedCourseIds.length === coursesList.length}
                        onChange={handleSelectAllCourses}
                        title="Select All Courses"
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Course Title</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Category</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Price</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No courses found in catalog.
                      </td>
                    </tr>
                  ) : (
                    coursesList.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedCourseIds.includes(c.id) ? 'rgba(59, 130, 246, 0.04)' : 'transparent' }}>
                        <td style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedCourseIds.includes(c.id)}
                            onChange={() => handleToggleSelectCourse(c.id)}
                            title="Select course"
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.title}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>ID: {c.id}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{c.category}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--brand-green)' }}>
                          {c.price ? `₹${c.price}` : '100% Free'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: c.is_published ? 'var(--brand-green-light)' : 'rgba(245, 158, 11, 0.1)',
                            color: c.is_published ? 'var(--brand-green)' : '#d97706'
                          }}>
                            {c.is_published ? 'PUBLISHED' : 'DRAFT'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => onNavigate && onNavigate({ view: 'operator_here' })}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer'
                            }}
                            title="Open Course Builder in Operator Console"
                          >
                            Curriculum Builder
                          </button>
                          <button
                            onClick={() => handleToggleCoursePublish(c.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: c.is_published ? 'rgba(239, 68, 68, 0.1)' : 'var(--brand-green-light)',
                              color: c.is_published ? '#ef4444' : 'var(--brand-green)',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            {c.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c.id, c.title)}
                            title="Permanently Delete Course"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#dc2626',
                              background: '#fee2e2',
                              border: '1px solid #fecaca',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: COUPONS & DISCOUNTS                                */}
        {/* ========================================================= */}
        {activeTab === 'coupons' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Configured Coupons</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Manage percentage discounts, fixed vouchers, free course entitlements, and user-restricted codes.
                </p>
              </div>
              <button
                onClick={() => setIsCreatingCoupon(!isCreatingCoupon)}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Plus size={15} /> {isCreatingCoupon ? 'Cancel Creation' : 'Create New Coupon'}
              </button>
            </div>

            {/* Coupon Creation Form */}
            {isCreatingCoupon && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1.5px solid var(--brand-green)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                boxShadow: 'var(--shadow-md)'
              }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>
                  Create Admin Coupon
                </h4>
                <form onSubmit={handleCreateCouponSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LEARN25"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                      Discount Type *
                    </label>
                    <select
                      value={couponForm.discount_type}
                      onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    >
                      <option value="PERCENTAGE">Percentage (%) Discount</option>
                      <option value="FIXED">Fixed Amount (₹) Discount</option>
                      <option value="FREE">100% Free Course Access</option>
                    </select>
                  </div>

                  {couponForm.discount_type !== 'FREE' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                        Discount Value * ({couponForm.discount_type === 'PERCENTAGE' ? '%' : '₹'})
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max={couponForm.discount_type === 'PERCENTAGE' ? '100' : '99999'}
                        value={couponForm.discount_value}
                        onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}

                  {couponForm.discount_type === 'PERCENTAGE' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                        Max Discount Cap (₹) (Optional)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={couponForm.max_discount}
                        onChange={(e) => setCouponForm({ ...couponForm, max_discount: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                      Eligible Course (Optional, all if blank)
                    </label>
                    <select
                      value={couponForm.eligible_course_id}
                      onChange={(e) => setCouponForm({ ...couponForm, eligible_course_id: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    >
                      <option value="">All Courses</option>
                      {coursesList.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                      Restricted User Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="student@example.com"
                      value={couponForm.eligible_email}
                      onChange={(e) => setCouponForm({ ...couponForm, eligible_email: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                      Restricted Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+919876543210"
                      value={couponForm.eligible_phone}
                      onChange={(e) => setCouponForm({ ...couponForm, eligible_phone: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                      Expiration Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={couponForm.expiry_date}
                      onChange={(e) => setCouponForm({ ...couponForm, expiry_date: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={couponForm.is_single_use}
                        onChange={(e) => setCouponForm({ ...couponForm, is_single_use: e.target.checked })}
                      />
                      <span>Single-Use Coupon (Deactivates after first redemption)</span>
                    </label>
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '13.5px' }}>
                      Save & Publish Coupon
                    </button>
                    <button type="button" onClick={() => setIsCreatingCoupon(false)} className="btn-outline" style={{ padding: '10px 18px', fontSize: '13.5px' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Coupons Bulk Actions Bar */}
            {selectedCouponIds.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 18px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1.5px solid #3b82f6',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 800, color: '#1d4ed8' }}>
                  <CheckSquare size={16} />
                  <span>{selectedCouponIds.length} coupon(s) selected</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleBulkToggleCoupons(true)}
                    disabled={isBulkProcessing}
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
                    Activate Selected
                  </button>

                  <button
                    onClick={() => handleBulkToggleCoupons(false)}
                    disabled={isBulkProcessing}
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
                    Deactivate Selected
                  </button>

                  <button
                    onClick={handleBulkDeleteCoupons}
                    disabled={isBulkProcessing}
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
                    {isBulkProcessing ? 'Deleting...' : `Delete Selected (${selectedCouponIds.length})`}
                  </button>

                  <button
                    onClick={() => setSelectedCouponIds([])}
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

            {/* Coupons Table */}
            <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={couponsList.length > 0 && selectedCouponIds.length === couponsList.length}
                        onChange={handleSelectAllCoupons}
                        title="Select All Coupons"
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Code</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Discount</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Eligibility</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Redemptions</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {couponsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No coupons created yet. Click "Create New Coupon" to start.
                      </td>
                    </tr>
                  ) : (
                    couponsList.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedCouponIds.includes(c.id) ? 'rgba(59, 130, 246, 0.04)' : 'transparent' }}>
                        <td style={{ width: '40px', padding: '12px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedCouponIds.includes(c.id)}
                            onChange={() => handleToggleSelectCoupon(c.id)}
                            title="Select coupon"
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '14px',
                            background: 'var(--bg-secondary)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)'
                          }}>
                            {c.code}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--brand-green)' }}>
                          {c.discount_type === 'FREE' && '100% FREE'}
                          {c.discount_type === 'PERCENTAGE' && `${c.discount_value}% OFF`}
                          {c.discount_type === 'FIXED' && `₹${c.discount_value} OFF`}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {c.eligible_email && <div>User: {c.eligible_email}</div>}
                          {c.eligible_course_title ? <div>Course: {c.eligible_course_title}</div> : <div>All Courses</div>}
                          {c.is_single_use ? <div>Single Use</div> : null}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => handleViewRedemptions(c.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--brand-green)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            {c.redemption_count || 0} times (View)
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: c.is_active ? 'var(--brand-green-light)' : 'rgba(239, 68, 68, 0.1)',
                            color: c.is_active ? 'var(--brand-green)' : '#ef4444'
                          }}>
                            {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleCoupon(c.id, c.is_active)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                              }}
                            >
                              {c.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(c.id, c.code)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Redemptions Audit Modal */}
            {selectedCouponRedemptions && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '16px'
              }}>
                <div style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  maxWidth: '640px',
                  width: '100%',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  padding: '24px',
                  boxShadow: 'var(--shadow-xl)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Coupon Redemption Audit Log</h3>
                    <button onClick={() => setSelectedCouponRedemptions(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>

                  {selectedCouponRedemptions.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No redemptions recorded for this coupon yet.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>User</th>
                          <th style={{ padding: '8px' }}>Course</th>
                          <th style={{ padding: '8px' }}>Discount</th>
                          <th style={{ padding: '8px' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCouponRedemptions.map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px' }}>{r.user_name || r.user_email}</td>
                            <td style={{ padding: '8px' }}>{r.course_title || r.course_id}</td>
                            <td style={{ padding: '8px', color: 'var(--brand-green)', fontWeight: 700 }}>₹{r.discount_amount}</td>
                            <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{new Date(r.redeemed_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: ORDERS, PAYMENTS & COMPLIMENTARY ENTITLEMENTS      */}
        {/* ========================================================= */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search by order ID, email, ref..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') loadAllAdminData(); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: '1px solid var(--border-color)',
                      background: orderStatusFilter === st ? 'var(--brand-green)' : 'var(--bg-card)',
                      color: orderStatusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setGrantForm({ userId: usersList[0]?.id || '', courseId: coursesList[0]?.id || '', reason: '' });
                  setIsGrantingEntitlement(true);
                }}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} /> Grant Complimentary Access
              </button>
            </div>

            {/* Orders Table */}
            <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Order ID / Ref</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Student</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Course / Plan</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Amount</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No orders recorded matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    ordersList.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 700 }}>{o.id}</div>
                          {o.transaction_ref && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                              Ref: {o.transaction_ref}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{o.user_name || 'Student'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{o.user_email || o.user_id}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{o.course_title || o.course_id || o.plan_id || 'Course Access'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.order_type}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--brand-green)' }}>
                          ₹{Number(o.amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: o.status === 'COMPLETED' ? 'var(--brand-green-light)' : o.status === 'PENDING' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                            color: o.status === 'COMPLETED' ? 'var(--brand-green)' : o.status === 'PENDING' ? '#eab308' : '#ef4444'
                          }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {new Date(o.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Grant Complimentary Entitlement Modal */}
            {isGrantingEntitlement && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '16px'
              }}>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  maxWidth: '520px',
                  width: '100%',
                  padding: '28px',
                  boxShadow: 'var(--shadow-xl)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                      Grant Complimentary Course Access
                    </h3>
                    <button
                      onClick={() => setIsGrantingEntitlement(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    This workflow creates a documented, authorized entitlement grant with a permanent audit record and immediately unlocks the course for the student. It does not fabricate financial transaction records.
                  </p>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!grantForm.userId || !grantForm.courseId || !grantForm.reason.trim()) {
                      setError('Please select a student, course, and provide an authorization reason.');
                      return;
                    }
                    try {
                      setLoading(true);
                      await lmsApi.grantAdminEntitlement(grantForm);
                      setMessage('Complimentary course entitlement successfully granted.');
                      setIsGrantingEntitlement(false);
                      loadAllAdminData();
                    } catch (err) {
                      setError(err.message || 'Failed to grant entitlement');
                    } finally {
                      setLoading(false);
                    }
                  }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Student Recipient</label>
                      <select
                        value={grantForm.userId}
                        onChange={(e) => setGrantForm(prev => ({ ...prev, userId: e.target.value }))}
                        required
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px'
                        }}
                      >
                        <option value="">-- Select Student Account --</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Course</label>
                      <select
                        value={grantForm.courseId}
                        onChange={(e) => setGrantForm(prev => ({ ...prev, courseId: e.target.value }))}
                        required
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px'
                        }}
                      >
                        <option value="">-- Select Course --</option>
                        {coursesList.map(c => (
                          <option key={c.id} value={c.id}>{c.title} (₹{c.price})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                        Documented Authorization Reason (Mandatory Audit Trail)
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="e.g. Merit scholarship recipient, Hackathon 1st prize winner, Institutional partnership grant..."
                        value={grantForm.reason}
                        onChange={(e) => setGrantForm(prev => ({ ...prev, reason: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setIsGrantingEntitlement(false)}
                        className="btn-outline"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '8px 18px', fontSize: '13px' }}
                      >
                        Confirm & Grant Entitlement
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
