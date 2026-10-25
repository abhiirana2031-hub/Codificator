// CODIFICATORS LMS REST CLIENT
const API_BASE = '/api';

// Current active session state stored in localStorage
let activeUserToken = localStorage.getItem('codificator_auth_token') || null;

export function getActiveUserToken() {
  return activeUserToken;
}

export function setActiveUserToken(token) {
  activeUserToken = token;
  if (token) {
    localStorage.setItem('codificator_auth_token', token);
  } else {
    localStorage.removeItem('codificator_auth_token');
  }
}

async function request(endpoint, options = {}, retries = 2) {
  const headers = {
    'Content-Type': 'application/json',
    ...(activeUserToken ? { 'Authorization': `Bearer ${activeUserToken}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    // If transient gateway or proxy error during dev server restart, retry after brief delay
    if ([502, 503, 504].includes(response.status) && retries > 0) {
      await new Promise(res => setTimeout(res, 400));
      return request(endpoint, options, retries - 1);
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.error || `HTTP ${response.status}: Request failed`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (retries > 0 && (err.name === 'TypeError' || err.message?.includes('Failed to fetch'))) {
      await new Promise(res => setTimeout(res, 400));
      return request(endpoint, options, retries - 1);
    }
    throw err;
  }
}

export const lmsApi = {
  // Auth
  async getMe() {
    if (!activeUserToken) return { user: null };
    return request('/auth/me');
  },
  async getUsers() {
    return request('/auth/users');
  },
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) setActiveUserToken(data.token);
    return data;
  },
  async register(email, name, password) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password })
    });
    if (data.token) setActiveUserToken(data.token);
    return data;
  },
  switchUser(user) {
    setActiveUserToken(user.id);
  },
  async syncFirebaseUser(token, userData = null) {
    if (token) setActiveUserToken(token);
    const data = await request('/auth/firebase-sync', {
      method: 'POST',
      body: userData ? JSON.stringify(userData) : undefined
    });
    return data;
  },

  // Courses
  async getCourses(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category) query.set('category', params.category);
    if (params.level) query.set('level', params.level);
    if (params.enrolledOnly) query.set('enrolledOnly', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/courses${qs}`);
  },
  async getAllCourses(params = {}) {
    return this.getCourses(params);
  },
  async getCourse(id) {
    return request(`/courses/${id}`);
  },
  async createCourse(courseData) {
    return request('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  },
  async updateCourse(id, courseData) {
    return request(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData)
    });
  },
  async togglePublishCourse(id) {
    return request(`/courses/${id}/publish`, {
      method: 'PATCH'
    });
  },
  async validateCoursePublish(id) {
    return request(`/courses/${id}/validate-publish`);
  },
  async duplicateCourse(id) {
    return request(`/courses/${id}/duplicate`, {
      method: 'POST'
    });
  },
  async deleteCourse(id, force = false) {
    return request(`/courses/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE'
    });
  },
  async bulkDeleteCourses(courseIds, force = false) {
    return request('/courses/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ courseIds, force })
    });
  },
  async enrollCourse(courseId) {
    return request(`/courses/${courseId}/enroll`, {
      method: 'POST'
    });
  },
  async getSyllabusGuidelines() {
    return request('/courses/syllabus-guidelines');
  },
  async scanCoursePdf(payload) {
    return request('/courses/scan-pdf', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async fetchGoogleDocCourse(docUrl) {
    return request('/courses/fetch-google-doc', {
      method: 'POST',
      body: JSON.stringify({ docUrl })
    });
  },
  async importScannedCourse(payload) {
    return request('/courses/import-scanned', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async formatCurriculumAsCohort(curriculum) {
    return request('/courses/format-cohort', {
      method: 'POST',
      body: JSON.stringify({ curriculum })
    });
  },

  // Curriculum Builder
  async getCurriculum(courseId) {
    return request(`/curriculum/courses/${courseId}/curriculum`);
  },
  async createModule(courseId, moduleData) {
    return request(`/curriculum/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(moduleData)
    });
  },
  async updateModule(moduleId, moduleData) {
    return request(`/curriculum/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(moduleData)
    });
  },
  async duplicateModule(courseId, moduleId) {
    return request(`/curriculum/courses/${courseId}/modules/${moduleId}/duplicate`, {
      method: 'POST'
    });
  },
  async deleteModule(moduleId, force = false) {
    return request(`/curriculum/modules/${moduleId}${force ? '?force=true' : ''}`, {
      method: 'DELETE'
    });
  },
  async reorderModules(courseId, moduleIds) {
    return request(`/curriculum/courses/${courseId}/modules/reorder`, {
      method: 'POST',
      body: JSON.stringify({ moduleIds })
    });
  },
  async createLesson(moduleId, lessonData) {
    return request(`/curriculum/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(lessonData)
    });
  },
  async updateLesson(lessonId, lessonData) {
    return request(`/curriculum/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData)
    });
  },
  async duplicateLesson(moduleId, lessonId) {
    return request(`/curriculum/modules/${moduleId}/lessons/${lessonId}/duplicate`, {
      method: 'POST'
    });
  },
  async deleteLesson(lessonId, force = false) {
    return request(`/curriculum/lessons/${lessonId}${force ? '?force=true' : ''}`, {
      method: 'DELETE'
    });
  },
  async reorderLessons(moduleId, lessonIds) {
    return request(`/curriculum/modules/${moduleId}/lessons/reorder`, {
      method: 'POST',
      body: JSON.stringify({ lessonIds })
    });
  },
  async getModuleQuizAdmin(moduleId) {
    return request(`/curriculum/modules/${moduleId}/quizzes`);
  },
  async createOrUpdateQuiz(moduleId, quizData) {
    return request(`/curriculum/modules/${moduleId}/quizzes`, {
      method: 'POST',
      body: JSON.stringify(quizData)
    });
  },
  async getModuleAssignmentAdmin(moduleId) {
    return request(`/curriculum/modules/${moduleId}/assignments`);
  },
  async createOrUpdateAssignment(moduleId, assignmentData) {
    return request(`/curriculum/modules/${moduleId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
  },
  async addLessonResource(lessonId, resourceData) {
    return request(`/curriculum/lessons/${lessonId}/resources`, {
      method: 'POST',
      body: JSON.stringify(resourceData)
    });
  },
  async deleteLessonResource(lessonId, resourceId) {
    return request(`/curriculum/lessons/${lessonId}/resources/${resourceId}`, {
      method: 'DELETE'
    });
  },

  // Student Learning
  async getStudentCurriculum(courseId) {
    return request(`/learning/${courseId}/curriculum`);
  },
  async getLessonContent(courseId, lessonId) {
    return request(`/learning/${courseId}/lessons/${lessonId}`);
  },
  async saveVideoProgress(courseId, lessonId, positionSeconds, durationSeconds) {
    return request(`/learning/${courseId}/lessons/${lessonId}/video-progress`, {
      method: 'POST',
      body: JSON.stringify({ positionSeconds, durationSeconds })
    });
  },
  async recordReadingProgress(courseId, lessonId, readingPercent) {
    return request(`/learning/${courseId}/lessons/${lessonId}/reading-progress`, {
      method: 'POST',
      body: JSON.stringify({ readingPercent })
    });
  },
  async completeLesson(courseId, lessonId) {
    return request(`/learning/${courseId}/lessons/${lessonId}/complete`, {
      method: 'POST'
    });
  },

  // Quizzes
  async getQuiz(quizId) {
    return request(`/quizzes/${quizId}`);
  },
  async submitQuiz(quizId, answers) {
    return request(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });
  },
  async getQuizAttempts(quizId) {
    return request(`/quizzes/${quizId}/attempts`);
  },

  // Assignments
  async getAssignment(assignmentId) {
    return request(`/assignments/${assignmentId}`);
  },
  async submitAssignment(assignmentId, { contentText, fileUrl }) {
    return request(`/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ contentText, fileUrl })
    });
  },
  async getAssignmentSubmissions(assignmentId) {
    return request(`/assignments/${assignmentId}/submissions`);
  },
  async gradeSubmission(submissionId, { status, marksAwarded, feedback }) {
    return request(`/assignments/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({ status, marksAwarded, feedback })
    });
  },

  // Instructor
  async getInstructorCourses() {
    return request('/instructor/courses');
  },
  async getInstructorOverview() {
    return request('/instructor/overview');
  },
  async getCourseStudents(courseId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.minProgress) params.set('minProgress', filters.minProgress);
    if (filters.maxProgress) params.set('maxProgress', filters.maxProgress);
    if (filters.page) params.set('page', filters.page);
    return request(`/instructor/courses/${courseId}/students?${params.toString()}`);
  },
  async getStudentActivity(userId, courseId) {
    return request(`/instructor/students/${userId}/activity${courseId ? `?courseId=${courseId}` : ''}`);
  },
  async getPendingSubmissions() {
    return request('/instructor/pending-submissions');
  },

  // Analytics
  async getOverviewAnalytics() {
    return request('/analytics/overview');
  },
  async getCourseAnalytics(courseId) {
    return request(`/analytics/course/${courseId}`);
  },
  async getStudentAnalytics() {
    return request('/analytics/student/me');
  },

  // Phase 10: Instructor Learning Analytics
  async getInstructorAnalyticsOverview(params = {}) {
    const query = new URLSearchParams();
    if (params.courseId) query.set('courseId', params.courseId);
    if (params.timeWindow) query.set('timeWindow', params.timeWindow);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    return request(`/analytics/instructor/overview${query.toString() ? `?${query.toString()}` : ''}`);
  },
  async getCourseFunnelAnalytics(courseId, params = {}) {
    const query = new URLSearchParams();
    if (params.timeWindow) query.set('timeWindow', params.timeWindow);
    return request(`/analytics/instructor/courses/${courseId}/funnel${query.toString() ? `?${query.toString()}` : ''}`);
  },
  async getCourseAssessmentAnalytics(courseId, params = {}) {
    const query = new URLSearchParams();
    if (params.timeWindow) query.set('timeWindow', params.timeWindow);
    return request(`/analytics/instructor/courses/${courseId}/assessments${query.toString() ? `?${query.toString()}` : ''}`);
  },
  async getCourseStudentsAnalytics(courseId, params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.minProgress !== undefined && params.minProgress !== '') query.set('minProgress', params.minProgress);
    if (params.maxProgress !== undefined && params.maxProgress !== '') query.set('maxProgress', params.maxProgress);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    return request(`/analytics/instructor/courses/${courseId}/students${query.toString() ? `?${query.toString()}` : ''}`);
  },
  async getStudentCourseDetail(courseId, studentUserId) {
    return request(`/analytics/instructor/courses/${courseId}/students/${studentUserId}`);
  },
  async downloadAnalyticsCsv(courseId, reportType, params = {}) {
    const query = new URLSearchParams(params);
    const token = getActiveUserToken();
    const url = `${API_BASE}/analytics/instructor/courses/${courseId}/export/${reportType}${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to download CSV');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${reportType}-${courseId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Certificates
  async getAllCertificates() {
    return request('/certificates');
  },
  async getMyCertificates() {
    return request('/certificates/my');
  },
  async claimCertificate(courseId) {
    return request(`/certificates/claim/${courseId}`, {
      method: 'POST'
    });
  },
  async verifyCertificate(code) {
    return request(`/certificates/verify/${code}`);
  },

  // Coding Exercises & Execution
  async getExercises() {
    return request('/exercises');
  },
  async getLessonExercises(lessonId) {
    return request(`/exercises/lesson/${lessonId}`);
  },
  async getExercise(exerciseId) {
    return request(`/exercises/${exerciseId}`);
  },
  async getExerciseAdmin(exerciseId) {
    return request(`/exercises/${exerciseId}/admin`);
  },
  async createExercise(exerciseData) {
    return request('/exercises', {
      method: 'POST',
      body: JSON.stringify(exerciseData)
    });
  },
  async updateExercise(exerciseId, exerciseData) {
    return request(`/exercises/${exerciseId}`, {
      method: 'PUT',
      body: JSON.stringify(exerciseData)
    });
  },
  async deleteExercise(exerciseId, force = false) {
    return request(`/exercises/${exerciseId}${force ? '?force=true' : ''}`, {
      method: 'DELETE'
    });
  },
  async runExerciseCode(exerciseId, code, language) {
    return request(`/exercises/${exerciseId}/run`, {
      method: 'POST',
      body: JSON.stringify({ code, language })
    });
  },
  async submitExerciseSolution(exerciseId, code, language) {
    return request(`/exercises/${exerciseId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ code, language })
    });
  },
  async getExerciseSubmissions(exerciseId) {
    return request(`/exercises/${exerciseId}/submissions`);
  },
  async runRawCode(language, code, stdin = '') {
    return request('/exercises/run-raw', {
      method: 'POST',
      body: JSON.stringify({ language, code, stdin })
    });
  },

  // Study Tools: Bookmarks & Personal Notes
  async getBookmarks() {
    return request('/study/bookmarks');
  },
  async getBookmarkStatus(lessonId) {
    return request(`/study/bookmarks/status/${lessonId}`);
  },
  async toggleBookmark(lessonId, note = null) {
    return request('/study/bookmarks/toggle', {
      method: 'POST',
      body: JSON.stringify({ lessonId, note })
    });
  },
  async removeBookmark(lessonId) {
    return request(`/study/bookmarks/${lessonId}`, {
      method: 'DELETE'
    });
  },
  async getLessonNote(lessonId) {
    return request(`/study/notes/lesson/${lessonId}`);
  },
  async saveLessonNote(lessonId, content) {
    return request(`/study/notes/lesson/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
  },
  async getCourseNotes(courseId) {
    return request(`/study/notes?courseId=${encodeURIComponent(courseId)}`);
  },
  async deleteLessonNote(lessonId) {
    return request(`/study/notes/lesson/${lessonId}`, {
      method: 'DELETE'
    });
  },

  // Notifications
  async getNotifications(limit = 20) {
    if (!activeUserToken) return { notifications: [], unreadCount: 0 };
    return request(`/notifications?limit=${limit}`);
  },
  async markNotificationRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  },
  async markAllNotificationsRead() {
    return request('/notifications/mark-all-read', {
      method: 'POST'
    });
  },

  // Billing, Subscriptions & Paywall Entitlements
  async getBillingPlans() {
    return request('/billing/plans');
  },
  async getBillingStatus() {
    return request('/billing/status');
  },
  async checkCourseEntitlement(courseId) {
    return request(`/billing/check-course/${courseId}`);
  },
  async checkout(payload) {
    return request('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async cancelSubscription() {
    return request('/billing/subscription/cancel', {
      method: 'POST'
    });
  },
  async resumeSubscription() {
    return request('/billing/subscription/resume', {
      method: 'POST'
    });
  },
  getBillingReceiptsCsvUrl() {
    return `${API_BASE}/billing/receipts/csv`;
  },

  // Razorpay Standard Web Checkout
  async createRazorpayOrder(payload) {
    return request('/create-order', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async verifyRazorpayPayment(payload) {
    return request('/verify-payment', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Authentication & Security Extensions
  logout() {
    setActiveUserToken(null);
  },
  async forgotPassword(email) {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  async resetPassword(token, newPassword) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  },
  async updateProfile(profileData) {
    return request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },
  async uploadAvatar(imageBase64, mimeType) {
    return request('/auth/profile/avatar', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType })
    });
  },
  async changePassword(currentPassword, newPassword) {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // Admin User Management
  async getAdminUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/auth/users${qs ? `?${qs}` : ''}`);
  },
  async toggleUserStatus(userId, isActive) {
    return request(`/auth/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
  },
  async updateUserRole(userId, role) {
    return request(`/auth/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  },
  async deleteAdminUser(userId) {
    return request(`/auth/users/${userId}`, {
      method: 'DELETE'
    });
  },
  async bulkDeleteAdminUsers(userIds) {
    return request('/auth/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ userIds })
    });
  },

  // Coupon & Discount System
  async validateCoupon(code, courseId) {
    return request('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, courseId })
    });
  },
  async applyFreeCoupon(code, courseId) {
    return request('/coupons/apply-free', {
      method: 'POST',
      body: JSON.stringify({ code, courseId })
    });
  },
  async getAdminCoupons() {
    return request('/admin/coupons');
  },
  async createAdminCoupon(couponData) {
    return request('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(couponData)
    });
  },
  async updateAdminCoupon(id, couponData) {
    return request(`/admin/coupons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(couponData)
    });
  },
  async deleteAdminCoupon(id) {
    return request(`/admin/coupons/${id}`, {
      method: 'DELETE'
    });
  },
  async bulkDeleteAdminCoupons(couponIds) {
    return request('/coupons/admin/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ couponIds })
    });
  },
  async getCouponRedemptions(couponId) {
    return request(`/admin/coupons/${couponId}/redemptions`);
  },

  // Admin Order & Enrollment Management
  async getAdminOrders(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/orders${qs ? `?${qs}` : ''}`);
  },
  async getAdminEnrollments(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/enrollments${qs ? `?${qs}` : ''}`);
  },
  async grantAdminEntitlement(payload) {
    return request('/admin/entitlements/grant', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async revokeAdminEntitlement(payload) {
    return request('/admin/entitlements/revoke', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async bulkRemoveCourseStudents(courseId, enrollmentIds) {
    return request(`/instructor/courses/${courseId}/students/bulk-remove`, {
      method: 'POST',
      body: JSON.stringify({ enrollmentIds })
    });
  }
};
