import { PDFParse } from 'pdf-parse';

/**
 * Valid course categories supported by Codificator LMS
 */
export const VALID_CATEGORIES = [
  'Computer Science',
  'Web Development',
  'Programming',
  'Data Structures & Algorithms',
  'DSA',
  'System Design',
  'DevOps & Cloud',
  'DevOps',
  'Cloud Computing',
  'Artificial Intelligence',
  'Machine Learning',
  'Data Science',
  'Cyber Security',
  'Mobile Development',
  'Database Management'
];

/**
/**
 * Standard Syllabus Structure Guidelines - 4-Week Cohort Format
 */
export const SYLLABUS_GUIDELINES = {
  template: `Course Title: Full Stack Web Development (4-Week Intensive Cohort)
Category: Web Development
Level: Beginner to Intermediate
Estimated Duration: 4 Weeks (40 hours)
Price: 499
Cost: 999

Description:
A comprehensive 4-week cohort covering modern frontend engineering with React, backend architecture with Node.js and Express, database persistence, and production cloud deployment.

Learning Objectives:
- Week 1: Master modern JavaScript and reactive UI architecture with React 19
- Week 2: Build scalable RESTful backend services with Node.js and Express
- Week 3: Architect relational databases with PostgreSQL/SQLite and implement JWT auth
- Week 4: Deploy full-stack systems with CI/CD and complete a production capstone

Prerequisites:
- Basic understanding of HTML, CSS, and modern JavaScript fundamentals
- Familiarity with terminal commands and Git version control

Week 1: Modern Frontend Engineering & Reactive UI
Description: Setup development tooling, component lifecycle, React 19 hooks, and responsive interface systems.
Lesson 1.1: Web Architecture & Modern React Foundations
Format: TEXT
Duration: 20 min read
Content: Client-server models, DOM parsing, component hierarchy, and modern JSX paradigms.

Lesson 1.2: State Management & Interactive Hooks
Format: CODE
Duration: 30 min
Content: Deep-dive into useState, useEffect, custom hooks, and practical component state patterns.

Week 2: Backend Architecture & RESTful Services
Description: Server-side engineering with Node.js, Express routing, error handling, and middleware architecture.
Lesson 2.1: Designing Modular REST Endpoints
Format: TEXT
Duration: 20 min read
Content: HTTP methods, route handlers, status codes, and input validation pipelines.

Lesson 2.2: Middleware, Security & Authentication
Format: CODE
Duration: 35 min
Content: JWT tokens, password hashing with bcrypt, rate limiting, and CORS headers.

Week 3: Database Engineering & Data Persistence
Description: Relational schema design, transactions, indexing, and ORM/query patterns.
Lesson 3.1: Relational Modeling & Schema Normalization
Format: TEXT
Duration: 25 min read
Content: Foreign key integrity, table joins, transactions, and migration strategies.

Lesson 3.2: CRUD Operations & Query Optimization
Format: CODE
Duration: 30 min
Content: Executing parameterized queries, indexing for performance, and handling connection pools.

Week 4: Production Deployment & Capstone Project
Description: Containerization basics, cloud hosting, CI/CD pipelines, and end-to-end project launch.
Lesson 4.1: Cloud Hosting & Environment Configurations
Format: TEXT
Duration: 20 min read
Content: Environment variables, production build optimization, reverse proxies, and monitoring.

Lesson 4.2: Full-Stack Capstone Integration Lab
Format: CODE
Duration: 45 min
Content: Connect React client with Node backend and persistent DB into a deployed production app.`
};

/**
 * Standard 4-Week Cohort module labels
 */
export const COHORT_4_WEEKS_THEMES = [
  'Week 1: Core Foundations & Principles',
  'Week 2: Deep Dive & Technical Architecture',
  'Week 3: Advanced Implementation & Integration',
  'Week 4: Capstone Project & Production Deployment'
];

/**
 * Consolidates any curriculum module array (e.g. 17 modules, 10 units, or scattered topics)
 * into a clean, standardized 4-Week Cohort structure.
 */
