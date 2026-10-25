import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryOne, runQuery, transaction } from '../db/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courseDataPath = path.resolve(__dirname, '../data/vexorCourses.json');
const sourceCourses = JSON.parse(fs.readFileSync(courseDataPath, 'utf8'));

const courseSettings = {
  python: {
    id: 'vexor-python',
    slug: 'python-engineering-mastery',
    category: 'Programming & Systems',
    level: 'Beginner to Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800',
    prerequisites: ['Basic computer literacy']
  },
  fullstack: {
    id: 'vexor-fullstack',
    slug: 'full-stack-web-development-academy',
    category: 'Full-Stack & APIs',
    level: 'Beginner to Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
    prerequisites: ['Basic computer literacy']
  },
  cpp: {
    id: 'vexor-cpp',
    slug: 'cpp-systems-software-architecture',
    category: 'Programming & Systems',
    level: 'Intermediate to Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    prerequisites: ['Basic programming fundamentals recommended']
  },
  dsa: {
    id: 'vexor-dsa',
    slug: 'data-structures-algorithms-mastery',
    category: 'DSA & Placements',
    level: 'Beginner to Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    prerequisites: ['Basic programming fundamentals recommended']
  }
};

function codeBlock(snippet, heading = 'Code example') {
  if (!snippet?.code) return '';

  const sections = [
    `### ${snippet.title || heading}`,
    snippet.description,
    `\`\`\`${snippet.language || ''}`,
    snippet.code,
    '```'
  ].filter(Boolean);

  if (snippet.expectedOutput) {
    sections.push('**Expected output**', '```text', snippet.expectedOutput, '```');
  }

  if (snippet.lineAnnotations) {
    sections.push(
      '**Line annotations**',
      ...Object.entries(snippet.lineAnnotations).map(([line, annotation]) => `- Line ${line}: ${annotation}`)
    );
  }

  return sections.join('\n\n');
}

function renderTopic(topic) {
  const sections = [`## Topic ${topic.topicNumber}: ${topic.title}`];

  for (const paragraph of topic.explanation || []) {
    sections.push(paragraph);
  }

  if (topic.keyRules?.length) {
    sections.push('### Key rules', ...topic.keyRules.map(rule => `- ${rule}`));
  }

  if (topic.codeSnippet) {
    sections.push(codeBlock(topic.codeSnippet));
  }

  if (topic.pitfall) {
    sections.push(`> **Common pitfall:** ${topic.pitfall}`);
  }

  if (topic.quickCheck) {
    const answer = topic.quickCheck.options?.[topic.quickCheck.correctIndex];
    sections.push(
      '### Quick check',
      topic.quickCheck.question,
      ...(topic.quickCheck.options || []).map((option, index) => `${index + 1}. ${option}`),
      answer ? `**Answer:** ${answer}` : '',
      topic.quickCheck.explanation || ''
    );
  }

  return sections.filter(Boolean).join('\n\n');
}

function renderLesson(day) {
  const sections = [
    `# ${day.title}`,
    day.subtitle,
    day.overview
  ].filter(Boolean);

  for (const section of day.theoryContent || []) {
    sections.push(`## ${section.sectionTitle}`);
    sections.push(...(section.paragraphs || []));
    if (section.keyPoints?.length) {
      sections.push('### Key points', ...section.keyPoints.map(point => `- ${point}`));
    }
    if (section.pitfallWarning) {
      sections.push(`> **Watch out:** ${section.pitfallWarning}`);
    }
  }

  sections.push(...(day.topics || []).map(renderTopic));

  if (day.interactiveDiagram) {
    sections.push(
      `## ${day.interactiveDiagram.title}`,
      day.interactiveDiagram.caption,
      day.interactiveDiagram.data
        ? `\`\`\`json\n${JSON.stringify(day.interactiveDiagram.data, null, 2)}\n\`\`\``
        : ''
    );
  }

  for (const snippet of day.codeSnippets || []) {
    sections.push(codeBlock(snippet));
  }

  if (day.practiceChallenge) {
    const challenge = day.practiceChallenge;
    sections.push(`## Practice challenge: ${challenge.title}`);
    sections.push(...(challenge.instructions || []).map(instruction => `- ${instruction}`));
    if (challenge.starterCode) {
      sections.push('### Starter code', `\`\`\`text\n${challenge.starterCode}\n\`\`\``);
    }
    if (challenge.hints?.length) {
      sections.push('### Hints', ...challenge.hints.map((hint, index) => `${index + 1}. ${hint}`));
    }
    if (challenge.solutionCode) {
      sections.push('### Reference solution', `\`\`\`text\n${challenge.solutionCode}\n\`\`\``);
    }
  }

  if (day.keyTakeaways?.length) {
    sections.push('## Key takeaways', ...day.keyTakeaways.map(point => `- ${point}`));
  }

  return sections.filter(Boolean).join('\n\n');
}

