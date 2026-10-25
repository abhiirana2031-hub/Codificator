export const courseCategories = [
  "All Courses",
  "Full-Stack & APIs",
  "DSA & Placements",
  "Programming & Systems",
  "System Design"
];

export const coursesList = [
  {
    id: "course-fullstack-web",
    title: "Full Stack Web Development",
    category: "Full-Stack & APIs",
    level: "Intermediate",
    price: 249,
    originalPrice: 499,
    free: false,
    thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80",
    instructor: "Sandeep Jain & Ananya Verma",
    description: "Production-ready curriculum with sequential module progression: HTML5, CSS Grid/Flexbox, JavaScript ESNext, React 19, Node.js, Express, PostgreSQL, and verifiable certification.",
    highlights: [
      "Sequential Module Unlocking Engine (Backend Enforced)",
      "Automated Quizzes & Graded Capstone Assignments",
      "Interactive Video Player with Watched Progress Sync",
      "Cryptographically Verifiable Completion Certificate"
    ],
    modules: [
      {
        id: "mod-fs-1",
        title: "Module 1: HTML Fundamentals",
        lessons: [
          { id: "les-m1-1", title: "Lesson 1: Introduction to HTML", duration: "22 min" },
          { id: "les-m1-2", title: "Lesson 2: HTML Document Structure", duration: "28 min" },
          { id: "les-m1-3", title: "Lesson 3: Headings, Paragraphs and Links", duration: "20 min" },
          { id: "les-m1-4", title: "Lesson 4: Images and Lists", duration: "25 min" },
          { id: "les-m1-5", title: "Lesson 5: HTML Forms", duration: "35 min" }
        ]
      },
      {
        id: "mod-fs-2",
        title: "Module 2: CSS Fundamentals",
        lessons: [
          { id: "les-m2-1", title: "Lesson 1: Introduction to CSS", duration: "25 min" },
          { id: "les-m2-2", title: "Lesson 2: CSS Selectors", duration: "20 min" },
          { id: "les-m2-3", title: "Lesson 3: Colors and Typography", duration: "30 min" },
          { id: "les-m2-4", title: "Lesson 4: Flexbox and Grid", duration: "45 min" }
        ]
      },
      {
        id: "mod-fs-3",
        title: "Module 3: JavaScript",
        lessons: [
          { id: "les-m3-1", title: "Lesson 1: JavaScript Execution Model & Variables", duration: "35 min" },
          { id: "les-m3-2", title: "Lesson 2: Functions, Scope & Closures", duration: "30 min" },
          { id: "les-m3-3", title: "Lesson 3: DOM Manipulation & Event Handling", duration: "40 min" },
          { id: "les-m3-4", title: "Lesson 4: Asynchronous JavaScript & Fetch API", duration: "45 min" }
        ]
      },
      {
        id: "mod-fs-4",
        title: "Module 4: React.js",
        lessons: [
          { id: "les-m4-1", title: "Lesson 1: React Component Architecture & JSX", duration: "40 min" },
          { id: "les-m4-2", title: "Lesson 2: State, Props & Lifecycle Hooks", duration: "35 min" }
        ]
      },
      {
        id: "mod-fs-5",
        title: "Module 5: Node.js and Express",
        lessons: [
          { id: "les-m5-1", title: "Lesson 1: Node.js Runtime & Event Loop", duration: "40 min" },
          { id: "les-m5-2", title: "Lesson 2: RESTful API Design with Express", duration: "30 min" }
        ]
      },
      {
        id: "mod-fs-6",
        title: "Module 6: Database and Deployment",
        lessons: [
          { id: "les-m6-1", title: "Lesson 1: Relational Database Modeling & PostgreSQL", duration: "45 min" },
          { id: "les-m6-2", title: "Lesson 2: Cloud Deployment, Docker & CI/CD", duration: "50 min" }
        ]
      }
    ]
  },
  {
    id: "course-dsa-java",
    title: "Data Structures & Algorithms in Java & C++",
    category: "DSA & Placements",
    level: "Beginner to Advanced",
    price: 199,
    originalPrice: 399,
    free: false,
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
    instructor: "Sandeep Jain",
    description: "Master Arrays, Trees, Dynamic Programming, Graphs, and problem-solving patterns required for product company technical interviews.",
    highlights: [
      "150+ Curated Interview Problems with Video Walkthroughs",
      "Memory Complexity & Big-O Intuition",
      "Interactive Code Judge & Auto-graded Test Cases",
      "Systematic Placement Preparation Roadmap"
    ],
    modules: [
      {
        id: "mod-dsa-1",
        title: "Unit 1: Arrays, Two Pointers & Sliding Window",
        lessons: [
          { id: "les-dsa-1-1", title: "Memory Allocation, Traversal & Kadane's Algorithm", duration: "30 min" },
          { id: "les-dsa-1-2", title: "Prefix Sums, Hashing & Two Pointers Approach", duration: "40 min" },
          { id: "les-dsa-1-3", title: "Sliding Window Pattern & Binary Search Boundaries", duration: "45 min" }
        ]
      },
      {
        id: "mod-dsa-2",
        title: "Unit 2: Recursion, Trees & Dynamic Programming",
        lessons: [
          { id: "les-dsa-2-1", title: "Binary Trees, Traversals & Level Order BFS", duration: "35 min" },
          { id: "les-dsa-2-2", title: "Binary Search Trees & LCA", duration: "30 min" },
          { id: "les-dsa-2-3", title: "1D and 2D Dynamic Programming (Knapsack, LCS)", duration: "55 min" }
        ]
      }
    ]
  },
  {
    id: "course-system-design",
    title: "System Design & Distributed Architectures",
    category: "System Design",
    level: "Advanced",
    price: 349,
    originalPrice: 699,
    free: false,
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
    instructor: "Dr. Arjun Roy",
    description: "High-level and low-level system design: microservices, caching, message queues, database sharding, CAP theorem, and scalability.",
    highlights: [
      "HLD Real-World Case Studies (URL Shortener, Chat System, Rate Limiter)",
      "Database Sharding, Replication & Consistent Hashing",
      "Kafka Event Streaming & Redis Caching Strategies",
      "Comprehensive Architecture Interview Prep"
    ],
    modules: [
      {
        id: "mod-sd-1",
        title: "Unit 1: Fundamentals of Distributed Systems",
        lessons: [
          { id: "les-sd-1-1", title: "Scalability Patterns: Vertical vs Horizontal", duration: "30 min" },
          { id: "les-sd-1-2", title: "Load Balancing Algorithms & Reverse Proxies", duration: "35 min" },
          { id: "les-sd-1-3", title: "Consistent Hashing & Distributed Caching", duration: "45 min" }
        ]
      },
      {
        id: "mod-sd-2",
        title: "Unit 2: Databases & Asynchronous Messaging",
        lessons: [
          { id: "les-sd-2-1", title: "SQL vs NoSQL: ACID vs BASE Guarantees", duration: "40 min" },
          { id: "les-sd-2-2", title: "Message Queues: RabbitMQ vs Apache Kafka", duration: "45 min" },
          { id: "les-sd-2-3", title: "Designing a Distributed Rate Limiter", duration: "50 min" }
        ]
      }
    ]
  }
];