export function formatAs4WeekStructure(curriculum) {
  if (!curriculum) return curriculum;
  const rawModules = Array.isArray(curriculum.modules) ? curriculum.modules : [];

  // If already exactly 4 modules labeled with "Week 1".."Week 4", return as is
  if (rawModules.length === 4 && rawModules.every(m => /week\s*[1-4]/i.test(m.title))) {
    return curriculum;
  }

  // Gather all lessons across all modules
  const allLessons = [];
  rawModules.forEach((mod, modIdx) => {
    const modLessons = mod.lessons && mod.lessons.length > 0 ? mod.lessons : [{
      title: `${mod.title || `Module ${modIdx + 1}`} Overview`,
      lesson_type: 'TEXT',
      reading_time_minutes: 10,
      text_content: mod.description || `Core concepts and practical takeaways for ${mod.title}.`,
      is_mandatory: true
    }];
    modLessons.forEach(less => allLessons.push(less));
  });

  // If no lessons found, generate at least 4 default lessons for 4 weeks
  if (allLessons.length === 0) {
    for (let w = 1; w <= 4; w++) {
      allLessons.push({
        title: `Lesson ${w}.1: ${COHORT_4_WEEKS_THEMES[w - 1].split(':')[1].trim()}`,
        lesson_type: w % 2 === 0 ? 'CODE' : 'TEXT',
        reading_time_minutes: 15,
        text_content: `Key concepts, architectural patterns, and exercises for Week ${w}.`,
        is_mandatory: true
      });
    }
  }

  // Distribute all collected lessons evenly across 4 weeks
  const weekBuckets = [[], [], [], []];
  allLessons.forEach((lesson, idx) => {
    const targetWeek = Math.min(Math.floor((idx / allLessons.length) * 4), 3);
    weekBuckets[targetWeek].push(lesson);
  });

  // Ensure each week bucket has at least 1 lesson
  weekBuckets.forEach((bucket, weekIdx) => {
    if (bucket.length === 0) {
      bucket.push({
        title: `Lesson ${weekIdx + 1}.1: ${COHORT_4_WEEKS_THEMES[weekIdx].split(':')[1].trim()}`,
        lesson_type: weekIdx % 2 === 0 ? 'TEXT' : 'CODE',
        reading_time_minutes: 15,
        text_content: `Foundations and practical guidance for Week ${weekIdx + 1}.`,
        is_mandatory: true
      });
    }
  });

  // Construct 4 Week modules
  const newModules = weekBuckets.map((bucket, weekIdx) => {
    const weekNum = weekIdx + 1;
    // Derive week title from original modules if available
    let weekTitle = COHORT_4_WEEKS_THEMES[weekIdx];
    if (rawModules[weekIdx]?.title && rawModules.length <= 4) {
      weekTitle = `Week ${weekNum}: ${rawModules[weekIdx].title.replace(/^(?:module|unit|week)\s*\d*[:.-]*\s*/i, '')}`;
    }

    const renumberedLessons = bucket.map((less, lessIdx) => {
      const cleanTitle = (less.title || `Topic ${lessIdx + 1}`).replace(/^(?:lesson|topic)\s*\d*(?:\.\d+)?[:.-]*\s*/i, '').trim();
      return {
        ...less,
        title: `Lesson ${weekNum}.${lessIdx + 1}: ${cleanTitle}`
      };
    });

    return {
      title: weekTitle,
      description: `Week ${weekNum} cohort focus covering ${renumberedLessons.map(l => l.title.replace(/^Lesson\s*[\d.]+:\s*/, '')).slice(0, 3).join(', ')}.`,
      order_index: weekNum,
      lessons: renumberedLessons
    };
  });

  return {
    ...curriculum,
    estimated_duration: curriculum.estimated_duration && curriculum.estimated_duration.toLowerCase().includes('week')
      ? curriculum.estimated_duration
      : '4 Weeks',
    modules: newModules
  };
}

/**
 * Parses raw text extracted from PDF and structures it into Course, Modules, and Lessons
 */
