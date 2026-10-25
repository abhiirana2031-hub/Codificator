import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryAll, queryOne, runQuery, transaction } from '../db/db.js';
import { fullStackAssessments } from './assessmentCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

/**
 * Calculates estimated reading time in minutes (200-250 wpm) excluding code blocks.
 */
export function calculateReadingTime(text, minMinutes = 3) {
  if (!text) return 5;
  // Remove fenced code blocks
  const withoutCode = text.replace(/```[\s\S]*?```/g, ' ');
  // Remove markdown symbols and images
  const clean = withoutCode.replace(/!\[.*?\]\(.*?\)/g, ' ').replace(/[#*_`>~-]/g, ' ');
  const words = clean.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(minMinutes, Math.ceil(words / 225));
}

/**
 * Extracts 4-5 key takeaways from markdown text based on top headings or summary points.
 */
export function extractTakeaways(text, fallbackTitle) {
  const headings = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.match(/^#{2,4}\s+\*{0,2}(.*?)\*{0,2}$/);
    if (match) {
      const headingText = match[1].replace(/[*_`]/g, '').trim();
      if (headingText && !headings.includes(headingText) && headings.length < 5) {
        headings.push(headingText);
      }
    }
  }

  if (headings.length >= 3) {
    return headings.map(h => `Mastered foundational concepts and industry syntax for ${h}`);
  }

  return [
    `Comprehensive understanding of ${fallbackTitle}`,
    `Practical application and syntax demonstrations verified across real-world workflows`,
    `Performance considerations and best practices for modern production environments`,
    `Integration techniques with frontend and backend application layers`
  ];
}

/**
 * Imports and updates Full Stack Development curriculum using genuine digital notes.
 */
export function importFullStackNotes(options = {}) {
  const { dryRun = false } = options;
  const notesPath = path.join(rootDir, 'courses', 'Full Stack Development-Digital Notes.md');
  if (!fs.existsSync(notesPath)) {
    throw new Error(`Notes file not found at ${notesPath}`);
  }

  const rawContent = fs.readFileSync(notesPath, 'utf8');
  const lines = rawContent.split('\n');

  // Define semantic slice ranges for course-fullstack-web lessons
  const lessonSlices = [
    // Module 1: HTML5 Architecture
    {
      id: 'les-m1-1',
      moduleId: 'mod-fs-1',
      title: 'HTML Architecture, Elements & Document Hierarchy',
      startLine: 1,
      endLine: 498
    },
    {
      id: 'les-m1-2',
      moduleId: 'mod-fs-1',
      title: 'HTML Formatting, Headings & Text Semantics',
      startLine: 499,
      endLine: 1002
    },
    {
      id: 'les-m1-3',
      moduleId: 'mod-fs-1',
      title: 'HTML Tables, Lists & Document Structure',
      startLine: 1003,
      endLine: 1386
    },
    {
      id: 'les-m1-4',
      moduleId: 'mod-fs-1',
      title: 'HTML Forms, Inputs & Accessible Controls',
      startLine: 1387,
      endLine: 3049
    },

    // Module 2: Unix Shell & Git Version Control
    {
      id: 'les-m2-1',
      moduleId: 'mod-fs-2',
      title: 'Unix Commands & Terminal Navigation',
      startLine: 3050,
      endLine: 3173
    },
    {
      id: 'les-m2-2',
      moduleId: 'mod-fs-2',
      title: 'Git Version Control Architecture & Local Workflows',
      startLine: 3174,
      endLine: 3966
    },
    {
      id: 'les-m2-3',
      moduleId: 'mod-fs-2',
      title: 'GitHub Collaboration, Remote Branches & Pull Requests',
      startLine: 3967,
      endLine: 4212
    },

    // Module 3: Modern CSS & Responsive Styling
    {
      id: 'les-m3-1',
      moduleId: 'mod-fs-3',
      title: 'CSS Syntax, Selectors & Cascade Priority',
      startLine: 4213,
      endLine: 4933
    },
    {
      id: 'les-m3-2',
      moduleId: 'mod-fs-3',
      title: 'Box Model, Margins, Borders & Spacing',
      startLine: 4934,
      endLine: 5557
    },
    {
      id: 'les-m3-3',
      moduleId: 'mod-fs-3',
      title: 'CSS Display, Buttons, Cursors & Component Design',
      startLine: 5558,
      endLine: 6700
    },

    // Module 4: Client-Side Scripting with JavaScript & jQuery
    {
      id: 'les-m4-1',
      moduleId: 'mod-fs-4',
      title: 'JavaScript Syntax, Variables, Data Types & Scope',
      startLine: 6701,
      endLine: 7207
    },
    {
      id: 'les-m4-2',
      moduleId: 'mod-fs-4',
      title: 'Memory Management, Functions & DOM Manipulation',
      startLine: 7208,
      endLine: 7705
    },
    {
      id: 'les-m4-3',
      moduleId: 'mod-fs-4',
      title: 'Event Handling & jQuery Library Foundations',
      startLine: 7706,
      endLine: 7768
    },

    // Module 5: Modern Frontend with React JS
    {
      id: 'les-m5-1',
      moduleId: 'mod-fs-5',
      title: 'React Introduction, Virtual DOM & Project Setup',
      startLine: 7769,
      endLine: 8149
    },
    {
      id: 'les-m5-2',
      moduleId: 'mod-fs-5',
      title: 'Components, Props, State & Virtual DOM Architecture',
      startLine: 8150,
      endLine: 8518
    },
    {
      id: 'les-m5-3',
      moduleId: 'mod-fs-5',
      title: 'Redux Data Flow & Single Page Architecture',
      startLine: 8519,
      endLine: 8798
    },

    // Module 6: Backend Engineering, Spring Boot & Database Persistence
    {
      id: 'les-m6-1',
      moduleId: 'mod-fs-6',
      title: 'Java Web Development, MVC & Spring Services',
      startLine: 8799,
      endLine: 10525
    },
    {
      id: 'les-m6-2',
      moduleId: 'mod-fs-6',
      title: 'Relational Database Design, SQL & Cloud Deployment',
      startLine: 10526,
      endLine: 11060
    }
  ];

  const results = [];

  for (const item of lessonSlices) {
    const sliceLines = lines.slice(item.startLine - 1, item.endLine);
    const textContent = sliceLines.join('\n').trim();
    const readingTime = calculateReadingTime(textContent);
    const takeaways = extractTakeaways(textContent, item.title);
    const wordCount = textContent.replace(/```[\s\S]*?```/g, ' ').trim().split(/\s+/).length;

    results.push({
      lessonId: item.id,
      moduleId: item.moduleId,
      title: item.title,
      startLine: item.startLine,
      endLine: item.endLine,
      wordCount,
      readingTimeMinutes: readingTime,
      keyTakeaways: takeaways,
      textContent
    });

    if (!dryRun) {
      if (!textContent || textContent.length < 10) {
        console.warn(`[CurriculumImporter] Warning: Source content for ${item.id} is empty or invalid. Skipping.`);
        continue;
      }

      // Check if lesson exists and whether it is admin-managed
      const existing = queryOne('SELECT id, is_admin_modified, content_markdown, text_content FROM lessons WHERE id = ?', [item.id]);
      if (existing) {
        if (existing.is_admin_modified && !options.force) {
          console.log(`[CurriculumImporter] Preserving admin-managed lesson: ${item.id} (${item.title}). Skipped.`);
          results.push({
            lessonId: item.id,
            status: 'SKIPPED_ADMIN_MANAGED'
          });
          continue;
        }

        runQuery(
          `UPDATE lessons
           SET title = ?,
               text_content = ?,
               content_markdown = COALESCE(content_markdown, ?),
               reading_time_minutes = ?,
               key_takeaways = ?,
               lesson_type = 'TEXT',
               video_url = NULL,
               video_asset_id = NULL,
               source_type = 'IMPORTER',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            item.title,
            textContent,
            textContent,
            readingTime,
            JSON.stringify(takeaways),
            item.id
          ]
        );
      } else {
        // Verify target module exists in DB before inserting
        const modExists = queryOne('SELECT id FROM modules WHERE id = ?', [item.moduleId]);
        if (!modExists) {
          console.warn(`[CurriculumImporter] Module ${item.moduleId} does not exist in DB. Skipping insert of ${item.id}.`);
          continue;
        }

        // Insert new lesson
        runQuery(
          `INSERT INTO lessons (
            id, module_id, title, description, lesson_type,
            text_content, content_markdown, duration_minutes, reading_time_minutes,
            key_takeaways, order_index, is_mandatory, is_admin_modified, source_type
          ) VALUES (?, ?, ?, ?, 'TEXT', ?, ?, ?, ?, ?, 1, 1, 0, 'IMPORTER')`,
          [
            item.id,
            item.moduleId,
            item.title,
            `Comprehensive digital notes covering ${item.title}.`,
            textContent,
            textContent,
            readingTime,
            readingTime,
            JSON.stringify(takeaways)
          ]
        );
      }
    }
  }

  if (!dryRun) {
    // Clean up any legacy video stubs in course-fullstack-web not part of authentic digital notes,
    // but strictly preserve any lessons created/modified by an administrator.
    const validIds = lessonSlices.map(s => `'${s.id}'`).join(', ');
    runQuery(
      `DELETE FROM lessons
       WHERE module_id IN (SELECT id FROM modules WHERE course_id = 'course-fullstack-web')
         AND (is_admin_modified IS NULL OR is_admin_modified = 0)
         AND id NOT IN (${validIds})`
    );
  }

  return {
    courseId: 'course-fullstack-web',
    totalLessons: results.length,
    totalLinesProcessed: lines.length,
    lessons: results.map(r => ({
      lessonId: r.lessonId,
      moduleId: r.moduleId,
      title: r.title,
      readingTimeMinutes: r.readingTimeMinutes,
      wordCount: r.wordCount,
      takeawaysCount: r.keyTakeaways.length
    }))
  };
}

/**
 * Synchronizes module metadata and seeds all comprehensive curriculum assessments.
 */
export function syncCurriculumAssessments() {
  const moduleMetadata = [
    {
      id: 'mod-fs-1',
      title: 'Module 1: HTML5 Architecture & Semantic Markup',
      description: 'Semantic markup, accessibility standards, document anatomy, and form structures.'
    },
    {
      id: 'mod-fs-2',
      title: 'Module 2: Unix Shell & Git Version Control',
      description: 'Terminal navigation, file system operations, Git commit graphs, branching, and GitHub workflows.'
    },
    {
      id: 'mod-fs-3',
      title: 'Module 3: Modern CSS & Responsive Design',
      description: 'Box model, CSS Grid, Flexbox, typography, cascade specificity, and responsive layouts.'
    },
    {
      id: 'mod-fs-4',
      title: 'Module 4: JavaScript Core & DOM Manipulation',
      description: 'Execution context, variables, scope, closures, DOM tree manipulation, and event handling.'
    },
    {
      id: 'mod-fs-5',
      title: 'Module 5: React.js & Frontend State Management',
      description: 'Virtual DOM reconciliation, components, props, hooks lifecycle, and Redux state architecture.'
    },
    {
      id: 'mod-fs-6',
      title: 'Module 6: Backend Services, Databases & Cloud Deployment',
      description: 'MVC architecture, Java/Spring services, SQL relational modeling, and production deployment.'
    }
  ];

  return transaction(() => {
    // 1. Update module titles & descriptions
    for (const m of moduleMetadata) {
      runQuery(
        'UPDATE modules SET title = ?, description = ? WHERE id = ?',
        [m.title, m.description, m.id]
      );
    }

    // 2. Sync all assessments
    const allAssessments = fullStackAssessments;
    for (const quiz of allAssessments) {
      const moduleExists = queryOne('SELECT id FROM modules WHERE id = ?', [quiz.moduleId]);
      if (!moduleExists) {
        continue;
      }

      const existingQuiz = queryOne('SELECT id FROM quizzes WHERE id = ?', [quiz.id]);
      if (existingQuiz) {
        runQuery(
          `UPDATE quizzes
           SET title = ?, description = ?, passing_percentage = ?, time_limit_minutes = ?, max_attempts = ?
           WHERE id = ?`,
          [quiz.title, quiz.description, quiz.passing_percentage, quiz.time_limit_minutes, quiz.max_attempts, quiz.id]
        );
      } else {
        runQuery(
          `INSERT INTO quizzes (
            id, module_id, title, description, passing_percentage, time_limit_minutes, max_attempts, is_required
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [quiz.id, quiz.moduleId, quiz.title, quiz.description, quiz.passing_percentage, quiz.time_limit_minutes, quiz.max_attempts]
        );
      }

      for (let qIdx = 0; qIdx < quiz.questions.length; qIdx++) {
        const q = quiz.questions[qIdx];
        const existingQ = queryOne('SELECT id FROM quiz_questions WHERE id = ?', [q.id]);
        if (existingQ) {
          runQuery(
            `UPDATE quiz_questions
             SET prompt = ?, question_type = ?, marks = ?, explanation = ?, concept_to_review = ?, order_index = ?
             WHERE id = ?`,
            [q.prompt, q.question_type, q.marks, q.explanation, q.concept_to_review || null, qIdx + 1, q.id]
          );
        } else {
          runQuery(
            `INSERT INTO quiz_questions (
              id, quiz_id, prompt, question_type, marks, explanation, concept_to_review, order_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [q.id, quiz.id, q.prompt, q.question_type, q.marks, q.explanation, q.concept_to_review || null, qIdx + 1]
          );
        }

        // Sync options for question
        for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
          const opt = q.options[oIdx];
          const existingOpt = queryOne('SELECT id FROM quiz_options WHERE id = ?', [opt.id]);
          if (existingOpt) {
            runQuery(
              `UPDATE quiz_options
               SET text = ?, is_correct = ?, order_index = ?
               WHERE id = ?`,
              [opt.text, opt.is_correct ? 1 : 0, oIdx + 1, opt.id]
            );
          } else {
            runQuery(
              `INSERT INTO quiz_options (id, question_id, text, is_correct, order_index)
               VALUES (?, ?, ?, ?, ?)`,
              [opt.id, q.id, opt.text, opt.is_correct ? 1 : 0, oIdx + 1]
            );
          }
        }
      }
    }

    return {
      success: true,
      modulesUpdated: moduleMetadata.length,
      quizzesSynced: allAssessments.length
    };
  });
}

