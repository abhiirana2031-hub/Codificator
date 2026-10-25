import express from 'express';
import { queryAll, queryOne, runQuery, transaction } from '../db/db.js';
import { queryAllNeon, queryOneNeon, runNeonQuery } from '../db/neon.js';
import { requireAuth, requireRole, logAudit } from '../middleware/auth.js';
import { evaluateEnrollmentProgression } from '../services/progressionEngine.js';

const router = express.Router();

// Get Quiz definition
router.get('/:quizId', requireAuth, async (req, res) => {
  const { quizId } = req.params;
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

  if (IS_SERVERLESS) {
    try {
      const quiz = await queryOneNeon('SELECT * FROM quizzes WHERE id = ?', [quizId]);
      if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

      const isInstructorOrAdmin = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR' || req.user.role === 'INSTRUCTOR';

      const questions = await queryAllNeon(
        'SELECT id, quiz_id, prompt, question_type, marks, explanation, concept_to_review, order_index FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC',
        [quizId]
      );

      const allOptions = await queryAllNeon(
        'SELECT id, question_id, text, is_correct, order_index FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE quiz_id = ?) ORDER BY order_index ASC',
        [quizId]
      );

      const formattedQuestions = questions.map(q => {
        const options = allOptions.filter(opt => opt.question_id === q.id);
        return {
          id: q.id,
          quiz_id: q.quiz_id,
          prompt: q.prompt,
          question_type: q.question_type,
          marks: q.marks,
          order_index: q.order_index,
          concept_to_review: q.concept_to_review,
          explanation: isInstructorOrAdmin ? q.explanation : null,
          options: options.map(opt => ({
            id: opt.id,
            text: opt.text,
            order_index: opt.order_index,
            is_correct: isInstructorOrAdmin ? Boolean(opt.is_correct) : undefined
          }))
        };
      });

      return res.json({
        quiz: {
          ...quiz,
          is_required: Boolean(quiz.is_required),
          questions: formattedQuestions
        }
      });
    } catch (err) {
      console.error('[quiz GET Neon error]', err);
    }
  }

  const quiz = queryOne('SELECT * FROM quizzes WHERE id = ?', [quizId]);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const isInstructorOrAdmin = req.user.role === 'ADMIN' || req.user.role === 'OPERATOR' || req.user.role === 'INSTRUCTOR';

  const questions = queryAll(
    'SELECT id, quiz_id, prompt, question_type, marks, explanation, concept_to_review, order_index FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC',
    [quizId]
  ).map(q => {
    const options = queryAll(
      'SELECT id, question_id, text, is_correct, order_index FROM quiz_options WHERE question_id = ? ORDER BY order_index ASC',
      [q.id]
    );

    return {
      id: q.id,
      quiz_id: q.quiz_id,
      prompt: q.prompt,
      question_type: q.question_type,
      marks: q.marks,
      order_index: q.order_index,
      concept_to_review: q.concept_to_review,
      // Strictly protect explanations before submission for students
      explanation: isInstructorOrAdmin ? q.explanation : null,
      options: options.map(opt => ({
        id: opt.id,
        text: opt.text,
        order_index: opt.order_index,
        // Only reveal is_correct to privileged roles before submission
        is_correct: isInstructorOrAdmin ? Boolean(opt.is_correct) : undefined
      }))
    };
  });

  return res.json({
    quiz: {
      ...quiz,
      is_required: Boolean(quiz.is_required),
      questions
    }
  });
});