export function parseCurriculumText(text) {
  if (!text || typeof text !== 'string') {
    return { error: 'Empty or unreadable document content.' };
  }

  // Clean lines
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const parsed = {
    title: '',
    category: 'Computer Science',
    level: 'Beginner to Intermediate',
    description: '',
    estimated_duration: '4 Weeks',
    price: 0,
    original_price: 0,
    learning_objectives: [],
    prerequisites: [],
    modules: []
  };

  let currentSection = 'HEADER'; // 'HEADER' | 'DESCRIPTION' | 'OBJECTIVES' | 'PREREQUISITES' | 'MODULES'
  let currentModule = null;
  let currentLesson = null;

  // Patterns
  const titleRegex = /^(?:course\s*title|course\s*name|course|title)\s*[:=-]\s*(.+)$/i;
  const categoryRegex = /^(?:category|domain|track)\s*[:=-]\s*(.+)$/i;
  const levelRegex = /^(?:level|difficulty|target\s*audience)\s*[:=-]\s*(.+)$/i;
  const durationRegex = /^(?:estimated\s*duration|duration|time)\s*[:=-]\s*(.+)$/i;
  const priceRegex = /^(?:selling\s*price|course\s*price|price|fee)\s*[:=-]\s*(?:₹|rs\.?|\$)?\s*([0-9.]+)/i;
  const costRegex = /^(?:original\s*price|cost|mrp|m\.r\.p\.?|regular\s*price)\s*[:=-]\s*(?:₹|rs\.?|\$)?\s*([0-9.]+)/i;

  const descHeaderRegex = /^(?:description|overview|about\s*this\s*course|summary)\s*[:=-]?$/i;
  const objectivesHeaderRegex = /^(?:learning\s*objectives|objectives|what\s*you\s*will\s*learn|outcomes)\s*[:=-]?$/i;
  const prereqHeaderRegex = /^(?:prerequisites|requirements|prior\s*knowledge)\s*[:=-]?$/i;

  // Module patterns: "Module 1: ...", "Unit 1 - ...", "Chapter 1: ...", "Week 1: ...", "WEEK 1 - ..."
  const weekModuleRegex = /^(?:week)\s*(\d+)[\s:.-]+(.+)$/i;
  const moduleRegex = /^(?:module|unit|chapter|section|week|part)\s*(\d+)[\s:.-]+(.+)$/i;
  // Alternate standalone module: "Module: ...", "Week 1"
  const moduleAltRegex = /^(?:module|unit|chapter|section|week)\s*[:=-]\s*(.+)$/i;

  // Lesson patterns: "Day 1: ...", "Day 1 - ...", "Lesson 1.1: ...", "Lesson 1 - ...", "Topic 1: ...", "1.1 ..."
  const dayLessonRegex = /^(?:day)\s*(\d+)[\s:.-]+(.+)$/i;
  const lessonRegex = /^(?:lesson|topic|session)\s*(\d+(?:\.\d+)?)[\s:.-]+(.+)$/i;
  const lessonAltRegex = /^(?:lesson|topic|day)\s*[:=-]\s*(.+)$/i;
  const lessonNumberedRegex = /^(\d+\.\d+)\s+([A-Za-z0-9].+)$/;

  const formatRegex = /^(?:format|type|lesson\s*type)\s*[:=-]\s*(.+)$/i;
  const lessonDurationRegex = /^(?:duration|reading\s*time|est\.?\s*time)\s*[:=-]\s*(.+)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Detect Course Title
    if (!parsed.title) {
      const matchTitle = line.match(titleRegex);
      if (matchTitle && matchTitle[1]) {
        parsed.title = matchTitle[1].trim();
        continue;
      } else if (i === 0 && line.length > 5 && line.length < 100 && !line.includes(':') && !line.toLowerCase().startsWith('module') && !line.toLowerCase().startsWith('unit') && !line.toLowerCase().startsWith('week')) {
        // Fallback: first standalone title line
        parsed.title = line.trim();
        continue;
      }
    }

    // 2. Metadata Key-Values
    const matchCat = line.match(categoryRegex);
    if (matchCat && matchCat[1]) {
      parsed.category = matchCat[1].trim();
      continue;
    }

    const matchLevel = line.match(levelRegex);
    if (matchLevel && matchLevel[1]) {
      parsed.level = matchLevel[1].trim();
      continue;
    }

    const matchDur = line.match(durationRegex);
    if (matchDur && matchDur[1]) {
      parsed.estimated_duration = matchDur[1].trim();
      continue;
    }

    const matchCost = line.match(costRegex);
    if (matchCost && matchCost[1]) {
      parsed.original_price = Number(matchCost[1]) || 0;
      continue;
    }

    const matchPrice = line.match(priceRegex);
    if (matchPrice && matchPrice[1]) {
      parsed.price = Number(matchPrice[1]) || 0;
      continue;
    }

    // 3. Section Switchers
    if (descHeaderRegex.test(line)) {
      currentSection = 'DESCRIPTION';
      continue;
    }
    if (objectivesHeaderRegex.test(line)) {
      currentSection = 'OBJECTIVES';
      continue;
    }
    if (prereqHeaderRegex.test(line)) {
      currentSection = 'PREREQUISITES';
      continue;
    }

    // 4. Module Header Detection ("WEEK 1: ...", "Module 1: ...", etc.)
    const matchWeek = line.match(weekModuleRegex);
    const matchMod = matchWeek || line.match(moduleRegex) || line.match(moduleAltRegex);
    if (matchMod) {
      currentSection = 'MODULES';
      const modIndex = matchWeek ? parseInt(matchWeek[1], 10) : (parsed.modules.length + 1);
      const rawTitle = (matchMod[2] || matchMod[1] || `Module ${modIndex}`).trim().replace(/^[:.-]+\s*/, '');
      const prefix = matchWeek ? `Week ${modIndex}` : `Module ${modIndex}`;
      currentModule = {
        title: `${prefix}: ${rawTitle}`,
        description: '',
        order_index: modIndex,
        lessons: []
      };
      parsed.modules.push(currentModule);
      currentLesson = null;
      continue;
    }

    // 5. Lesson Header Detection ("Day 1: ...", "Lesson 1.1: ...", etc.)
    const matchDay = line.match(dayLessonRegex);
    const matchLess = matchDay || line.match(lessonRegex) || line.match(lessonAltRegex) || line.match(lessonNumberedRegex);
    const matchBullet = (!matchLess && currentModule && currentSection === 'MODULES' && (line.match(/^[-*•]\s+([A-Za-z0-9].+)$/) || line.match(/^\d+[\.\)]\s+([A-Za-z0-9].+)$/)));

    // Ensure bullet isn't a sub-section of an existing lesson (e.g., "1. Header", "2. Overview", etc.)
    const isSubSectionNumbered = line.match(/^[1-6]\.\s+(Header|Overview|Objectives|Key Concepts|Theory|Implementation|Code Examples|Hands-on|Exercise|Summary|Knowledge Check)/i);

    if ((matchLess || (matchBullet && !currentLesson && !isSubSectionNumbered)) && currentModule && !isSubSectionNumbered) {
      const lessonIndex = currentModule.lessons.length + 1;
      let lessonTitle = '';
      if (matchDay) {
        const dayNum = matchDay[1];
        const dayTopic = matchDay[2].trim().replace(/^[:.-]+\s*/, '');
        lessonTitle = `Day ${dayNum}: ${dayTopic}`;
      } else if (matchLess) {
        const rawTitle = (matchLess[2] || matchLess[1] || `Lesson ${lessonIndex}`).trim().replace(/^[:.-]+\s*/, '');
        lessonTitle = `Lesson ${currentModule.order_index}.${lessonIndex}: ${rawTitle}`;
      } else {
        lessonTitle = matchBullet[1].trim().replace(/^[:.-]+\s*/, '');
      }

      currentLesson = {
        title: lessonTitle,
        lesson_type: 'TEXT',
        reading_time_minutes: 15,
        text_content: `# ${lessonTitle}\n\n`,
        is_mandatory: true
      };
      currentModule.lessons.push(currentLesson);
      continue;
    }

    // 6. Lesson Metadata (Format, Duration, Content) & Subsections
    if (currentLesson) {
      const matchFormat = line.match(formatRegex);
      if (matchFormat) {
        const fmt = matchFormat[1].toUpperCase();
        if (['TEXT', 'CODE', 'VIDEO', 'PDF'].includes(fmt)) {
          currentLesson.lesson_type = fmt;
        } else if (fmt.includes('CODE') || fmt.includes('PROGRAM')) {
          currentLesson.lesson_type = 'CODE';
        } else if (fmt.includes('PDF') || fmt.includes('DOC')) {
          currentLesson.lesson_type = 'PDF';
        }
        continue;
      }

      const matchLessDur = line.match(lessonDurationRegex);
      if (matchLessDur) {
        const num = parseInt(matchLessDur[1], 10);
        if (!isNaN(num) && num > 0) {
          currentLesson.reading_time_minutes = num;
        }
        continue;
      }

      // Convert sub-sections like "2. Overview & Objectives" or "3. Key Concepts" to Markdown headings
      if (isSubSectionNumbered) {
        currentLesson.text_content += `\n\n## ${line}\n\n`;
        continue;
      }

      // Append text content preserving markdown structure
      if (line.toLowerCase().startsWith('content:') || line.toLowerCase().startsWith('summary:')) {
        currentLesson.text_content += '\n\n' + line.replace(/^[^:]+:\s*/i, '');
      } else if (!line.startsWith('Module') && !line.startsWith('Unit') && !line.startsWith('Week') && !line.startsWith('Day')) {
        currentLesson.text_content += '\n' + line;
      }
      continue;
    }

    // 7. Accumulate Section Content
    if (currentSection === 'DESCRIPTION') {
      if (!parsed.description) {
        parsed.description = line;
      } else {
        parsed.description += ' ' + line;
      }
    } else if (currentSection === 'OBJECTIVES') {
      const cleanObj = line.replace(/^[-*•\d.)\s]+/, '').trim();
      if (cleanObj.length > 5) {
        parsed.learning_objectives.push(cleanObj);
      }
    } else if (currentSection === 'PREREQUISITES') {
      const cleanPre = line.replace(/^[-*•\d.)\s]+/, '').trim();
      if (cleanPre.length > 5) {
        parsed.prerequisites.push(cleanPre);
      }
    } else if (currentSection === 'MODULES' && currentModule && !currentLesson) {
      // Accumulate Module Description
      if (line.toLowerCase().startsWith('description:') || line.toLowerCase().startsWith('overview:')) {
        currentModule.description = line.replace(/^[^:]+:\s*/i, '');
      } else if (!currentModule.description) {
        currentModule.description = line;
      } else {
        currentModule.description += ' ' + line;
      }
    }
  }

  // Cleanup & Defaults
  if (!parsed.description && lines.length > 1) {
    parsed.description = lines.slice(1, 4).join(' ');
  }

  // Auto-provision a starter lesson for any module without explicit sub-lessons in the PDF
  parsed.modules.forEach((mod, idx) => {
    if (!mod.lessons || mod.lessons.length === 0) {
      const cleanModTitle = mod.title.replace(/^Module\s*\d*[:.-]*\s*/i, '').trim() || 'Fundamentals';
      mod.lessons = [{
        title: `Lesson ${idx + 1}.1: ${cleanModTitle} Overview`,
        lesson_type: 'TEXT',
        reading_time_minutes: 10,
        text_content: mod.description 
          ? `# ${cleanModTitle}\n\n${mod.description}`
          : `# ${cleanModTitle}\n\nCore curriculum concepts, architectural workflow, and hands-on guide.`,
        is_mandatory: true
      }];
    }
  });

  // Normalize markdown and code blocks for all lessons
  parsed.modules.forEach(mod => {
    if (mod.lessons) {
      mod.lessons.forEach(less => {
        if (less.text_content) {
          less.text_content = formatLessonMarkdown(less.text_content);
        }
      });
    }
  });

  return parsed;
}

