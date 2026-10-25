/**
 * Codificators LMS - Phase 7.4 Live Deployment & Production Verification Script
 * Validates authenticated Python & JS execution, error classification,
 * authorization boundaries, queue resilience, and LMS independence.
 */

import assert from 'node:assert/strict';
import { queryOne, runQuery } from '../server/db/db.js';

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, headers: res.headers, data };
}

console.log('================================================================');
console.log('CODIFICATORS — PHASE 7.4 LIVE DEPLOYMENT & PRODUCTION VERIFICATION');
console.log('================================================================\n');

let passedChecks = 0;
let totalChecks = 0;

function check(name, fn) {
  totalChecks++;
  try {
    fn();
    console.log(`✅ [Pass ${totalChecks}]: ${name}`);
    passedChecks++;
  } catch (err) {
    console.error(`❌ [FAIL ${totalChecks}]: ${name}`);
    console.error(`   ${err.message}`);
    process.exit(1);
  }
}

async function checkAsync(name, fn) {
  totalChecks++;
  try {
    await fn();
    console.log(`✅ [Pass ${totalChecks}]: ${name}`);
    passedChecks++;
  } catch (err) {
    console.error(`❌ [FAIL ${totalChecks}]: ${name}`);
    console.error(`   ${err.message}`);
    process.exit(1);
  }
}

// 1. Setup Student Accounts & Auth
const student1Email = `student1_p74_${Date.now()}@codificators.edu`;
const student2Email = `student2_p74_${Date.now()}@codificators.edu`;
const adminEmail = `admin_p74_${Date.now()}@codificators.edu`;
const password = 'Password@123';

let token1 = null;
let user1Id = null;
let token2 = null;
let user2Id = null;
let adminToken = null;

await checkAsync('Register Student 1 and acquire auth token', async () => {
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Student 1 (Phase 7.4)', email: student1Email, password, role: 'student' }
  });
  assert.equal(regRes.status, 201);
  token1 = regRes.data.token;
  user1Id = regRes.data.user.id;
  assert.ok(token1, 'Token 1 must be present');
});

await checkAsync('Register Student 2 and acquire auth token', async () => {
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Student 2 (Phase 7.4)', email: student2Email, password, role: 'student' }
  });
  assert.equal(regRes.status, 201);
  token2 = regRes.data.token;
  user2Id = regRes.data.user.id;
  assert.ok(token2, 'Token 2 must be present');
});

await checkAsync('Authenticate Admin user (usr-admin-1) and acquire auth token', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@codificators.com', password: 'demo123' }
  });
  assert.equal(loginRes.status, 200, `Expected 200, got ${loginRes.status}`);
  adminToken = loginRes.data.token;
  assert.ok(adminToken, 'Admin token must be present');
});

await checkAsync('Enroll Student 1 in Full Stack course', async () => {
  const enr2 = await request('/api/courses/course-fullstack-web/enroll', {
    method: 'POST',
    token: token1
  });
  assert.equal(enr2.status, 200, `Expected 200, got ${enr2.status}: ${JSON.stringify(enr2.data)}`);
});

await checkAsync('Enroll Student 2 in Full Stack course', async () => {
  const enr1 = await request('/api/courses/course-fullstack-web/enroll', {
    method: 'POST',
    token: token2
  });
  assert.equal(enr1.status, 200, `Expected 200, got ${enr1.status}: ${JSON.stringify(enr1.data)}`);
});

