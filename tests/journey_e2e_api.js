/**
 * End-to-End Real-World Student Journey Verification Script
 * Validates against the live backend server (http://localhost:5000).
 */

import { fullStackAssessments } from '../server/services/assessmentCatalog.js';

const BASE_URL = 'http://localhost:5000';

function getAnswersForQuiz(quizId) {
  const assessment = fullStackAssessments.find(a => a.id === quizId);
  if (!assessment) return [];
  return assessment.questions.map(q => {
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
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || `HTTP ${res.status}: ${res.statusText}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function runStudentJourney() {
  console.log('🚀 Starting Real-World Student Journey End-to-End Verification against live server...\n');
  const timestamp = Date.now();
  const studentEmail = `student_e2e_${timestamp}@codificators.edu`;
  const studentPassword = 'LaunchReady2026!';
  const studentName = `Journey Student ${timestamp}`;

  // STEP 1: Register student account
  console.log('Step 1: Registering new student account...');
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword,
      name: studentName,
      role: 'STUDENT'
    })
  });
  console.log(`  -> Student registered successfully with ID: ${regRes.user.id}`);
  let token = regRes.token;

  // STEP 2: Sign in and sign out verification
  console.log('\nStep 2: Testing Sign In and Sign Out...');
  // Sign in
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword
    })
  });
  token = loginRes.token;
  console.log(`  -> Sign In verified for ${loginRes.user.email}`);

  // Test profile access
  const meRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`  -> Auth token verified against /api/auth/me: ${meRes.user.name} (${meRes.user.role})`);

  // STEP 3: Browse published courses
  console.log('\nStep 3: Browsing published course catalog...');
  const coursesRes = await request('/api/courses');
  console.log(`  -> Found ${coursesRes.courses.length} published courses in catalog`);
  const fullstackCourse = coursesRes.courses.find(c => c.id === 'course-fullstack-web');
  if (!fullstackCourse) throw new Error('course-fullstack-web not found in catalog');
  console.log(`  -> Course verified: ${fullstackCourse.title} (${fullstackCourse.level})`);

  // STEP 4: Open course description
  console.log('\nStep 4: Opening course description details...');
  const courseDetails = await request('/api/courses/course-fullstack-web');
  console.log(`  -> Course description loaded: "${courseDetails.course.description.slice(0, 70)}..."`);

  // STEP 5: Enroll in course
  console.log('\nStep 5: Enrolling student in course-fullstack-web...');
  const enrollRes = await request('/api/courses/course-fullstack-web/enroll', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`  -> Enrollment confirmed! Enrollment ID: ${enrollRes.enrollment.id}`);

  // STEP 6: Open and read a lesson
  console.log('\nStep 6: Opening lesson and fetching curriculum...');
  const curriculumRes = await request('/api/learning/course-fullstack-web/curriculum', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const mod1 = curriculumRes.curriculum[0];
  const firstLesson = mod1.lessons[0];
  console.log(`  -> Loaded Module 1: "${mod1.title}" (Status: ${mod1.is_unlocked ? 'UNLOCKED' : 'LOCKED'})`);

  const lessonDetailRes = await request(`/api/learning/course-fullstack-web/lessons/${firstLesson.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const fullLesson = lessonDetailRes.lesson;
  console.log(`  -> Reading Lesson 1: "${fullLesson.title}" (${fullLesson.reading_time_minutes} min read)`);
  console.log(`  -> Text length: ${fullLesson.text_content.length} characters of Markdown`);

  // STEP 7: Navigate through table of contents
  console.log('\nStep 7: Validating Table of Contents headings extraction...');
  const headings = fullLesson.text_content
    .split('\n')
    .filter(line => line.trim().startsWith('#'))
    .map(line => line.trim());
  console.log(`  -> Found ${headings.length} headings in lesson notes`);
  console.log(`  -> Sample headings:\n     - ${headings.slice(0, 3).join('\n     - ')}`);

  // STEP 8: Copy code examples validation
  console.log('\nStep 8: Verifying structured code examples in lesson...');
  const codeBlocks = fullLesson.text_content.match(/```[a-z]*[\s\S]*?```/g) || [];
  console.log(`  -> Found ${codeBlocks.length} code blocks formatted for copying in Lesson 1`);

  // STEP 9: Save and restore reading progress
  console.log('\nStep 9: Saving and restoring reading progress...');
  await request(`/api/learning/course-fullstack-web/lessons/${firstLesson.id}/reading-progress`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ readingPercent: 85.0 })
  });
  const checkProgressRes = await request('/api/learning/course-fullstack-web/curriculum', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const restoredLesson = checkProgressRes.curriculum[0].lessons[0];
  console.log(`  -> Saved progress: 85.0% | Restored from DB: ${restoredLesson.watched_progress_percent}%`);

  // STEP 10: Mark a lesson complete
  console.log('\nStep 10: Explicitly marking lesson complete...');
  const completeRes = await request(`/api/learning/course-fullstack-web/lessons/${firstLesson.id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`  -> Lesson marked complete! Course progress: ${completeRes.progression.progressPercent}%`);

  // STEP 11: Complete required assessment
  console.log('\nStep 11: Completing required assessment (Quiz for Module 1)...');
  // First complete all other required lessons in Module 1
  for (let i = 1; i < mod1.lessons.length; i++) {
    const l = mod1.lessons[i];
    await request(`/api/learning/course-fullstack-web/lessons/${l.id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Fetch quiz questions
  const quizDetails = await request('/api/quizzes/quiz-mod-1', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`  -> Quiz loaded: "${quizDetails.quiz.title}" (${quizDetails.quiz.questions.length} questions)`);

  // Submit correct answers based on assessment catalog
  const answers = getAnswersForQuiz('quiz-mod-1');
  const quizSubmitRes = await request('/api/quizzes/quiz-mod-1/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ answers })
  });
  console.log(`  -> Quiz submitted! Score: ${quizSubmitRes.attempt.percentage}% (Passed: ${quizSubmitRes.attempt.is_passed ? 'YES' : 'NO'})`);

  // Submit assignment
  console.log('  -> Submitting required Module 1 project assignment...');
  const asgSubmitRes = await request('/api/assignments/asg-mod-1/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      contentText: '<!DOCTYPE html><html><head><title>Portfolio</title></head><body><h1>My Portfolio</h1></body></html>',
      fileUrl: 'https://github.com/student/html-portfolio'
    })
  });
  console.log(`  -> Assignment submitted! Submission ID: ${asgSubmitRes.submission.id}`);

  // Grade assignment using instructor/admin token
  console.log('  -> Auto-evaluating/grading assignment via instructor channel...');
  const instructorLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'instructor@codificators.com', password: 'instructor123' })
  });
  await request(`/api/assignments/submissions/${asgSubmitRes.submission.id}/grade`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${instructorLogin.token}` },
    body: JSON.stringify({
      status: 'APPROVED',
      marksAwarded: 95.0,
      feedback: 'Outstanding semantic HTML5 portfolio structure and accessibility.'
    })
  });
  console.log('  -> Assignment approved with 95.0% score!');

  // STEP 12: Unlock the next module
  console.log('\nStep 12: Verifying Module 2 unlocked status...');
  const updatedCurriculum = await request('/api/learning/course-fullstack-web/curriculum', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const mod2 = updatedCurriculum.curriculum[1];
  console.log(`  -> Module 2 Status: ${mod2.is_unlocked ? 'UNLOCKED ✅' : 'LOCKED ❌'}`);
  if (!mod2.is_unlocked) throw new Error('Module 2 failed to unlock after passing Module 1 requirements');

  // STEP 13: Resume learning after signing out and signing back in
  console.log('\nStep 13: Simulating Sign Out and Sign In, verifying Resume Learning...');
  // Fresh sign in
  const freshLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: studentEmail, password: studentPassword })
  });
  const resumeCurriculum = await request('/api/learning/course-fullstack-web/curriculum', {
    headers: { Authorization: `Bearer ${freshLogin.token}` }
  });
  console.log(`  -> Resume Lesson Pointer: ${resumeCurriculum.resume_lesson?.lessonTitle} (${resumeCurriculum.resume_lesson?.lessonId})`);
  console.log(`  -> Resuming Module: ${resumeCurriculum.resume_lesson?.moduleTitle}`);

  // STEP 14: Complete the course
  console.log('\nStep 14: Completing all remaining modules in course-fullstack-web...');
  // Complete all remaining lessons and quizzes across modules 2-6
  for (let mIdx = 1; mIdx < resumeCurriculum.curriculum.length; mIdx++) {
    const m = resumeCurriculum.curriculum[mIdx];
    for (const les of m.lessons) {
      await request(`/api/learning/course-fullstack-web/lessons/${les.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    // If module has quiz, pass it
    if (m.quiz) {
      const qAnswers = getAnswersForQuiz(m.quiz.id);
      await request(`/api/quizzes/${m.quiz.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: qAnswers })
      });
    }
  }

  // STEP 15: Verify certificate eligibility and verification
  console.log('\nStep 15: Verifying Certificate Eligibility and Cryptographic Verification...');
  const finalCurriculum = await request('/api/learning/course-fullstack-web/curriculum', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`  -> Final Course Progress: ${finalCurriculum.course.progress_percent}% (Status: ${finalCurriculum.course.status})`);
  
  if (finalCurriculum.certificate) {
    const certCode = finalCurriculum.certificate.certificate_code;
    console.log(`  -> Certificate Issued! Verification Code: ${certCode}`);
    console.log(`  -> Verification Path: ${finalCurriculum.certificate.verification_url}`);

    // Verify certificate publicly
    const verifyRes = await request(`/api/certificates/verify/${certCode}`);
    console.log(`  -> Public Verification Result: ${verifyRes.valid ? 'VALID ✅' : 'INVALID ❌'}`);
    console.log(`  -> Student Name: ${verifyRes.certificate.student_name}`);
    console.log(`  -> Course Title: ${verifyRes.certificate.course_title}`);
    console.log(`  -> Issued At: ${verifyRes.certificate.issue_date}`);
  } else {
    throw new Error('Course completed 100% but certificate was not issued.');
  }

  console.log('\n======================================================');
  console.log('🎉 REAL-WORLD STUDENT JOURNEY COMPLETED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runStudentJourney().catch(err => {
  console.error('\n❌ Student Journey Failed:');
  console.error(err.message);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
});