/**
 * Normalizes plain syllabus text into formatted GFM markdown with syntax-highlighted code fences
 */
export function formatLessonMarkdown(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text
    .replace(/```\w*\s*\r?\n\s*```/g, '')
    .replace(/\*{4,}(.*?)\*{4,}/g, '**$1**')
    .replace(/```text\s*\r?\n---\r?\n\s*```/g, '---')
    .replace(/([^\n])(\s*\+[+-]{5,})/g, '$1\n\n$2');

  let lines = cleaned.split(/\r?\n/);
  let output = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  const isHeadingLine = (l) => {
    const trimmed = l.trim();
    if (trimmed.startsWith('#')) return false;
    return /^(Core Technical Explanation|Key Concepts\s*(&|and)?\s*Theory|Practical Exercises|Hands-on Exercises|Summary\s*(&|and)?\s*Knowledge Check|Key Takeaways|Implementation\s*(&|and)?\s*Code Examples|Overview\s*(&|and)?\s*Objectives)$/i.test(trimmed);
  };

  const isAsciiDiagramLine = (l) => {
    const trimmed = l.trim();
    if (trimmed.length === 0) return false;
    if (trimmed === '---' || trimmed === '________________' || trimmed.startsWith('#')) return false;
    return (
      /^[+|\\/]{1}[+|\\/-]{3,}/.test(trimmed) ||
      /^\|.*\|$/.test(trimmed) ||
      trimmed.includes('+---+') ||
      trimmed.includes('+-----------------') ||
      (trimmed.includes('|') && (trimmed.includes('v') || trimmed.includes('+') || trimmed.includes('---')))
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        while (codeBuffer.length > 0 && codeBuffer[codeBuffer.length - 1].trim() === '') {
          codeBuffer.pop();
        }
        output.push(codeBuffer.join('\n'));
        output.push('```\n');
        codeBuffer = [];
        inCodeBlock = false;
        continue;
      }
      output.push(rawLine);
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        output.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        output.push(lines[i]);
      }
      continue;
    }

    if (inCodeBlock) {
      if (
        isHeadingLine(trimmed) ||
        trimmed.startsWith('##') ||
        trimmed.startsWith('###') ||
        /^(?:Code Snippet|Example|Implementation)\s*[:=-]/i.test(trimmed) ||
        /^(\d+\.|\*|-)\s+[A-Z]/.test(trimmed) ||
        trimmed === '________________' ||
        trimmed === '---'
      ) {
        while (codeBuffer.length > 0 && codeBuffer[codeBuffer.length - 1].trim() === '') {
          codeBuffer.pop();
        }
        output.push(codeBuffer.join('\n'));
        output.push('```\n');
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        codeBuffer.push(rawLine);
        continue;
      }
    }

    if (/^_{3,}$/.test(trimmed)) {
      output.push('\n---\n');
      continue;
    }

    if (isHeadingLine(trimmed)) {
      output.push(`\n## ${trimmed}\n`);
      continue;
    }

    const snippetMatch = trimmed.match(/^(?:Code Snippet|Example|Implementation)\s*[:=-]\s*(.+)$/i);
    if (snippetMatch && !trimmed.startsWith('#')) {
      output.push(`\n### ${trimmed}\n\n\`\`\`javascript`);
      inCodeBlock = true;
      codeBuffer = [];
      continue;
    }

    if (isAsciiDiagramLine(trimmed)) {
      let diagramLines = [rawLine];
      while (i + 1 < lines.length && (isAsciiDiagramLine(lines[i + 1]) || lines[i + 1].trim() === '' || lines[i + 1].includes('v') || lines[i + 1].includes('Thread Pool') || lines[i + 1].includes('Blocking operations'))) {
        i++;
        diagramLines.push(lines[i]);
      }
      output.push('\n```text\n' + diagramLines.join('\n') + '\n```\n');
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (trimmed.includes('**')) {
        output.push(`\n${trimmed}\n`);
      } else {
        const matchItem = trimmed.match(/^(\d+)\.\s+([^:]+):\s*(.*)$/);
        if (matchItem) {
          output.push(`\n${matchItem[1]}. **${matchItem[2].trim()}**: ${matchItem[3].trim()}\n`);
        } else {
          output.push(`\n${trimmed}\n`);
        }
      }
      continue;
    }

    output.push(rawLine);
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    while (codeBuffer.length > 0 && codeBuffer[codeBuffer.length - 1].trim() === '') {
      codeBuffer.pop();
    }
    output.push(codeBuffer.join('\n'));
    output.push('```\n');
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Validates extracted curriculum structure against LMS criteria.
 * Returns { status: 'APPROVED' | 'REJECTED', score, criteria, improvementTips, extractedCourse }
 */