// Submit Quiz Attempt (Server-Side Automated Grading!)
router.post('/:quizId/submit', requireAuth, async (req, res) => {
  const { quizId } = req.params;
  const { answers } = req.body; // Array of { questionId, selectedOptionId, selectedOptionIds, textResponse }
  const userId = req.user.id;
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

  if (IS_SERVERLESS) {
    try {
      const quiz = await queryOneNeon('SELECT * FROM quizzes WHERE id = ?', [quizId]);
      if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

      const mod = await queryOneNeon('SELECT * FROM modules WHERE id = ?', [quiz.module_id]);
      if (!mod) return res.status(404).json({ error: 'Module not found' });

      let enrollment = await queryOneNeon(
        'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
        [userId, mod.course_id]
      );
      if (!enrollment) {
        const enrollmentId = `enr-${userId}-${mod.course_id}`;
        await runNeonQuery(
          'INSERT INTO enrollments (id, user_id, course_id, status, progress_percent) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING',
          [enrollmentId, userId, mod.course_id, 'ACTIVE', 0]
        );
        enrollment = { id: enrollmentId, user_id: userId, course_id: mod.course_id };
      }

      // Check attempt limits
      const attemptCountRes = await queryOneNeon(
        'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?',
        [quizId, userId]
      );
      const attemptCount = Number(attemptCountRes?.count || 0);

      if (quiz.max_attempts && attemptCount >= quiz.max_attempts) {
        return res.status(400).json({
          error: `Maximum quiz attempt limit of ${quiz.max_attempts} reached.`
        });
      }

      // Fetch all questions and options
      const questions = await queryAllNeon(
        'SELECT id, prompt, question_type, marks, explanation, concept_to_review FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC',
        [quizId]
      );

      const allOptions = await queryAllNeon(
        'SELECT id, question_id, text, is_correct FROM quiz_options WHERE question_id IN (SELECT id FROM quiz_questions WHERE quiz_id = ?)',
        [quizId]
      );

      let totalScore = 0;
      let maxPossibleScore = 0;
      const evaluatedAnswers = [];

      for (const q of questions) {
        maxPossibleScore += (Number(q.marks) || 1.0);
        const submitted = (answers || []).find(a => a.questionId === q.id) || {};
        let isCorrect = false;
        let marksAwarded = 0;

        const correctOptions = allOptions.filter(o => o.question_id === q.id && (o.is_correct === 1 || o.is_correct === true));
        const correctIds = correctOptions.map(o => o.id);

        if (q.question_type === 'SINGLE_CHOICE' || q.question_type === 'TRUE_FALSE') {
          const selectedId = submitted.selectedOptionId;
          if (selectedId && correctIds.includes(selectedId)) {
            isCorrect = true;
            marksAwarded = Number(q.marks) || 1.0;
          }
        } else if (q.question_type === 'MULTIPLE_CHOICE') {
          const selectedIds = submitted.selectedOptionIds || (submitted.selectedOptionId ? [submitted.selectedOptionId] : []);
          const matchesAll = correctIds.length === selectedIds.length &&
            correctIds.every(id => selectedIds.includes(id));
          if (matchesAll) {
            isCorrect = true;
            marksAwarded = Number(q.marks) || 1.0;
          }
        } else if (q.question_type === 'SHORT_ANSWER') {
          const userText = (submitted.textResponse || '').trim().toLowerCase();
          const matched = correctOptions.some(o => o.text.trim().toLowerCase() === userText);
          if (matched) {
            isCorrect = true;
            marksAwarded = Number(q.marks) || 1.0;
          }
        }

        totalScore += marksAwarded;
        evaluatedAnswers.push({
          questionId: q.id,
          prompt: q.prompt,
          questionType: q.question_type,
          selectedOptionIds: submitted.selectedOptionIds || (submitted.selectedOptionId ? [submitted.selectedOptionId] : []),
          textResponse: submitted.textResponse || null,
          isCorrect,
          marksAwarded,
          maxMarks: Number(q.marks) || 1.0,
          explanation: q.explanation,
          conceptToReview: q.concept_to_review,
          correctOptionIds: correctIds,
          correctOptions: correctOptions.map(o => o.text)
        });
      }

      const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
      const isPassed = percentage >= quiz.passing_percentage;
      const attemptId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      await runNeonQuery(
        `INSERT INTO quiz_attempts (
          id, quiz_id, user_id, enrollment_id, score, max_score, percentage, is_passed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [attemptId, quizId, userId, enrollment.id, totalScore, maxPossibleScore, percentage, isPassed ? 1 : 0]
      );

      for (const ans of evaluatedAnswers) {
        const ansId = `ans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await runNeonQuery(
          `INSERT INTO quiz_answers (
            id, attempt_id, question_id, selected_option_ids, text_response, is_correct, marks_awarded
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ansId,
            attemptId,
            ans.questionId,
            JSON.stringify(ans.selectedOptionIds),
            ans.textResponse,
            ans.isCorrect ? 1 : 0,
            ans.marksAwarded
          ]
        );
      }

      logAudit(userId, 'QUIZ_SUBMITTED', 'QUIZ', quizId, { score: totalScore, isPassed });

      const nextModule = await queryOneNeon(
        'SELECT id, title FROM modules WHERE course_id = ? AND order_index = ? AND is_published = 1',
        [mod.course_id, mod.order_index + 1]
      );

      return res.json({
        success: true,
        attempt: {
          id: attemptId,
          score: totalScore,
          max_score: maxPossibleScore,
          percentage: Math.round(percentage * 10) / 10,
          is_passed: isPassed,
          passing_percentage: quiz.passing_percentage,
          is_module_unlocked: isPassed,
          next_module_id: nextModule ? nextModule.id : null,
          next_module_title: nextModule ? nextModule.title : null,
          evaluated_answers: evaluatedAnswers
        }
      });
    } catch (err) {
      console.error('[quiz submit Neon error]', err);
    }
  }

  const quiz = queryOne('SELECT * FROM quizzes WHERE id = ?', [quizId]);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  // Get module and course
  const mod = queryOne('SELECT * FROM modules WHERE id = ?', [quiz.module_id]);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  const enrollment = queryOne(
    'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
    [userId, mod.course_id]
  );
  if (!enrollment) return res.status(403).json({ error: 'Not enrolled in course' });

  // Check attempt limits
  const attemptCount = queryOne(
    'SELECT COUNT(*) as count FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?',
    [quizId, userId]
  ).count;

  if (quiz.max_attempts && attemptCount >= quiz.max_attempts) {
    return res.status(400).json({
      error: `Maximum quiz attempt limit of ${quiz.max_attempts} reached.`
    });
  }

  // Fetch all questions and their correct options
  const questions = queryAll(
    'SELECT id, prompt, question_type, marks, explanation, concept_to_review FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC',
    [quizId]
  );

  let totalScore = 0;
  let maxPossibleScore = 0;
  const evaluatedAnswers = [];

  for (const q of questions) {
    maxPossibleScore += (q.marks || 1.0);
    const submitted = (answers || []).find(a => a.questionId === q.id) || {};
    let isCorrect = false;
    let marksAwarded = 0;

    const correctOptions = queryAll(
      'SELECT id, text FROM quiz_options WHERE question_id = ? AND is_correct = 1',
      [q.id]
    );
    const correctIds = correctOptions.map(o => o.id);

    if (q.question_type === 'SINGLE_CHOICE' || q.question_type === 'TRUE_FALSE') {
      const selectedId = submitted.selectedOptionId;
      if (selectedId && correctIds.includes(selectedId)) {
        isCorrect = true;
        marksAwarded = q.marks || 1.0;
      }
    } else if (q.question_type === 'MULTIPLE_CHOICE') {
      const selectedIds = submitted.selectedOptionIds || (submitted.selectedOptionId ? [submitted.selectedOptionId] : []);
      const matchesAll = correctIds.length === selectedIds.length &&
        correctIds.every(id => selectedIds.includes(id));
      if (matchesAll) {
        isCorrect = true;
        marksAwarded = q.marks || 1.0;
      }
    } else if (q.question_type === 'SHORT_ANSWER') {
      // Case-insensitive, whitespace-trimmed text comparison against correct option texts
      const userText = (submitted.textResponse || '').trim().toLowerCase();
      const matched = correctOptions.some(o => o.text.trim().toLowerCase() === userText);
      if (matched) {
        isCorrect = true;
        marksAwarded = q.marks || 1.0;
      }
    }

    totalScore += marksAwarded;
    evaluatedAnswers.push({
      questionId: q.id,
      prompt: q.prompt,
      questionType: q.question_type,
      selectedOptionIds: submitted.selectedOptionIds || (submitted.selectedOptionId ? [submitted.selectedOptionId] : []),
      textResponse: submitted.textResponse || null,
      isCorrect,
      marksAwarded,
      maxMarks: q.marks || 1.0,
      explanation: q.explanation,
      conceptToReview: q.concept_to_review,
      correctOptionIds: correctIds,
      correctOptions: correctOptions.map(o => o.text)
    });
  }

  const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  const isPassed = percentage >= quiz.passing_percentage;

  const attemptId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  transaction(() => {
    runQuery(
      `INSERT INTO quiz_attempts (
        id, quiz_id, user_id, enrollment_id, score, max_score, percentage, is_passed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [attemptId, quizId, userId, enrollment.id, totalScore, maxPossibleScore, percentage, isPassed ? 1 : 0]
    );

    for (const ans of evaluatedAnswers) {
      const ansId = `ans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      runQuery(
        `INSERT INTO quiz_answers (
          id, attempt_id, question_id, selected_option_ids, text_response, is_correct, marks_awarded
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ansId,
          attemptId,
          ans.questionId,
          JSON.stringify(ans.selectedOptionIds),
          ans.textResponse,
          ans.isCorrect ? 1 : 0,
          ans.marksAwarded
        ]
      );
    }

    logAudit(userId, 'QUIZ_SUBMITTED', 'QUIZ', quizId, { score: totalScore, isPassed });

    // Trigger sequential module unlocking evaluation!
    evaluateEnrollmentProgression(enrollment.id);
  });

  const nextModule = queryOne(
    'SELECT id, title FROM modules WHERE course_id = ? AND order_index = ? AND is_published = 1',
    [mod.course_id, mod.order_index + 1]
  );

  return res.json({
    success: true,
    attempt: {
      id: attemptId,
      score: totalScore,
      max_score: maxPossibleScore,
      percentage: Math.round(percentage * 10) / 10,
      is_passed: isPassed,
      passing_percentage: quiz.passing_percentage,
      is_module_unlocked: isPassed,
      next_module_id: nextModule ? nextModule.id : null,
      next_module_title: nextModule ? nextModule.title : null,
      evaluated_answers: evaluatedAnswers
    }
  });
});

// Get user's quiz attempts history
router.get('/:quizId/attempts', requireAuth, async (req, res) => {
  const { quizId } = req.params;
  const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

  if (IS_SERVERLESS) {
    try {
      const attempts = (await queryAllNeon(
        `SELECT id, score, max_score, percentage, is_passed, submitted_at
         FROM quiz_attempts
         WHERE quiz_id = ? AND user_id = ?
         ORDER BY submitted_at DESC`,
        [quizId, req.user.id]
      )).map(a => ({
        ...a,
        is_passed: Boolean(a.is_passed)
      }));

      return res.json({ attempts });
    } catch (err) {
      console.error('[quiz attempts Neon error]', err);
    }
  }

  const attempts = queryAll(
    `SELECT id, score, max_score, percentage, is_passed, submitted_at
     FROM quiz_attempts
     WHERE quiz_id = ? AND user_id = ?
     ORDER BY submitted_at DESC`,
    [quizId, req.user.id]
  ).map(a => ({
    ...a,
    is_passed: Boolean(a.is_passed)
  }));

  return res.json({ attempts });
});

export default router;
