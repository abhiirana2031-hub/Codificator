import { queryOne, queryAll } from '../db/db.js';

/**
 * Checks if the authenticated user has management rights over a given course.
 * Administrators and Operators have platform-wide access.
 * Instructors only have management access over courses they own or are assigned to as co-instructors.
 */
export function canManageCourse(courseId, user) {
  if (!user) {
    return { allowed: false, status: 401, error: 'Authentication required' };
  }

  const role = String(user.role || '').toUpperCase();
  if (role === 'ADMIN' || role === 'OPERATOR') {
    return { allowed: true };
  }

  if (role !== 'INSTRUCTOR') {
    return { allowed: false, status: 403, error: 'Only instructors and administrators may manage courses.' };
  }

  const course = queryOne('SELECT id, instructor_id, is_published, status FROM courses WHERE id = ?', [courseId]);
  if (!course) {
    return { allowed: false, status: 404, error: 'Course not found' };
  }

  if (course.instructor_id === user.id) {
    return { allowed: true, course };
  }

  const coInstructor = queryOne(
    'SELECT * FROM course_instructors WHERE course_id = ? AND instructor_id = ?',
    [courseId, user.id]
  );

  if (coInstructor) {
    return { allowed: true, course };
  }

  return {
    allowed: false,
    status: 403,
    error: 'Access denied: You are only authorized to edit and manage courses assigned to your instructor profile.'
  };
}

/**
 * Validates whether a course satisfies all pedagogical and structural criteria to be published.
 */
export function validateCourseForPublishing(courseId) {
  const course = queryOne('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) {
    return { isValid: false, errors: ['Course not found'], warnings: [] };
  }

  const errors = [];
  const warnings = [];

  // 1. Course Metadata
  if (!course.title || course.title.trim().length < 5) {
    errors.push('Course title must be at least 5 characters long.');
  }
  if (!course.description || course.description.trim().length < 20) {
    errors.push('Course description must provide at least 20 characters of detail for students.');
  }
  if (!course.category) {
    errors.push('Course category must be specified.');
  }
  if (!course.level) {
    errors.push('Course difficulty level must be specified.');
  }

  // 2. Modules
  const modules = queryAll('SELECT * FROM modules WHERE course_id = ? ORDER BY order_index ASC', [courseId]);
  if (modules.length === 0) {
    errors.push('Course must contain at least one module before it can be published.');
  } else {
    for (const mod of modules) {
      const lessons = queryAll('SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index ASC', [mod.id]);
      if (lessons.length === 0) {
        errors.push(`Module "${mod.title}" has no lessons. Every module must have at least one lesson.`);
      } else {
        for (const les of lessons) {
          if (!les.title || les.title.trim().length < 3) {
            errors.push(`Lesson in "${mod.title}" has an invalid or too short title.`);
          }
          if (!les.text_content || les.text_content.trim().length < 50) {
            warnings.push(`Lesson "${les.title}" has less than 50 characters of technical content.`);
          }
        }
      }

      // Check quizzes
      const quiz = queryOne('SELECT * FROM quizzes WHERE module_id = ?', [mod.id]);
      if (quiz) {
        const questions = queryAll('SELECT * FROM quiz_questions WHERE quiz_id = ?', [quiz.id]);
        if (questions.length === 0) {
          errors.push(`Module "${mod.title}" has a quiz configured without any questions.`);
        } else {
          for (const q of questions) {
            const correctOpt = queryOne('SELECT id FROM quiz_options WHERE question_id = ? AND is_correct = 1', [q.id]);
            if (!correctOpt && q.question_type !== 'SHORT_ANSWER') {
              errors.push(`Question "${q.prompt.slice(0, 40)}..." has no correct answer option designated.`);
            }
          }
        }
      }

      // Check assignments
      const assignment = queryOne('SELECT * FROM assignments WHERE module_id = ?', [mod.id]);
      if (assignment) {
        if (!assignment.instructions || assignment.instructions.trim().length < 15) {
          errors.push(`Assignment in module "${mod.title}" must provide detailed submission instructions.`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