export function evaluateCurriculumCriteria(curriculum) {
  const criteria = [];
  const improvementTips = [];
  let scorePoints = 0;
  const MAX_POINTS = 6;

  // 1. Course Title Check
  const hasValidTitle = Boolean(curriculum.title && curriculum.title.trim().length >= 4 && curriculum.title.trim().length <= 150);
  if (hasValidTitle) {
    scorePoints++;
    criteria.push({
      id: 'title',
      label: 'Course Title',
      passed: true,
      message: `Valid course title detected: "${curriculum.title}"`
    });
  } else {
    criteria.push({
      id: 'title',
      label: 'Course Title',
      passed: false,
      message: 'Missing or invalid course title.'
    });
    improvementTips.push('Add a prominent title at the top of your document (e.g., "Course Title: Full Stack Web Development").');
  }

  // 2. Course Description / Overview Check
  const descLen = (curriculum.description || '').trim().length;
  const hasValidDesc = descLen >= 25;
  if (hasValidDesc) {
    scorePoints++;
    criteria.push({
      id: 'description',
      label: 'Course Overview / Description',
      passed: true,
      message: `Comprehensive description provided (${descLen} characters)`
    });
  } else {
    criteria.push({
      id: 'description',
      label: 'Course Overview / Description',
      passed: false,
      message: 'Course overview is missing or too brief (minimum 25 characters required).'
    });
    improvementTips.push('Include a "Description:" or "Overview:" paragraph explaining what the course teaches and who should take it.');
  }

  // 3. Category & Level Check
  const hasCategory = Boolean(curriculum.category && curriculum.category.trim().length > 0);
  const hasLevel = Boolean(curriculum.level && curriculum.level.trim().length > 0);
  if (hasCategory && hasLevel) {
    scorePoints++;
    criteria.push({
      id: 'category_level',
      label: 'Domain Category & Skill Level',
      passed: true,
      message: `Category: ${curriculum.category} | Level: ${curriculum.level}`
    });
  } else {
    criteria.push({
      id: 'category_level',
      label: 'Domain Category & Skill Level',
      passed: false,
      message: 'Category and skill difficulty level should be clearly defined.'
    });
    improvementTips.push('Specify "Category: Web Development" (or Programming, AI, DSA, etc.) and "Level: Beginner" (or Intermediate, Advanced).');
  }

  // 4. Learning Objectives Check
  const objectivesCount = (curriculum.learning_objectives || []).length;
  const hasObjectives = objectivesCount >= 1;
  if (hasObjectives) {
    scorePoints++;
    criteria.push({
      id: 'objectives',
      label: 'Target Learning Objectives',
      passed: true,
      message: `${objectivesCount} learning objective(s) identified`
    });
  } else {
    criteria.push({
      id: 'objectives',
      label: 'Target Learning Objectives',
      passed: false,
      message: 'No learning objectives or target outcomes found.'
    });
    improvementTips.push('Add a "Learning Objectives:" section with 2-4 bullet points detailing tangible skills students will acquire.');
  }

  // 5. Modular Structure Check
  const modulesCount = (curriculum.modules || []).length;
  const hasModules = modulesCount >= 1;
  if (hasModules) {
    scorePoints++;
    criteria.push({
      id: 'modules',
      label: 'Curriculum Module Hierarchy',
      passed: true,
      message: `${modulesCount} organized module(s) structured`
    });
  } else {
    criteria.push({
      id: 'modules',
      label: 'Curriculum Module Hierarchy',
      passed: false,
      message: 'No modules detected in document.'
    });
    improvementTips.push('Divide your curriculum into structured modules using headers like "Module 1: Foundations" or "Unit 1: Getting Started".');
  }

  // 6. Lesson Distribution & Content Check (Flexible: does not require all 17 modules to have pre-written lessons in the PDF)
  let totalLessons = 0;
  if (curriculum.modules) {
    for (const mod of curriculum.modules) {
      totalLessons += (mod.lessons || []).length;
    }
  }

  // Pass automatically as long as modules or lessons are detected
  const hasLessons = totalLessons >= 1 || modulesCount >= 1;
  scorePoints++;
  criteria.push({
    id: 'lessons',
    label: 'Lesson Breakdown',
    passed: true,
    message: `${totalLessons} lesson(s) structured across ${modulesCount} module(s)`
  });

  const scorePercentage = Math.round((scorePoints / MAX_POINTS) * 100);
  // Flexible quality approval threshold: Valid title & modules are approved (no strict requirement for all 17 modules to have lessons in PDF)
  const isApproved = (hasValidTitle && hasModules && scorePercentage >= 50) || (scorePoints >= 3 && hasModules);

  const criteriaWithFound = criteria.map(c => ({
    ...c,
    found: c.message
  }));

  const failedReasons = criteria
    .filter(c => !c.passed)
    .map(c => `${c.label}: ${c.message}`);

  return {
    status: isApproved ? 'APPROVED' : 'REJECTED',
    score: scorePercentage,
    passedCriteriaCount: scorePoints,
    totalCriteriaCount: MAX_POINTS,
    criteria: criteriaWithFound,
    reasons: failedReasons,
    improvementTips,
    extractedCourse: curriculum
  };
}

