import { db, runQuery, queryOne, transaction } from './db.js';
import { importFullStackNotes } from '../services/curriculumImporter.js';

export function seedDatabase() {
  transaction(() => {
    // Check if admin user already exists
    const existing = queryOne('SELECT id FROM users WHERE email = ?', ['admin@codificators.com']);
    if (existing) {
      console.log('Database already seeded. Skipping initial seed.');
      return;
    }

    console.log('Seeding Codificators LMS database...');

    // 1. Seed Users
    const users = [
      {
        id: 'usr-admin-1',
        email: 'admin@codificators.com',
        password_hash: 'admin123',
        name: 'Dr. Arjun Roy',
        role: 'ADMIN',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        bio: 'Lead System Architect & Codificators Platform Administrator.'
      },
      {
        id: 'usr-operator-1',
        email: 'operator@codificators.com',
        password_hash: 'operator123',
        name: 'Rohan Mehra',
        role: 'OPERATOR',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        bio: 'Senior Curriculum Coordinator & Course Operations Manager.'
      },
      {
        id: 'usr-instructor-1',
        email: 'instructor@codificators.com',
        password_hash: 'instructor123',
        name: 'Sandeep Jain',
        role: 'INSTRUCTOR',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        bio: 'Founder at GfG & Lead Instructor for Systems and Web Development.'
      },
      {
        id: 'usr-instructor-2',
        email: 'instructor2@codificators.com',
        password_hash: 'instructor123',
        name: 'Ananya Verma',
        role: 'INSTRUCTOR',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        bio: 'Frontend Architect & UI/UX Specialist with 9+ years experience.'
      },
      {
        id: 'usr-student-1',
        email: 'student@codificators.com',
        password_hash: 'student123',
        name: 'Alex Chen',
        role: 'STUDENT',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        bio: 'Aspiring Full Stack Engineer enrolled in Career Track 2026.'
      },
      {
        id: 'usr-student-2',
        email: 'student2@codificators.com',
        password_hash: 'student123',
        name: 'Priya Sharma',
        role: 'STUDENT',
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        bio: 'Software Engineer focusing on Modern React and Node.js.'
      }
    ];

    for (const u of users) {
      runQuery(
        `INSERT INTO users (id, email, password_hash, name, role, avatar_url, bio)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.email, u.password_hash, u.name, u.role, u.avatar_url, u.bio]
      );
    }

    // 2. Seed Course 1: Full Stack Web Development
    const course1Id = 'course-fullstack-web';
    runQuery(
      `INSERT INTO courses (
        id, title, slug, description, thumbnail, category, level, instructor_id,
        estimated_duration, price, original_price, is_published,
        learning_objectives, prerequisites, completion_requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        course1Id,
        'Full Stack Web Development',
        'full-stack-web-development',
        'Comprehensive, production-ready curriculum covering HTML5, modern CSS, JavaScript ESNext, React 19, Node.js, Express, PostgreSQL, and Cloud Deployment.',
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
        'Full-Stack & APIs',
        'Beginner to Advanced',
        'usr-instructor-1',
        '65 hours',
        0,
        4999,
        1,
        JSON.stringify([
          'Architect scalable, production-grade web applications from scratch',
          'Master responsive design, Flexbox, Grid, and modern CSS architecture',
          'Build secure REST APIs using Node.js, Express, and JWT authentication',
          'Model and optimize relational databases using PostgreSQL and Prisma',
          'Deploy full-stack cloud workflows with Docker and CI/CD pipelines'
        ]),
        JSON.stringify([
          'Basic computer literacy and text editor familiarity',
          'Fundamental understanding of how the web and internet work'
        ]),
        JSON.stringify({
          requireAllModules: true,
          requirePassingQuizzes: true,
          requireApprovedAssignments: true,
          minOverallScore: 70
        })
      ]
    );

    // Assign co-instructor
    runQuery(
      `INSERT INTO course_instructors (course_id, instructor_id) VALUES (?, ?)`,
      [course1Id, 'usr-instructor-1']
    );
    runQuery(
      `INSERT INTO course_instructors (course_id, instructor_id) VALUES (?, ?)`,
      [course1Id, 'usr-instructor-2']
    );

    // Modules for Course 1
    const modules = [
      {
        id: 'mod-fs-1',
        title: 'Module 1: HTML Fundamentals',
        description: 'Semantic markup, accessibility standards, document anatomy, and form structures.',
        order_index: 1,
        estimated_duration: '8 hours',
        completion_policy: 'POLICY_C_ASSIGNMENT', // Requires Lessons + Quiz + Approved Assignment
        min_passing_score: 75.0,
        prerequisite_module_id: null,
        lessons: [
          {
            id: 'les-m1-1',
            title: 'Lesson 1: Introduction to HTML',
            description: 'History of HTML, web standards, HTTP client-server cycle, and the DOM.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-html-intro',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration_minutes: 22,
            is_mandatory: 1,
            text_content: `# Lesson 1: Introduction to HTML

HTML (HyperText Markup Language) is the foundational skeleton of every web application on the internet.

### Key Concepts:
1. **HyperText**: Text containing hyperlinks allowing non-linear navigation across internet nodes.
2. **Markup**: Syntax using tags to annotate document structure and semantic purpose.
3. **The W3C & WHATWG Standards**: HTML5 living standard maintained collaboratively.

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My First Codificator Page</title>
  </head>
  <body>
    <h1>Welcome to Codificators E-Learning</h1>
    <p>Engineered for high-performing software developers.</p>
  </body>
</html>
\`\`\`
`
          },
          {
            id: 'les-m1-2',
            title: 'Lesson 2: HTML Document Structure',
            description: 'Deep dive into head tags, metadata, viewport scaling, and character encodings.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-html-doc',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            duration_minutes: 28,
            is_mandatory: 1,
            text_content: `# Lesson 2: HTML Document Structure

Understanding how browsers parse HTML documents, build the DOM tree, and render pixels.

### The Critical Elements:
- \`<head>\`: Contains metadata, title, script tags, style links, and Open Graph tags.
- \`<body>\`: The visible document content displayed to users.
- \`<meta charset="UTF-8">\`: Ensures universal character encoding support.
`
          },
          {
            id: 'les-m1-3',
            title: 'Lesson 3: Headings, Paragraphs and Links',
            description: 'Semantic text hierarchy, accessibility landmarks, and hyperlink mechanics.',
            lesson_type: 'TEXT',
            duration_minutes: 20,
            is_mandatory: 1,
            text_content: `# Lesson 3: Headings, Paragraphs and Links

Proper use of \`<h1>\` through \`<h6>\` is critical for accessibility and search engine optimization.

### Rules of Headings:
1. Always maintain exactly one \`<h1>\` tag per page as the primary headline.
2. Never skip heading levels (e.g., do not jump from \`<h2>\` directly to \`<h4>\`).
3. Anchor tags (\`<a>\`) connect resources with \`href\`, \`target="_blank"\`, and \`rel="noopener noreferrer"\`.
`
          },
          {
            id: 'les-m1-4',
            title: 'Lesson 4: Images and Lists',
            description: 'Responsive picture elements, WebP formats, ordered, unordered, and definition lists.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-html-media',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            duration_minutes: 25,
            is_mandatory: 1,
            text_content: `# Lesson 4: Images and Lists

Master media optimization and content lists.

### Image Optimization Checklist:
- Always include descriptive \`alt\` text for screen readers.
- Specify \`width\` and \`height\` to prevent Cumulative Layout Shift (CLS).
- Use lazy loading with \`loading="lazy"\` for below-the-fold media.
`
          },
          {
            id: 'les-m1-5',
            title: 'Lesson 5: HTML Forms',
            description: 'Interactive inputs, validation attributes, labels, accessibility, and submission payloads.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-html-forms',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            duration_minutes: 35,
            is_mandatory: 1,
            text_content: `# Lesson 5: HTML Forms

Forms provide the bridge between user inputs and server processing.

### Key Attributes:
- \`<form action="/api/submit" method="POST">\`
- \`<label for="user-email">\`: Always pair with input \`id\` for screen readers.
- Validation: \`required\`, \`pattern\`, \`minlength\`, \`type="email"\`.
`
          }
        ],
        quiz: {
          id: 'quiz-mod-1',
          title: 'Quiz: HTML Fundamentals',
          description: 'Assess your comprehension of semantic HTML5, DOM hierarchies, and form controls.',
          passing_percentage: 75.0,
          time_limit_minutes: 15,
          max_attempts: 3,
          questions: [
            {
              id: 'q-html-1',
              prompt: 'Which HTML element should only appear once per page to represent the primary topic?',
              question_type: 'SINGLE_CHOICE',
              marks: 1.0,
              explanation: 'HTML5 standards specify a single <h1> element per page to maintain proper accessibility landmarks and SEO indexing.',
              options: [
                { id: 'opt-q1-1', text: '<header>', is_correct: 0 },
                { id: 'opt-q1-2', text: '<h1>', is_correct: 1 },
                { id: 'opt-q1-3', text: '<main>', is_correct: 0 },
                { id: 'opt-q1-4', text: '<title>', is_correct: 0 }
              ]
            },
            {
              id: 'q-html-2',
              prompt: 'Which attribute ensures screen readers correctly announce the purpose of an image when it fails to load?',
              question_type: 'SINGLE_CHOICE',
              marks: 1.0,
              explanation: 'The alt attribute provides alternative text description for accessibility and screen readers.',
              options: [
                { id: 'opt-q2-1', text: 'title', is_correct: 0 },
                { id: 'opt-q2-2', text: 'src', is_correct: 0 },
                { id: 'opt-q2-3', text: 'alt', is_correct: 1 },
                { id: 'opt-q2-4', text: 'description', is_correct: 0 }
              ]
            },
            {
              id: 'q-html-3',
              prompt: 'True or False: The <meta name="viewport"> tag is mandatory for mobile-responsive rendering.',
              question_type: 'TRUE_FALSE',
              marks: 1.0,
              explanation: 'True. Without the viewport meta tag, mobile browsers render desktop pages at fixed 980px zoom.',
              options: [
                { id: 'opt-q3-1', text: 'True', is_correct: 1 },
                { id: 'opt-q3-2', text: 'False', is_correct: 0 }
              ]
            },
            {
              id: 'q-html-4',
              prompt: 'Which input type enforces a valid email format before form submission?',
              question_type: 'SINGLE_CHOICE',
              marks: 1.0,
              explanation: 'type="email" provides browser-native regex validation for email strings.',
              options: [
                { id: 'opt-q4-1', text: 'type="text"', is_correct: 0 },
                { id: 'opt-q4-2', text: 'type="email"', is_correct: 1 },
                { id: 'opt-q4-3', text: 'type="validate"', is_correct: 0 },
                { id: 'opt-q4-4', text: 'type="mail"', is_correct: 0 }
              ]
            }
          ]
        },
        assignment: {
          id: 'asg-mod-1',
          title: 'Assignment: Build Your First Webpage',
          instructions: `Create a clean, multi-section developer portfolio webpage using pure semantic HTML5.

### Submission Requirements:
1. Use valid HTML5 boilerplate with correct DOCTYPE, lang, and viewport metadata.
2. Incorporate semantic landmarks: <header>, <nav>, <main>, <section>, <article>, and <footer>.
3. Include an Accessible Contact Form with at least 4 input types, proper <label> associations, and HTML5 validation attributes.
4. Include an interactive table displaying your technical skills and proficiency levels.
5. Submit your complete HTML source code or public GitHub repository link below.`,
          max_marks: 100.0,
          due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
          is_required: 1,
          accepted_types: 'text,github,zip',
          rubric: 'HTML5 Semantic Accuracy (30pts), Form Accessibility & Labels (30pts), Document Structure & Metadata (20pts), Clean Code & Indentation (20pts)'
        }
      },
      {
        id: 'mod-fs-2',
        title: 'Module 2: CSS Fundamentals',
        description: 'Box model, CSS Grid, Flexbox, typography, responsive breakpoints, and modern layouts.',
        order_index: 2,
        estimated_duration: '10 hours',
        completion_policy: 'POLICY_B_QUIZ', // Lessons + Quiz
        min_passing_score: 70.0,
        prerequisite_module_id: 'mod-fs-1',
        lessons: [
          {
            id: 'les-m2-1',
            title: 'Lesson 1: Introduction to CSS',
            description: 'Cascading rules, specificity hierarchy, and box model mechanics.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-css-intro',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            duration_minutes: 25,
            is_mandatory: 1,
            text_content: `# Lesson 1: Introduction to CSS\n\nUnderstand specificity: Inline styles (1000) > IDs (100) > Classes/Attributes (10) > Elements (1).`
          },
          {
            id: 'les-m2-2',
            title: 'Lesson 2: CSS Selectors',
            description: 'Combinators, pseudo-classes (:hover, :focus-visible), and pseudo-elements (::before, ::after).',
            lesson_type: 'TEXT',
            duration_minutes: 20,
            is_mandatory: 1,
            text_content: `# Lesson 2: CSS Selectors\n\nDeep dive into modern selectors: :is(), :where(), and :has() parent selector.`
          },
          {
            id: 'les-m2-3',
            title: 'Lesson 3: Colors and Typography',
            description: 'HSL color palettes, font-display: swap, variable fonts, and modular scales.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-css-typo',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
            duration_minutes: 30,
            is_mandatory: 1,
            text_content: `# Lesson 3: Colors and Typography\n\nBuilding design tokens with CSS custom properties (--brand-primary, --text-scale).`
          },
          {
            id: 'les-m2-4',
            title: 'Lesson 4: Flexbox and Grid',
            description: '1D vs 2D layout systems, flex shrink/grow calculations, and CSS grid template areas.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-css-grid',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
            duration_minutes: 45,
            is_mandatory: 1,
            text_content: `# Lesson 4: Flexbox and Grid\n\nMastering auto-fit and auto-fill in CSS Grid: grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));`
          }
        ],
        quiz: {
          id: 'quiz-mod-2',
          title: 'Quiz: CSS Fundamentals',
          description: 'Test your understanding of the CSS cascade, specificity, and layout algorithms.',
          passing_percentage: 70.0,
          time_limit_minutes: 15,
          max_attempts: 3,
          questions: [
            {
              id: 'q-css-1',
              prompt: 'Which CSS property creates a two-dimensional grid layout container?',
              question_type: 'SINGLE_CHOICE',
              marks: 1.0,
              explanation: 'display: grid activates the 2-dimensional CSS Grid layout formatting context.',
              options: [
                { id: 'opt-c1-1', text: 'display: flex;', is_correct: 0 },
                { id: 'opt-c1-2', text: 'display: grid;', is_correct: 1 },
                { id: 'opt-c1-3', text: 'display: table;', is_correct: 0 },
                { id: 'opt-c1-4', text: 'display: block;', is_correct: 0 }
              ]
            },
            {
              id: 'q-css-2',
              prompt: 'What is the specificity weight of an ID selector in CSS?',
              question_type: 'SINGLE_CHOICE',
              marks: 1.0,
              explanation: 'An ID selector has specificity (0, 1, 0, 0) or weight 100.',
              options: [
                { id: 'opt-c2-1', text: '1', is_correct: 0 },
                { id: 'opt-c2-2', text: '10', is_correct: 0 },
                { id: 'opt-c2-3', text: '100', is_correct: 1 },
                { id: 'opt-c2-4', text: '1000', is_correct: 0 }
              ]
            }
          ]
        },
        assignment: {
          id: 'asg-mod-2',
          title: 'Project: Responsive Landing Page',
          instructions: 'Build a mobile-first responsive landing page with Flexbox navigation and CSS Grid cards.',
          max_marks: 100.0,
          due_date: new Date(Date.now() + 21 * 86400000).toISOString(),
          is_required: 0,
          accepted_types: 'text,github,zip',
          rubric: 'Mobile Responsiveness (40pts), Layout structure (30pts), CSS Cleanliness (30pts)'
        }
      },
      {
        id: 'mod-fs-3',
        title: 'Module 3: JavaScript',
        description: 'V8 engine internals, execution context, closures, async/await, and event-driven architecture.',
        order_index: 3,
        estimated_duration: '14 hours',
        completion_policy: 'POLICY_A_LESSONS', // All required lessons
        min_passing_score: 70.0,
        prerequisite_module_id: 'mod-fs-2',
        lessons: [
          {
            id: 'les-m3-1',
            title: 'Lesson 1: JavaScript Execution Model & Variables',
            description: 'Call stack, memory heap, garbage collection, and temporal dead zone with let/const.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-js-exec',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            duration_minutes: 35,
            is_mandatory: 1,
            text_content: `# Lesson 1: JS Execution Model\n\nUnderstanding the call stack, event loop, and macro/micro-task queues.`
          },
          {
            id: 'les-m3-2',
            title: 'Lesson 2: Functions, Scope & Closures',
            description: 'Lexical scoping, higher-order functions, and functional programming patterns.',
            lesson_type: 'TEXT',
            duration_minutes: 30,
            is_mandatory: 1,
            text_content: `# Lesson 2: Closures\n\nA closure is the combination of a function bundled together with references to its surrounding state.`
          },
          {
            id: 'les-m3-3',
            title: 'Lesson 3: DOM Manipulation & Event Handling',
            description: 'Event delegation, bubbling, capturing, and passive event listeners.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-js-dom',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
            duration_minutes: 40,
            is_mandatory: 1,
            text_content: `# Lesson 3: DOM Manipulation\n\nEfficient element querying, DocumentFragment batching, and custom events.`
          },
          {
            id: 'les-m3-4',
            title: 'Lesson 4: Asynchronous JavaScript, Promises & Fetch API',
            description: 'Promise chaining, async/await error boundaries, and streaming responses.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-js-async',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            duration_minutes: 45,
            is_mandatory: 1,
            text_content: `# Lesson 4: Async JS\n\nHandling concurrent requests with Promise.allSettled() and AbortController cancellation.`
          }
        ]
      },
      {
        id: 'mod-fs-4',
        title: 'Module 4: React.js',
        description: 'React 19 fiber reconciler, concurrent mode, hooks architecture, and server components.',
        order_index: 4,
        estimated_duration: '16 hours',
        completion_policy: 'POLICY_B_QUIZ',
        min_passing_score: 70.0,
        prerequisite_module_id: 'mod-fs-3',
        lessons: [
          {
            id: 'les-m4-1',
            title: 'Lesson 1: React Component Architecture & JSX',
            description: 'Pure components, unidirectional data flow, and virtual DOM diffing.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-react-arch',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
            duration_minutes: 40,
            is_mandatory: 1,
            text_content: `# Lesson 1: React 19 Architecture\n\nUnderstanding JSX compilation and reconciliation.`
          },
          {
            id: 'les-m4-2',
            title: 'Lesson 2: State, Props & Lifecycle Hooks',
            description: 'useState, useReducer, and the React 19 use() hook.',
            lesson_type: 'TEXT',
            duration_minutes: 35,
            is_mandatory: 1,
            text_content: `# Lesson 2: Hooks Deep Dive\n\nOptimizing re-renders with memoization and action transitions.`
          }
        ],
        quiz: {
          id: 'quiz-mod-4',
          title: 'Quiz: React State Management',
          description: 'Assess component lifecycle, hooks rules, and immutability concepts.',
          passing_percentage: 70.0,
          time_limit_minutes: 15,
          max_attempts: 3,
          questions: [
            {
              id: 'q-react-1',
              prompt: 'Which hook should you use for complex state logic that involves multiple sub-values?',
              question_type: 'SINGLE_CHOICE',
              marks: 1.0,
              explanation: 'useReducer is preferred for complex state management with predictable action dispatches.',
              options: [
                { id: 'opt-r1-1', text: 'useState', is_correct: 0 },
                { id: 'opt-r1-2', text: 'useReducer', is_correct: 1 },
                { id: 'opt-r1-3', text: 'useRef', is_correct: 0 },
                { id: 'opt-r1-4', text: 'useEffect', is_correct: 0 }
              ]
            }
          ]
        }
      },
      {
        id: 'mod-fs-5',
        title: 'Module 5: Node.js and Express',
        description: 'V8 libuv thread pool, REST APIs, middleware chains, validation, and JWT security.',
        order_index: 5,
        estimated_duration: '12 hours',
        completion_policy: 'POLICY_A_LESSONS',
        min_passing_score: 70.0,
        prerequisite_module_id: 'mod-fs-4',
        lessons: [
          {
            id: 'les-m5-1',
            title: 'Lesson 1: Node.js Runtime & Event Loop',
            description: 'Non-blocking I/O, streams, buffers, and event emitters.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-node-rt',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
            duration_minutes: 40,
            is_mandatory: 1,
            text_content: `# Lesson 1: Node.js Runtime\n\nExplaining the libuv loop phases: timers, pending callbacks, poll, check, close.`
          },
          {
            id: 'les-m5-2',
            title: 'Lesson 2: RESTful API Design with Express',
            description: 'Route controllers, middleware, status codes, and error handlers.',
            lesson_type: 'TEXT',
            duration_minutes: 30,
            is_mandatory: 1,
            text_content: `# Lesson 2: Express REST APIs\n\nBuilding structured endpoints with validation and JSON response envelopes.`
          }
        ]
      },
      {
        id: 'mod-fs-6',
        title: 'Module 6: Database and Deployment',
        description: 'PostgreSQL schema modeling, indexing, transactions, Docker, and CI/CD deployment.',
        order_index: 6,
        estimated_duration: '10 hours',
        completion_policy: 'POLICY_B_QUIZ',
        min_passing_score: 75.0,
        prerequisite_module_id: 'mod-fs-5',
        lessons: [
          {
            id: 'les-m6-1',
            title: 'Lesson 1: Relational Database Modeling & PostgreSQL',
            description: 'Normalization, foreign key constraints, B-tree indexes, and ACID guarantees.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-pg-model',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration_minutes: 45,
            is_mandatory: 1,
            text_content: `# Lesson 1: Relational Modeling\n\nDesigning normalized 3NF schemas, foreign key cascade options, and database constraints.`
          },
          {
            id: 'les-m6-2',
            title: 'Lesson 2: Cloud Deployment, Docker & CI/CD',
            description: 'Containerization, environment configuration, automated testing, and health checks.',
            lesson_type: 'VIDEO',
            video_asset_id: 'mux-asset-docker-deploy',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            duration_minutes: 50,
            is_mandatory: 1,
            text_content: `# Lesson 2: Cloud Deployment\n\nMulti-stage Docker builds, zero-downtime rolling updates, and security hardening.`
          }
        ],
        quiz: {
          id: 'quiz-mod-6',
          title: 'Quiz: Full Stack Mastery Final Assessment',
          description: 'Comprehensive evaluation of database normalization, security, and deployment architectures.',
          passing_percentage: 75.0,
          time_limit_minutes: 20,
          max_attempts: 3,
          questions: [
            {
              id: 'q-fs-1',
              prompt: 'In relational database design, what does the ACID property "Isolation" guarantee?',
              question_type: 'SINGLE_CHOICE',
              marks: 1.0,
              explanation: 'Isolation guarantees that concurrent transactions execute without interfering with one another.',
              options: [
                { id: 'opt-f1-1', text: 'Transactions are all-or-nothing', is_correct: 0 },
                { id: 'opt-f1-2', text: 'Concurrent transactions do not affect each others execution results', is_correct: 1 },
                { id: 'opt-f1-3', text: 'Data survives hardware failure', is_correct: 0 },
                { id: 'opt-f1-4', text: 'Data constraints are strictly preserved', is_correct: 0 }
              ]
            }
          ]
        }
      }
    ];

    for (const m of modules) {
      runQuery(
        `INSERT INTO modules (
          id, course_id, title, description, order_index, estimated_duration,
          is_published, completion_policy, min_passing_score, prerequisite_module_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.id,
          course1Id,
          m.title,
          m.description,
          m.order_index,
          m.estimated_duration,
          1,
          m.completion_policy,
          m.min_passing_score,
          m.prerequisite_module_id
        ]
      );

      // Insert Lessons
      if (m.lessons) {
        for (let i = 0; i < m.lessons.length; i++) {
          const l = m.lessons[i];
          runQuery(
            `INSERT INTO lessons (
              id, module_id, title, description, lesson_type, video_asset_id,
              video_url, text_content, duration_minutes, order_index, is_mandatory, video_threshold_percent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              l.id,
              m.id,
              l.title,
              l.description,
              l.lesson_type,
              l.video_asset_id || null,
              l.video_url || null,
              l.text_content || '',
              l.duration_minutes || 15,
              i + 1,
              l.is_mandatory !== undefined ? l.is_mandatory : 1,
              90
            ]
          );

          // Add a downloadable resource for Lesson 1
          if (l.id === 'les-m1-1') {
            runQuery(
              `INSERT INTO lesson_resources (id, lesson_id, title, file_url, file_type, file_size)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                'res-html-cheatsheet',
                l.id,
                'Codificators HTML5 Semantic Cheatsheet.pdf',
                '/courses/Full Stack Development-Digital Notes.pdf',
                'application/pdf',
                '1.2 MB'
              ]
            );
          }
        }
      }

      // Insert Quiz if present
      if (m.quiz) {
        runQuery(
          `INSERT INTO quizzes (
            id, module_id, title, description, passing_percentage,
            time_limit_minutes, max_attempts, is_required
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.quiz.id,
            m.id,
            m.quiz.title,
            m.quiz.description,
            m.quiz.passing_percentage,
            m.quiz.time_limit_minutes,
            m.quiz.max_attempts,
            1
          ]
        );

        if (m.quiz.questions) {
          for (let qIdx = 0; qIdx < m.quiz.questions.length; qIdx++) {
            const q = m.quiz.questions[qIdx];
            runQuery(
              `INSERT INTO quiz_questions (
                id, quiz_id, prompt, question_type, marks, explanation, order_index
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [q.id, m.quiz.id, q.prompt, q.question_type, q.marks, q.explanation, qIdx + 1]
            );

            if (q.options) {
              for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
                const opt = q.options[oIdx];
                runQuery(
                  `INSERT INTO quiz_options (id, question_id, text, is_correct, order_index)
                   VALUES (?, ?, ?, ?, ?)`,
                  [opt.id, q.id, opt.text, opt.is_correct ? 1 : 0, oIdx + 1]
                );
              }
            }
          }
        }
      }

      // Insert Assignment if present
      if (m.assignment) {
        runQuery(
          `INSERT INTO assignments (
            id, module_id, title, instructions, max_marks, due_date, is_required, accepted_types, rubric
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.assignment.id,
            m.id,
            m.assignment.title,
            m.assignment.instructions,
            m.assignment.max_marks,
            m.assignment.due_date,
            m.assignment.is_required,
            m.assignment.accepted_types,
            m.assignment.rubric
          ]
        );
      }
    }

    // 3. Pre-enroll Student 1 in Course 1 with Module 1 unlocked
    const enrollId = 'enr-alex-fullstack';
    runQuery(
      `INSERT INTO enrollments (id, user_id, course_id, status, progress_percent)
       VALUES (?, ?, ?, 'ACTIVE', 0.0)`,
      [enrollId, 'usr-student-1', course1Id]
    );

    // Initialize module progress: Module 1 is UNLOCKED, other modules are LOCKED!
    runQuery(
      `INSERT INTO module_progress (id, enrollment_id, module_id, user_id, is_completed, is_unlocked)
       VALUES (?, ?, 'mod-fs-1', 'usr-student-1', 0, 1)`,
      ['mp-alex-m1', enrollId]
    );

    for (let i = 2; i <= 6; i++) {
      runQuery(
        `INSERT INTO module_progress (id, enrollment_id, module_id, user_id, is_completed, is_unlocked)
         VALUES (?, ?, ?, 'usr-student-1', 0, 0)`,
        [`mp-alex-m${i}`, enrollId, `mod-fs-${i}`]
      );
    }

    // Pre-enroll Student 2 as well
    const enroll2Id = 'enr-priya-fullstack';
    runQuery(
      `INSERT INTO enrollments (id, user_id, course_id, status, progress_percent)
       VALUES (?, ?, ?, 'ACTIVE', 0.0)`,
      [enroll2Id, 'usr-student-2', course1Id]
    );
    runQuery(
      `INSERT INTO module_progress (id, enrollment_id, module_id, user_id, is_completed, is_unlocked)
       VALUES (?, ?, 'mod-fs-1', 'usr-student-2', 0, 1)`,
      ['mp-priya-m1', enroll2Id]
    );
    for (let i = 2; i <= 6; i++) {
      runQuery(
        `INSERT INTO module_progress (id, enrollment_id, module_id, user_id, is_completed, is_unlocked)
         VALUES (?, ?, ?, 'usr-student-2', 0, 0)`,
        [`mp-priya-m${i}`, enroll2Id, `mod-fs-${i}`]
      );
    }

    console.log('Database seeded successfully with Users, Courses, Modules, Lessons, Quizzes, and Assignments!');
  });

  try {
    importFullStackNotes();
    console.log('Full Stack digital notes imported successfully.');
  } catch (err) {
    console.warn('Digital notes import notice:', err.message);
  }
}