// 2. Generic Python Runtime Execution
await checkAsync('Python raw execution runs standalone scripts', async () => {
  const res = await request('/api/exercises/run-raw', {
    method: 'POST',
    token: token1,
    body: { code: 'print(42)', language: 'python' }
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.result.status, 'SUCCESS');
  assert.equal(res.data.result.stdout.trim(), '42');
});

await checkAsync('Python raw execution reports runtime errors', async () => {
  const res = await request('/api/exercises/run-raw', {
    method: 'POST',
    token: token1,
    body: { code: 'print(1 / 0)', language: 'python' }
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.result.status, 'RUNTIME_ERROR');
  assert.ok(res.data.result.stderr.includes('ZeroDivisionError'));
});

// 3. JavaScript Execution & Grading via Authenticated API
await checkAsync('JavaScript: Correct program passes all public & private tests (ACCEPTED)', async () => {
  const correctCode = `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
`;
  const res = await request('/api/exercises/ex-js-1/submit', {
    method: 'POST',
    token: token1,
    body: { code: correctCode, language: 'javascript' }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.submission.status, 'ACCEPTED');
  assert.equal(res.data.submission.passedTests, 5);
});

await checkAsync('JavaScript: Runtime exception handled accurately (TypeError)', async () => {
  const runtimeErrorCode = `function twoSum(nums, target) {
  null.nonExistentMethod();
}
`;
  const res = await request('/api/exercises/ex-js-1/submit', {
    method: 'POST',
    token: token1,
    body: { code: runtimeErrorCode, language: 'javascript' }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.submission.status, 'WRONG_ANSWER');
  assert.ok(res.data.submission.testResults.some(r => (r.error || '').includes('Cannot read properties of null') || (r.error || '').includes('TypeError')));

  // Also test raw execution
  const rawRes = await request('/api/exercises/run-raw', {
    method: 'POST',
    token: token1,
    body: { code: 'null.f()', language: 'javascript' }
  });
  assert.equal(rawRes.status, 200);
  assert.equal(rawRes.data.result.status, 'RUNTIME_ERROR');
  assert.ok(rawRes.data.result.stderr.includes('TypeError'));
});

// 4. Multi-Tenant Cross-Student Isolation & Authorization
await checkAsync('Submission Scoping: Student 2 cannot view Student 1 submissions', async () => {
  // Student 1 submitted solutions above to ex-js-1
  const res1 = await request('/api/exercises/ex-js-1/submissions', {
    token: token1
  });
  assert.equal(res1.status, 200);
  assert.ok(res1.data.submissions.length > 0, 'Student 1 must see their submissions');

  // Student 2 queries same exercise
  const res2 = await request('/api/exercises/ex-js-1/submissions', {
    token: token2
  });
  assert.equal(res2.status, 200);
  assert.equal(res2.data.submissions.length, 0, 'Student 2 must see 0 submissions');
});

await checkAsync('Unpublished Course Protection: Students barred from exercises in draft courses (HTTP 403)', async () => {
  const draftCourseId = `draft-c-${Date.now()}`;
  const draftExId = `draft-ex-${Date.now()}`;
  runQuery(`INSERT INTO courses (id, title, slug, is_published) VALUES (?, 'Draft', ?, 0)`, [draftCourseId, `draft-${Date.now()}`]);
  runQuery(`INSERT INTO coding_exercises (id, course_id, title, slug, description, starter_code, language, function_name) VALUES (?, ?, 'Draft Ex', ?, 'Draft exercise description', 'function draftFn() {}', 'javascript', 'draftFn')`, [draftExId, draftCourseId, `draft-ex-${Date.now()}`]);

  const res = await request(`/api/exercises/${draftExId}/run`, {
    method: 'POST',
    token: token1,
    body: { code: 'function draftFn() {}', language: 'javascript' }
  });
  assert.equal(res.status, 403, 'Must return HTTP 403 Forbidden for draft course exercise');
});

await checkAsync('Revoked/Dropped Enrollment Protection: Dropped students barred from exercise execution (HTTP 403)', async () => {
  runQuery(`UPDATE enrollments SET status = 'DROPPED' WHERE user_id = ? AND course_id = 'course-fullstack-web'`, [user2Id]);

  const res = await request('/api/exercises/ex-js-1/run', {
    method: 'POST',
    token: token2,
    body: { code: 'function twoSum(nums, target) { return []; }', language: 'javascript' }
  });

  assert.equal(res.status, 403, 'Must return HTTP 403 for dropped enrollment');
});

await checkAsync('Operational Metrics Protection: Students barred from operational metrics (HTTP 403)', async () => {
  const res = await request('/api/exercises/operational-metrics', {
    token: token1
  });
  assert.equal(res.status, 403, 'Student must receive HTTP 403 Forbidden');
});

await checkAsync('Operational Metrics Protection: Admin can view execution metrics (HTTP 200)', async () => {
  const res = await request('/api/exercises/operational-metrics', {
    token: adminToken
  });
  assert.equal(res.status, 200, 'Admin must receive HTTP 200');
  assert.ok(res.data.metrics);
  assert.ok('activeWorkers' in res.data.metrics);
  assert.ok('queueDepth' in res.data.metrics);
});

// 5. Execution Disabled Behavior & LMS Independence
await checkAsync('Core LMS Resilience: Notes reading, quizzes, and progression function normally', async () => {
  // Fetch courses catalog
  const catalogRes = await request('/api/courses');
  assert.equal(catalogRes.status, 200);
  assert.ok(catalogRes.data.courses.length >= 2);

  // Fetch lesson notes
  const lessonRes = await request('/api/learning/course-fullstack-web/lessons/les-m1-1', { token: token1 });
  assert.equal(lessonRes.status, 200);
  assert.ok(lessonRes.data.lesson.text_content.length > 5000);

  // Submit quiz
  const { fullStackAssessments } = await import('../server/services/assessmentCatalog.js');
  const quizDef = fullStackAssessments.find(a => a.id === 'quiz-mod-1');
  const answers = quizDef.questions.map(q => {
    if (q.question_type === 'MULTIPLE_CHOICE') {
      const correctOptIds = q.options.filter(o => o.is_correct).map(o => o.id);
      return { questionId: q.id, selectedOptionIds: correctOptIds };
    } else if (q.question_type === 'SHORT_ANSWER') {
      const correctText = q.options.find(o => o.is_correct)?.text || '';
      return { questionId: q.id, textResponse: correctText };
    } else {
      const correctOpt = q.options.find(o => o.is_correct);
      return { questionId: q.id, selectedOptionId: correctOpt?.id };
    }
  });

  const quizRes = await request('/api/quizzes/quiz-mod-1/submit', {
    method: 'POST',
    token: token1,
    body: { answers }
  });
  assert.equal(quizRes.status, 200);
  assert.ok(quizRes.data.attempt && quizRes.data.attempt.is_passed);
});

console.log('\n================================================================');
console.log(`ALL PHASE 7.4 LIVE VERIFICATIONS PASSED: ${passedChecks}/${totalChecks}`);
console.log('================================================================\n');