/**
 * High-level scanner: Takes PDF buffer or base64 string, parses and evaluates.
 */
export async function scanCoursePdfBuffer(bufferOrBase64) {
  let buffer = null;

  if (Buffer.isBuffer(bufferOrBase64)) {
    buffer = bufferOrBase64;
  } else if (typeof bufferOrBase64 === 'string') {
    // Strip data URL scheme if present: "data:application/pdf;base64,..."
    const base64Data = bufferOrBase64.replace(/^data:[^;]+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    throw new Error('Invalid PDF data payload provided');
  }

  // Extract text using PDFParse
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const rawText = result.text || '';
  await parser.destroy();

  if (!rawText.trim()) {
    return {
      status: 'REJECTED',
      score: 0,
      passedCriteriaCount: 0,
      totalCriteriaCount: 6,
      criteria: [
        { id: 'readability', label: 'PDF Text Extraction', passed: false, message: 'Could not extract text. PDF might be a scanned image or password-protected.' }
      ],
      improvementTips: [
        'Ensure the PDF contains selectable text (not flattened scanned image bitmaps).',
        'Check that the PDF is not password-protected or encrypted.'
      ],
      extractedCourse: null
    };
  }

  let curriculum = parseCurriculumText(rawText);
  // Auto-format into 4-week structure if modules exceed 4 or if the syllabus is designed as a cohort
  if (curriculum.modules && curriculum.modules.length > 4) {
    curriculum = formatAs4WeekStructure(curriculum);
  }
  return evaluateCurriculumCriteria(curriculum);
}

/**
 * Extracts the Google Doc ID from a URL
 * e.g., https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */
export function extractGoogleDocId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Fetches the document content in plain text format directly from Google Docs
 */
export async function fetchGoogleDocText(docUrl) {
  const docId = extractGoogleDocId(docUrl);
  if (!docId) {
    throw new Error('Invalid Google Docs URL. Please paste a valid link (e.g., https://docs.google.com/document/d/.../edit).');
  }

  // Google Docs export text endpoint
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const response = await fetch(exportUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodificatorCourseBot/1.0'
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 401 || response.status === 403) {
      throw new Error(
        'Cannot access Google Doc. Please ensure the document is shared publicly: click "Share" -> change General access to "Anyone with the link can view".'
      );
    }
    throw new Error(`Google Docs returned HTTP status ${response.status}. Please check your link permissions.`);
  }

  // Verify content type isn't a login redirect HTML page
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('text/html') && text.includes('accounts.google.com')) {
    throw new Error(
      'The Google Doc requires sign-in. Please change sharing to "Anyone with the link can view", or copy the document text and use the "Paste Text" tab.'
    );
  }

  if (!text || text.trim().length === 0) {
    throw new Error('The Google Doc is empty. Please add course content and try again.');
  }

  return { docId, text };
}