function renderQuizQuestion(question) {
  const code = question.codeSnippet
    ? `\n\n\`\`\`\n${question.codeSnippet}\n\`\`\``
    : '';
  return `${question.question}${code}`;
}

function upsertCourse(course, settings, instructorId) {
  const totalMinutes = course.modules.reduce(
    (total, module) => total + module.days.reduce((week, day) => week + (day.durationMinutes || 0), 0),
    0
  );
  const learningObjectives = course.modules.map(module => module.description || module.theme);
  const completionRequirements = {
    requireAllModules: true,
    requirePassingQuizzes: true,
    minOverallScore: 70
  };
  const existing = queryOne('SELECT id FROM courses WHERE id = ?', [settings.id]);
  const values = [
    course.title,
    settings.slug,
    course.description,
    settings.thumbnail,
    settings.category,
    settings.level,
    instructorId,
    `${Math.max(1, Math.ceil(totalMinutes / 60))} hours`,
    199,
    299,
    1,
    JSON.stringify(learningObjectives),
    JSON.stringify(settings.prerequisites),
    JSON.stringify(completionRequirements),
    settings.id
  ];

  if (existing) {
    runQuery(
      `UPDATE courses
       SET title = ?, slug = ?, description = ?, thumbnail = ?, category = ?, level = ?,
           instructor_id = ?, estimated_duration = ?, price = ?, original_price = ?,
           is_published = ?, status = 'PUBLISHED', learning_objectives = ?, prerequisites = ?,
           completion_requirements = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      values
    );
  } else {
    runQuery(
      `INSERT INTO courses (
        title, slug, description, thumbnail, category, level, instructor_id,
        estimated_duration, price, original_price, is_published, learning_objectives,
        prerequisites, completion_requirements, id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')`,
      values
    );
  }

  if (instructorId) {
    runQuery(
      'INSERT OR IGNORE INTO course_instructors (course_id, instructor_id) VALUES (?, ?)',
      [settings.id, instructorId]
    );
  }
}

function upsertModule(courseId, module, previousModuleId) {
  const moduleId = `vx-${courseId}-${module.weekNumber}`;
  const totalMinutes = module.days.reduce((total, day) => total + (day.durationMinutes || 0), 0);
  const existing = queryOne('SELECT id FROM modules WHERE id = ?', [moduleId]);
  const values = [
    module.title,
    module.description || module.theme,
    module.weekNumber,
    `${Math.max(1, Math.ceil(totalMinutes / 60))} hours`,
    module.quiz.passingScorePercent || 70,
    previousModuleId,
    moduleId
  ];

  if (existing) {
    runQuery(
      `UPDATE modules
       SET title = ?, description = ?, order_index = ?, estimated_duration = ?,
           is_published = 1, completion_policy = 'POLICY_B_QUIZ', min_passing_score = ?,
           prerequisite_module_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      values
    );
  } else {
    runQuery(
      `INSERT INTO modules (
        id, course_id, title, description, order_index, estimated_duration,
        is_published, completion_policy, min_passing_score, prerequisite_module_id
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 'POLICY_B_QUIZ', ?, ?)`,
      [moduleId, courseId, ...values.slice(0, 4), values[4], previousModuleId]
    );
  }

  return moduleId;
}

function upsertLesson(moduleId, day, orderIndex) {
  const lessonId = `vx-${moduleId}-${day.dayNumber}`;
  const content = renderLesson(day);
  const takeaways = JSON.stringify(day.keyTakeaways || []);
  const readingTime = Math.max(3, Math.ceil(content.replace(/```[\s\S]*?```/g, ' ').trim().split(/\s+/).length / 225));
  const existing = queryOne('SELECT id, is_admin_modified FROM lessons WHERE id = ?', [lessonId]);

  if (existing?.is_admin_modified) {
    runQuery(
      `UPDATE lessons
       SET module_id = ?, duration_minutes = ?, order_index = ?, source_type = 'VEXOR_IMPORT',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [moduleId, day.durationMinutes || 15, orderIndex, lessonId]
    );
    return;
  }

  if (existing) {
    runQuery(
      `UPDATE lessons
       SET module_id = ?, title = ?, description = ?, lesson_type = 'CODE',
           text_content = ?, content_markdown = ?, duration_minutes = ?, reading_time_minutes = ?,
           key_takeaways = ?, order_index = ?, is_mandatory = 1, source_type = 'VEXOR_IMPORT',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        moduleId,
        day.title,
        day.overview || day.subtitle || day.title,
        content,
        content,
        day.durationMinutes || 15,
        readingTime,
        takeaways,
        orderIndex,
        lessonId
      ]
    );
  } else {
    runQuery(
      `INSERT INTO lessons (
        id, module_id, title, description, lesson_type, text_content, content_markdown,
        duration_minutes, reading_time_minutes, key_takeaways, order_index,
        is_mandatory, is_preview, is_admin_modified, source_type
      ) VALUES (?, ?, ?, ?, 'CODE', ?, ?, ?, ?, ?, ?, 1, ?, 0, 'VEXOR_IMPORT')`,
      [
        lessonId,
        moduleId,
        day.title,
        day.overview || day.subtitle || day.title,
        content,
        content,
        day.durationMinutes || 15,
        readingTime,
        takeaways,
        orderIndex,
        day.dayNumber === 1 ? 1 : 0
      ]
    );
  }
}

function upsertQuiz(moduleId, module) {
  const quiz = module.quiz;
  const quizId = `vx-${moduleId}-quiz`;
  const existing = queryOne('SELECT id FROM quizzes WHERE id = ?', [quizId]);

  if (existing) {
    runQuery(
      `UPDATE quizzes
       SET title = ?, description = ?, passing_percentage = ?, time_limit_minutes = 20,
           max_attempts = 3, is_required = 1
       WHERE id = ?`,
      [quiz.title, quiz.description, quiz.passingScorePercent || 70, quizId]
    );
  } else {
    runQuery(
      `INSERT INTO quizzes (
        id, module_id, title, description, passing_percentage,
        time_limit_minutes, max_attempts, is_required
      ) VALUES (?, ?, ?, ?, ?, 20, 3, 1)`,
      [quizId, moduleId, quiz.title, quiz.description, quiz.passingScorePercent || 70]
    );
  }

  for (const [questionIndex, question] of quiz.questions.entries()) {
    if (question.correctIndex < 0 || question.correctIndex >= question.options.length) {
      throw new Error(`Invalid correct answer index in source quiz question ${question.id}.`);
    }

    const questionId = `vx-${moduleId}-${question.id}`;
    const existingQuestion = queryOne('SELECT id FROM quiz_questions WHERE id = ?', [questionId]);
    const questionValues = [renderQuizQuestion(question), question.explanation || '', questionIndex + 1, questionId];

    if (existingQuestion) {
      runQuery(
        `UPDATE quiz_questions
         SET prompt = ?, question_type = 'SINGLE_CHOICE', marks = 1, explanation = ?,
             order_index = ?
         WHERE id = ?`,
        questionValues
      );
    } else {
      runQuery(
        `INSERT INTO quiz_questions (
          id, quiz_id, prompt, question_type, marks, explanation, order_index
        ) VALUES (?, ?, ?, 'SINGLE_CHOICE', 1, ?, ?)`,
        [questionId, quizId, questionValues[0], questionValues[1], questionValues[2]]
      );
    }

    for (const [optionIndex, optionText] of question.options.entries()) {
      const optionId = `vx-${moduleId}-${question.id}-option-${optionIndex + 1}`;
      const optionExists = queryOne('SELECT id FROM quiz_options WHERE id = ?', [optionId]);
      const optionValues = [optionText, optionIndex === question.correctIndex ? 1 : 0, optionIndex + 1, optionId];

      if (optionExists) {
        runQuery(
          'UPDATE quiz_options SET text = ?, is_correct = ?, order_index = ? WHERE id = ?',
          optionValues
        );
      } else {
        runQuery(
          `INSERT INTO quiz_options (id, question_id, text, is_correct, order_index)
           VALUES (?, ?, ?, ?, ?)`,
          [optionId, questionId, ...optionValues.slice(0, 3)]
        );
      }
    }
  }
}

export function syncVexorCourses() {
  return transaction(() => {
    const instructorId = queryOne('SELECT id FROM users WHERE id = ?', ['usr-instructor-1'])?.id || null;
    let courseCount = 0;
    let moduleCount = 0;
    let lessonCount = 0;
    let quizQuestionCount = 0;

    for (const course of sourceCourses) {
      const settings = courseSettings[course.id];
      if (!settings) {
        throw new Error(`Missing Codificator settings for imported course "${course.id}".`);
      }

      upsertCourse(course, settings, instructorId);
      courseCount++;

      let previousModuleId = null;
      for (const module of course.modules) {
        const moduleId = upsertModule(settings.id, module, previousModuleId);
        moduleCount++;

        for (const [lessonIndex, day] of module.days.entries()) {
          upsertLesson(moduleId, day, lessonIndex + 1);
          lessonCount++;
        }

        upsertQuiz(moduleId, module);
        quizQuestionCount += module.quiz.questions.length;
        previousModuleId = moduleId;
      }
    }

    return { courseCount, moduleCount, lessonCount, quizQuestionCount };
  });
}
