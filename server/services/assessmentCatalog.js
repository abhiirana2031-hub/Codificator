/**
 * Codificators Comprehensive Assessment Catalog & Educational Practice System.
 * Supports SINGLE_CHOICE, MULTIPLE_CHOICE (multi-select), TRUE_FALSE, and SHORT_ANSWER.
 * Enriched with pedagogical explanations, common misconception breakdowns, and review references.
 */

export const fullStackAssessments = [
  // Module 1: HTML5 Architecture & Semantic Markup
  {
    id: 'quiz-mod-1',
    moduleId: 'mod-fs-1',
    title: 'Quiz: HTML Fundamentals & Document Semantics',
    description: 'Assess comprehension of semantic landmarks, accessibility standards, document anatomy, and form validation.',
    passing_percentage: 75.0,
    time_limit_minutes: 15,
    max_attempts: 5,
    questions: [
      {
        id: 'q-html-1',
        prompt: 'Which HTML element should only appear once per page to represent the primary topic?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'HTML5 standards specify a single <h1> element per page to maintain proper accessibility landmarks and SEO indexing.',
        concept_to_review: 'Review Lesson 1: HTML Architecture & Document Hierarchy',
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
        explanation: 'The alt attribute provides alternative text descriptions for assistive technology and visually impaired users.',
        concept_to_review: 'Review Lesson 1: HTML Architecture & Document Hierarchy',
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
        explanation: 'True. Without the viewport meta tag, mobile browsers render desktop pages at a fixed 980px viewport and scale down content.',
        concept_to_review: 'Review Lesson 1: HTML Architecture & Document Hierarchy',
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
        explanation: 'type="email" activates browser-native validation conforming to RFC 5322 syntax before firing the submit event.',
        concept_to_review: 'Review Lesson 4: HTML Forms, Inputs & Accessible Controls',
        options: [
          { id: 'opt-q4-1', text: 'type="text"', is_correct: 0 },
          { id: 'opt-q4-2', text: 'type="email"', is_correct: 1 },
          { id: 'opt-q4-3', text: 'type="validate"', is_correct: 0 },
          { id: 'opt-q4-4', text: 'type="mail"', is_correct: 0 }
        ]
      },
      {
        id: 'q-html-5',
        prompt: 'Which of the following are valid HTML5 semantic landmark elements? (Select all that apply)',
        question_type: 'MULTIPLE_CHOICE',
        marks: 1.0,
        explanation: '<header>, <article>, and <main> are standard HTML5 semantic elements that provide accessible document navigation.',
        concept_to_review: 'Review Lesson 2: HTML Formatting, Headings & Text Semantics',
        options: [
          { id: 'opt-q5-1', text: '<header>', is_correct: 1 },
          { id: 'opt-q5-2', text: '<article>', is_correct: 1 },
          { id: 'opt-q5-3', text: '<content>', is_correct: 0 },
          { id: 'opt-q5-4', text: '<main>', is_correct: 1 }
        ]
      },
      {
        id: 'q-html-6',
        prompt: 'Which HTML element tag is used to embed or reference client-side JavaScript?',
        question_type: 'SHORT_ANSWER',
        marks: 1.0,
        explanation: 'The <script> tag embeds executable client-side JavaScript code or points to an external file via src.',
        concept_to_review: 'Review Lesson 1: HTML Architecture & Document Hierarchy',
        options: [
          { id: 'opt-q6-1', text: 'script', is_correct: 1 },
          { id: 'opt-q6-2', text: '<script>', is_correct: 1 }
        ]
      }
    ]
  },

  // Module 2: Unix Shell & Git Version Control
  {
    id: 'quiz-mod-2',
    moduleId: 'mod-fs-2',
    title: 'Quiz: Unix Terminal & Git Version Control',
    description: 'Evaluate command-line navigation, file system administration, Git commit graphs, and branching mechanics.',
    passing_percentage: 70.0,
    time_limit_minutes: 15,
    max_attempts: 5,
    questions: [
      {
        id: 'q-git-1',
        prompt: 'Which Unix command displays the full absolute path of the current working directory?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'pwd stands for "print working directory" and outputs the current hierarchical directory path.',
        concept_to_review: 'Review Lesson 1: Unix Commands & Terminal Navigation',
        options: [
          { id: 'opt-g1-1', text: 'pwd', is_correct: 1 },
          { id: 'opt-g1-2', text: 'cd', is_correct: 0 },
          { id: 'opt-g1-3', text: 'dir', is_correct: 0 },
          { id: 'opt-g1-4', text: 'ls', is_correct: 0 }
        ]
      },
      {
        id: 'q-git-2',
        prompt: 'In Git, which command stages all modified and newly created tracked files in the current repository?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'git add . stages all changes in the current directory tree to the Git staging index.',
        concept_to_review: 'Review Lesson 2: Git Version Control Architecture & Local Workflows',
        options: [
          { id: 'opt-g2-1', text: 'git add .', is_correct: 1 },
          { id: 'opt-g2-2', text: 'git commit -a', is_correct: 0 },
          { id: 'opt-g2-3', text: 'git push origin', is_correct: 0 },
          { id: 'opt-g2-4', text: 'git stage --all-now', is_correct: 0 }
        ]
      },
      {
        id: 'q-git-3',
        prompt: 'True or False: A Git fast-forward merge creates a new merge commit object.',
        question_type: 'TRUE_FALSE',
        marks: 1.0,
        explanation: 'False. A fast-forward merge simply moves the branch pointer forward to the target commit without creating an extra merge commit.',
        concept_to_review: 'Review Lesson 3: GitHub Collaboration, Remote Branches & Pull Requests',
        options: [
          { id: 'opt-g3-1', text: 'True', is_correct: 0 },
          { id: 'opt-g3-2', text: 'False', is_correct: 1 }
        ]
      },
      {
        id: 'q-git-4',
        prompt: 'Which of the following commands create AND switch to a new branch named "feature/auth"? (Select all that apply)',
        question_type: 'MULTIPLE_CHOICE',
        marks: 1.0,
        explanation: 'Both "git checkout -b feature/auth" (traditional) and "git switch -c feature/auth" (modern Git 2.23+) create and switch branches.',
        concept_to_review: 'Review Lesson 2: Git Version Control Architecture & Local Workflows',
        options: [
          { id: 'opt-g4-1', text: 'git checkout -b feature/auth', is_correct: 1 },
          { id: 'opt-g4-2', text: 'git switch -c feature/auth', is_correct: 1 },
          { id: 'opt-g4-3', text: 'git branch -d feature/auth', is_correct: 0 },
          { id: 'opt-g4-4', text: 'git push -b feature/auth', is_correct: 0 }
        ]
      },
      {
        id: 'q-git-5',
        prompt: 'Which Git command is used to inspect the repository commit history?',
        question_type: 'SHORT_ANSWER',
        marks: 1.0,
        explanation: 'git log prints chronological commit metadata including SHA-1 hashes, author information, timestamps, and commit messages.',
        concept_to_review: 'Review Lesson 2: Git Version Control Architecture & Local Workflows',
        options: [
          { id: 'opt-g5-1', text: 'git log', is_correct: 1 },
          { id: 'opt-g5-2', text: 'log', is_correct: 1 }
        ]
      }
    ]
  },

  // Module 3: Modern CSS & Responsive Design
  {
    id: 'quiz-mod-3',
    moduleId: 'mod-fs-3',
    title: 'Quiz: Modern CSS & Responsive Layouts',
    description: 'Assess understanding of CSS Box Model calculations, Grid, Flexbox, specificity rules, and media queries.',
    passing_percentage: 70.0,
    time_limit_minutes: 15,
    max_attempts: 5,
    questions: [
      {
        id: 'q-css-1',
        prompt: 'Which CSS property creates a two-dimensional grid layout container?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'display: grid activates the 2-dimensional CSS Grid layout formatting context supporting rows and columns.',
        concept_to_review: 'Review Lesson 3: CSS Display, Buttons, Cursors & Component Design',
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
        explanation: 'An ID selector has specificity (0, 1, 0, 0) or weight 100, which overrides class, attribute, and element selectors.',
        concept_to_review: 'Review Lesson 1: CSS Syntax, Selectors & Cascade Priority',
        options: [
          { id: 'opt-c2-1', text: '1', is_correct: 0 },
          { id: 'opt-c2-2', text: '10', is_correct: 0 },
          { id: 'opt-c2-3', text: '100', is_correct: 1 },
          { id: 'opt-c2-4', text: '1000', is_correct: 0 }
        ]
      },
      {
        id: 'q-css-3',
        prompt: 'Under box-sizing: content-box, an element with width: 200px, padding: 20px on all sides, and border: 5px on all sides occupies what total rendered horizontal width?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'Under content-box: Total width = width (200px) + left/right padding (40px) + left/right border (10px) = 250px.',
        concept_to_review: 'Review Lesson 2: Box Model, Margins, Borders & Spacing',
        options: [
          { id: 'opt-c3-1', text: '200px', is_correct: 0 },
          { id: 'opt-c3-2', text: '225px', is_correct: 0 },
          { id: 'opt-c3-3', text: '250px', is_correct: 1 },
          { id: 'opt-c3-4', text: '270px', is_correct: 0 }
        ]
      },
      {
        id: 'q-css-4',
        prompt: 'Which CSS Flexbox properties control alignment along the cross-axis? (Select all that apply)',
        question_type: 'MULTIPLE_CHOICE',
        marks: 1.0,
        explanation: 'align-items, align-content, and align-self control cross-axis alignment. justify-content controls the main axis.',
        concept_to_review: 'Review Lesson 3: CSS Display, Buttons, Cursors & Component Design',
        options: [
          { id: 'opt-c4-1', text: 'align-items', is_correct: 1 },
          { id: 'opt-c4-2', text: 'justify-content', is_correct: 0 },
          { id: 'opt-c4-3', text: 'align-self', is_correct: 1 },
          { id: 'opt-c4-4', text: 'align-content', is_correct: 1 }
        ]
      },
      {
        id: 'q-css-5',
        prompt: 'True or False: "box-sizing: border-box" includes padding and border within the declared width and height of an element.',
        question_type: 'TRUE_FALSE',
        marks: 1.0,
        explanation: 'True. border-box prevents unexpected dimensional expansion by subtracting padding and border from the content area.',
        concept_to_review: 'Review Lesson 2: Box Model, Margins, Borders & Spacing',
        options: [
          { id: 'opt-c5-1', text: 'True', is_correct: 1 },
          { id: 'opt-c5-2', text: 'False', is_correct: 0 }
        ]
      }
    ]
  },

  // Module 4: JavaScript Core & DOM Manipulation
  {
    id: 'quiz-mod-4',
    moduleId: 'mod-fs-4',
    title: 'Quiz: JavaScript Core & DOM Scripting',
    description: 'Test knowledge of execution contexts, closures, event delegation, array immutability, and prototype chains.',
    passing_percentage: 70.0,
    time_limit_minutes: 15,
    max_attempts: 5,
    questions: [
      {
        id: 'q-js-1',
        prompt: 'What will "typeof null" evaluate to in JavaScript?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'typeof null returns "object" due to a legacy bug in the original 1995 JavaScript type-tag implementation.',
        concept_to_review: 'Review Lesson 1: JavaScript Syntax, Variables, Data Types & Scope',
        options: [
          { id: 'opt-j1-1', text: '"null"', is_correct: 0 },
          { id: 'opt-j1-2', text: '"undefined"', is_correct: 0 },
          { id: 'opt-j1-3', text: '"object"', is_correct: 1 },
          { id: 'opt-j1-4', text: '"boolean"', is_correct: 0 }
        ]
      },
      {
        id: 'q-js-2',
        prompt: 'In standard DOM event propagation, which phase executes BEFORE the target phase?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'Event propagation follows three phases: 1. Capturing Phase (window down to target), 2. Target Phase, 3. Bubbling Phase (target up to window).',
        concept_to_review: 'Review Lesson 3: Event Handling & jQuery Library Foundations',
        options: [
          { id: 'opt-j2-1', text: 'Bubbling phase', is_correct: 0 },
          { id: 'opt-j2-2', text: 'Capturing phase', is_correct: 1 },
          { id: 'opt-j2-3', text: 'Rendering phase', is_correct: 0 },
          { id: 'opt-j2-4', text: 'Propagation phase', is_correct: 0 }
        ]
      },
      {
        id: 'q-js-3',
        prompt: 'True or False: Variables declared with "const" prevent mutation of internal object properties.',
        question_type: 'TRUE_FALSE',
        marks: 1.0,
        explanation: 'False. const prevents reassigning the variable identifier to a different memory address, but properties inside an object can still be mutated.',
        concept_to_review: 'Review Lesson 1: JavaScript Syntax, Variables, Data Types & Scope',
        options: [
          { id: 'opt-j3-1', text: 'True', is_correct: 0 },
          { id: 'opt-j3-2', text: 'False', is_correct: 1 }
        ]
      },
      {
        id: 'q-js-4',
        prompt: 'Which of the following array methods return a new Array rather than mutating the original array? (Select all that apply)',
        question_type: 'MULTIPLE_CHOICE',
        marks: 1.0,
        explanation: 'map(), filter(), and slice() are pure non-mutating methods. push() and splice() mutate the caller array in-place.',
        concept_to_review: 'Review Lesson 2: Memory Management, Functions & DOM Manipulation',
        options: [
          { id: 'opt-j4-1', text: 'map()', is_correct: 1 },
          { id: 'opt-j4-2', text: 'filter()', is_correct: 1 },
          { id: 'opt-j4-3', text: 'splice()', is_correct: 0 },
          { id: 'opt-j4-4', text: 'slice()', is_correct: 1 }
        ]
      },
      {
        id: 'q-js-5',
        prompt: 'Which keyword declares block-scoped, reassignable variables in modern JavaScript?',
        question_type: 'SHORT_ANSWER',
        marks: 1.0,
        explanation: 'let provides block-scoped mutable variable declaration without hoisting to function scope like legacy var.',
        concept_to_review: 'Review Lesson 1: JavaScript Syntax, Variables, Data Types & Scope',
        options: [
          { id: 'opt-j5-1', text: 'let', is_correct: 1 }
        ]
      }
    ]
  },

  // Module 5: React.js & Frontend State Management
  {
    id: 'quiz-mod-5',
    moduleId: 'mod-fs-5',
    title: 'Quiz: React.js Architecture & State Management',
    description: 'Assess Virtual DOM reconciliation, components, props, hooks lifecycle, and Redux state architecture.',
    passing_percentage: 70.0,
    time_limit_minutes: 15,
    max_attempts: 5,
    questions: [
      {
        id: 'q-react-1',
        prompt: 'Which hook should you use for complex state logic that involves multiple sub-values or predictable state transitions?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'useReducer is preferred for managing complex state transitions following the (state, action) => newState reducer pattern.',
        concept_to_review: 'Review Lesson 2: Components, Props, State & Virtual DOM Architecture',
        options: [
          { id: 'opt-r1-1', text: 'useState', is_correct: 0 },
          { id: 'opt-r1-2', text: 'useReducer', is_correct: 1 },
          { id: 'opt-r1-3', text: 'useEffect', is_correct: 0 },
          { id: 'opt-r1-4', text: 'useRef', is_correct: 0 }
        ]
      },
      {
        id: 'q-react-2',
        prompt: 'Why should state in React never be mutated directly (e.g., state.count = 5)?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'Direct state mutation bypasses shallow reference comparison in React reconciliation, causing components to fail to re-render.',
        concept_to_review: 'Review Lesson 2: Components, Props, State & Virtual DOM Architecture',
        options: [
          { id: 'opt-r2-1', text: 'It triggers an immediate compiler crash', is_correct: 0 },
          { id: 'opt-r2-2', text: 'Direct mutation bypasses React reconciliation and fails to trigger re-renders', is_correct: 1 },
          { id: 'opt-r2-3', text: 'JavaScript does not support object mutation', is_correct: 0 },
          { id: 'opt-r2-4', text: 'It creates memory leaks in the browser network tab', is_correct: 0 }
        ]
      },
      {
        id: 'q-react-3',
        prompt: 'True or False: The Virtual DOM directly commands the browser GPU to paint pixels onto the display canvas.',
        question_type: 'TRUE_FALSE',
        marks: 1.0,
        explanation: 'False. The Virtual DOM is a lightweight in-memory tree of JavaScript objects. React computes diffs and commits minimal patches to the real DOM.',
        concept_to_review: 'Review Lesson 1: React Introduction, Virtual DOM & Project Setup',
        options: [
          { id: 'opt-r3-1', text: 'True', is_correct: 0 },
          { id: 'opt-r3-2', text: 'False', is_correct: 1 }
        ]
      },
      {
        id: 'q-react-4',
        prompt: 'Which of the following are foundational principles of Redux state architecture? (Select all that apply)',
        question_type: 'MULTIPLE_CHOICE',
        marks: 1.0,
        explanation: 'The three principles of Redux: 1. Single source of truth, 2. State is read-only, 3. Changes are made with pure reducer functions.',
        concept_to_review: 'Review Lesson 3: Redux Data Flow & Single Page Architecture',
        options: [
          { id: 'opt-r4-1', text: 'Single source of truth (single store)', is_correct: 1 },
          { id: 'opt-r4-2', text: 'State is read-only (changes dispatched via actions)', is_correct: 1 },
          { id: 'opt-r4-3', text: 'State is directly mutated inside components', is_correct: 0 },
          { id: 'opt-r4-4', text: 'Changes are made with pure reducer functions', is_correct: 1 }
        ]
      },
      {
        id: 'q-react-5',
        prompt: 'Which React hook is used to perform side effects such as data fetching or subscriptions in functional components?',
        question_type: 'SHORT_ANSWER',
        marks: 1.0,
        explanation: 'useEffect accepts an effect callback and a dependency array to synchronize component state with external systems.',
        concept_to_review: 'Review Lesson 2: Components, Props, State & Virtual DOM Architecture',
        options: [
          { id: 'opt-r5-1', text: 'useEffect', is_correct: 1 }
        ]
      }
    ]
  },

  // Module 6: Backend Services, Databases & Cloud Deployment
  {
    id: 'quiz-mod-6',
    moduleId: 'mod-fs-6',
    title: 'Quiz: Backend Services, SQL & Cloud Deployment',
    description: 'Verify understanding of ACID transaction semantics, HTTP REST standards, SQL indexing, and deployment pipelines.',
    passing_percentage: 75.0,
    time_limit_minutes: 20,
    max_attempts: 5,
    questions: [
      {
        id: 'q-fs-1',
        prompt: 'In relational database design, what does the ACID property "Isolation" guarantee?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: 'Isolation guarantees that concurrent transactions execute without interfering with one another, preventing dirty reads and race conditions.',
        concept_to_review: 'Review Lesson 2: Relational Database Design, SQL & Cloud Deployment',
        options: [
          { id: 'opt-f1-1', text: 'All operations succeed or all fail together', is_correct: 0 },
          { id: 'opt-f1-2', text: 'Concurrent transactions execute without interfering with one another', is_correct: 1 },
          { id: 'opt-f1-3', text: 'Committed data survives system crashes and power loss', is_correct: 0 },
          { id: 'opt-f1-4', text: 'Database state always satisfies schema constraints', is_correct: 0 }
        ]
      },
      {
        id: 'q-fs-2',
        prompt: 'Which HTTP status code should a REST API return to indicate that a new resource was successfully created?',
        question_type: 'SINGLE_CHOICE',
        marks: 1.0,
        explanation: '201 Created signifies that the request has succeeded and led to the creation of a new resource.',
        concept_to_review: 'Review Lesson 1: Java Web Development, MVC & Spring Services',
        options: [
          { id: 'opt-f2-1', text: '200 OK', is_correct: 0 },
          { id: 'opt-f2-2', text: '201 Created', is_correct: 1 },
          { id: 'opt-f2-3', text: '204 No Content', is_correct: 0 },
          { id: 'opt-f2-4', text: '302 Found', is_correct: 0 }
        ]
      },
      {
        id: 'q-fs-3',
        prompt: 'True or False: Adding a B-Tree index to every column of a SQL table will universally speed up INSERT and UPDATE performance.',
        question_type: 'TRUE_FALSE',
        marks: 1.0,
        explanation: 'False. While indices accelerate SELECT queries, every INSERT, UPDATE, and DELETE must also rebalance the index tree, adding write overhead.',
        concept_to_review: 'Review Lesson 2: Relational Database Design, SQL & Cloud Deployment',
        options: [
          { id: 'opt-f3-1', text: 'True', is_correct: 0 },
          { id: 'opt-f3-2', text: 'False', is_correct: 1 }
        ]
      },
      {
        id: 'q-fs-4',
        prompt: 'Which of the following SQL clauses can filter aggregated results generated by a GROUP BY clause? (Select all that apply)',
        question_type: 'MULTIPLE_CHOICE',
        marks: 1.0,
        explanation: 'HAVING filters groups of rows after aggregation, whereas WHERE filters individual rows before aggregation occurs.',
        concept_to_review: 'Review Lesson 2: Relational Database Design, SQL & Cloud Deployment',
        options: [
          { id: 'opt-f4-1', text: 'HAVING', is_correct: 1 },
          { id: 'opt-f4-2', text: 'WHERE', is_correct: 0 },
          { id: 'opt-f4-3', text: 'ORDER BY', is_correct: 0 },
          { id: 'opt-f4-4', text: 'LIMIT', is_correct: 0 }
        ]
      },
      {
        id: 'q-fs-5',
        prompt: 'Which SQL keyword constraint is used to ensure a column cannot store duplicate values across rows?',
        question_type: 'SHORT_ANSWER',
        marks: 1.0,
        explanation: 'The UNIQUE constraint ensures that all values in a column or group of columns are distinct.',
        concept_to_review: 'Review Lesson 2: Relational Database Design, SQL & Cloud Deployment',
        options: [
          { id: 'opt-f5-1', text: 'UNIQUE', is_correct: 1 }
        ]
      }
    ]
  }
];