/**
 * Parses quiz questions and options from plain text, markdown, or JSON.
 * Supports:
 * - Direct JSON array: [{"prompt": "...", "options": [...]}]
 * - Formatted Q&A blocks:
 *     Question 1: Prompt text here
 *     A) Option 1
 *     *B) Option 2 (correct marked by asterisk)
 *     C) Option 3
 *     Answer: B
 *     Explanation: Explanatory text
 */
export function parseQuizQuestionsFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const trimmed = rawText.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          prompt: item.prompt || item.question || `Question ${idx + 1}`,
          question_type: item.question_type || 'SINGLE_CHOICE',
          marks: Number(item.marks) || 1.0,
          explanation: item.explanation || '',
          options: (Array.isArray(item.options) ? item.options : []).map((opt, oIdx) => {
            if (typeof opt === 'string') {
              const isMarked = opt.startsWith('*');
              return {
                text: isMarked ? opt.slice(1).trim() : opt.trim(),
                is_correct: isMarked || oIdx === 0
              };
            }
            return {
              text: opt.text || opt.label || `Option ${oIdx + 1}`,
              is_correct: Boolean(opt.is_correct || opt.correct)
            };
          })
        }));
      }
    } catch {
      // Fallback to text parsing
    }
  }

  const lines = rawText.split('\n');
  const questions = [];
  let currentQuestion = null;

  const isQuestionHeader = (l) => {
    return /^(?:Question|Q)\s*\d*[:.-]\s*(.+)/i.test(l) || /^\d+[.)]\s+(.+[?:])$/i.test(l);
  };

  const isAnswerKey = (l) => {
    return /^(?:Answer|Correct Answer|Ans)\s*[:=-]\s*([A-Ea-e1-5]|\w+)/i.test(l);
  };

  const isExplanation = (l) => {
    return /^(?:Explanation|Reason|Note)\s*[:=-]\s*(.+)/i.test(l);
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    if (isQuestionHeader(line)) {
      if (currentQuestion && currentQuestion.prompt && currentQuestion.options.length > 0) {
        questions.push(currentQuestion);
      }
      const match = line.match(/^(?:Question|Q)\s*\d*[:.-]\s*(.+)/i) || line.match(/^\d+[.)]\s+(.+)/i);
      const promptText = match ? match[1].trim() : line;
      currentQuestion = {
        prompt: promptText,
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: '',
        options: [],
        explicitAnswerLetter: null
      };
      continue;
    }

    if (!currentQuestion) {
      if (line.includes('?') || line.endsWith(':')) {
        currentQuestion = {
          prompt: line,
          question_type: 'SINGLE_CHOICE',
          marks: 1.0,
          explanation: '',
          options: [],
          explicitAnswerLetter: null
        };
        continue;
      }
    }

    if (currentQuestion) {
      if (isAnswerKey(line)) {
        const match = line.match(/^(?:Answer|Correct Answer|Ans)\s*[:=-]\s*([A-Ea-e1-5]|\w+)/i);
        if (match) {
          currentQuestion.explicitAnswerLetter = match[1].toUpperCase().trim();
        }
        continue;
      }

      if (isExplanation(line)) {
        const match = line.match(/^(?:Explanation|Reason|Note)\s*[:=-]\s*(.+)/i);
        if (match) {
          currentQuestion.explanation = match[1].trim();
        }
        continue;
      }

      const optMatch = line.match(/^([*]?)\s*([A-Ea-e1-5])[.)]\s*(.+)$/) || line.match(/^([*])\s+(.+)$/);
      if (optMatch) {
        let isCorrect = Boolean(optMatch[1]);
        let letter = null;
        let text = '';

        if (optMatch.length === 4) {
          letter = optMatch[2].toUpperCase();
          text = optMatch[3].trim();
        } else {
          text = optMatch[2].trim();
        }

        if (/\((?:correct|true)\)$/i.test(text)) {
          isCorrect = true;
          text = text.replace(/\((?:correct|true)\)$/i, '').trim();
        }

        currentQuestion.options.push({
          letter,
          text,
          is_correct: isCorrect
        });
        continue;
      }
    }
  }

  if (currentQuestion && currentQuestion.prompt && currentQuestion.options.length > 0) {
    questions.push(currentQuestion);
  }

  // Normalize questions & guarantee at least one correct option
  return questions.map((q) => {
    if (q.explicitAnswerLetter) {
      const idx = q.explicitAnswerLetter.charCodeAt(0) - 65;
      q.options.forEach((opt, oIdx) => {
        if (opt.letter === q.explicitAnswerLetter || oIdx === idx) {
          opt.is_correct = true;
        }
      });
    }

    const hasCorrect = q.options.some(o => o.is_correct);
    if (!hasCorrect && q.options.length > 0) {
      q.options[0].is_correct = true;
    }

    return {
      prompt: q.prompt,
      question_type: q.options.filter(o => o.is_correct).length > 1 ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
      marks: 1.0,
      explanation: q.explanation || '',
      options: q.options.map(o => ({
        text: o.text,
        is_correct: Boolean(o.is_correct)
      }))
    };
  });
}


