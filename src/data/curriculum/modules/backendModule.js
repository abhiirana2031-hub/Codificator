import { verifiedLicenses } from '../licenseRegistry';

export const backendModule = {
  id: "backend-apis",
  courseId: "backend-apis",
  title: "Backend Engineering: Node.js, Express & REST/GraphQL",
  category: "Full-Stack & APIs",
  level: "Intermediate to Advanced",
  rating: 4.94,
  reviewsCount: 13500,
  studentsCount: "350k+",
  instructor: "HackYourFuture Architecture Team & Node.js Core Contributors",
  bannerGradient: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
  badge: "CC-BY-4.0 Flagship",
  description: "Production backend engineering adapted from HackYourFuture curriculum: Node.js libuv event loop, non-blocking I/O, streams & buffers, Express middleware pipeline, REST API contract design, JWT authentication, and connection pooling.",
  highlights: [
    "Node.js single-threaded event loop and libuv thread pool architecture (file I/O, crypto, dns)",
    "Express.js middleware chaining, error-handling middleware patterns, and request validation",
    "Stateless authentication using JSON Web Tokens (JWT), refresh tokens, and bcrypt hashing",
    "Automated unit testing with in-browser assertion runner for API logic and data structures"
  ],
  modules: [
    {
      id: "back-m1",
      title: "Module 1: The Node.js Runtime & Middleware Architectures",
      chapters: [
        {
          id: "back-m1-c1",
          title: "Chapter 1: Libuv Architecture, Streams & Express Middleware Pipeline",
          lessons: [
            {
              id: "back-m1-c1-l1",
              title: "Libuv Non-Blocking I/O, Node.js Streams & Express Middleware Execution",
              estimatedReadTime: "17 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",

              // 1. Learning Objectives
              objectives: [
                "Deconstruct the Node.js architecture: V8 JavaScript engine, libuv C library, and the event loop phases (timers, pending, idle/prepare, poll, check, close).",
                "Construct high-throughput streaming pipelines using Readable, Writable, and Transform streams to prevent memory exhaustion.",
                "Design robust Express middleware pipelines with centralized error handling and JWT authorization gates."
              ],

              // 2. Prerequisites
              prerequisites: [
                { title: "JavaScript asynchronous programming (Promises, async/await)" },
                { title: "HTTP protocol basics (headers, methods, status codes, query vs body)" }
              ],

              // 3. Detailed Original Explanations
              explanation: `### The Node.js Architecture: V8 & Libuv

Node.js is neither a language nor a framework—it is a C++ runtime that executes JavaScript outside the browser. It marries two fundamental components:

1. **Google V8**: Compiles JavaScript source code directly into machine code (Just-In-Time compilation) and executes the single-threaded call stack.
2. **libuv**: A multi-platform C library that handles the Event Loop, asynchronous I/O (epoll on Linux, kqueue on macOS, IOCP on Windows), and a 4-thread default worker pool.

\`\`\`
  +-------------------------------------------------------+
  |              Node.js Standard Library                 |
  |              (fs, http, crypto, net, path)            |
  +-------------------------------------------------------+
  |             Node.js C++ Bindings & Addons             |
  +---------------------------+---------------------------+
  |      Google V8 Engine     |       libuv Library       |
  | (JS Parsing, JIT, Heap)   | (Event Loop, Thread Pool) |
  +---------------------------+---------------------------+
  |                     Operating System                  |
  |             (epoll / kqueue / IOCP / Threads)         |
  +-------------------------------------------------------+
\`\`\`

#### The 6 Phases of the libuv Event Loop
Every tick of the Node.js event loop executes in a defined cycle:
1. **Timers**: Executes callbacks scheduled by \`setTimeout()\` and \`setInterval()\`.
2. **Pending Callbacks**: Executes I/O callbacks deferred to the next loop iteration (e.g., some system-level TCP errors).
3. **Idle, Prepare**: Used internally by libuv.
4. **Poll**: Retrieves new I/O events (incoming network connections, read data). The loop will block here waiting for incoming requests if no timers are active.
5. **Check**: Executes \`setImmediate()\` callbacks.
6. **Close Callbacks**: Executes close event handlers (e.g., \`socket.on('close', ...)\`).

*Note on \`process.nextTick()\`*: \`nextTickQueue\` is **not** part of libuv. It is processed immediately after the current operation completes, before the event loop advances to the next phase!

---

### Memory-Safe Streaming: Streams vs Buffers

Loading an entire $2\\text{ GB}$ video or database dump into memory via \`fs.readFile()\` will exceed V8's default $1.4\\text{ GB}$ heap limit and crash the process with an \`Out of Memory\` (OOM) error.

**Streams** process data sequentially in small chunks (typically $64\\text{ KB}$ for high-water marks).
- **Readable Stream**: Source of data (\`fs.createReadStream\`, \`req\` in HTTP).
- **Writable Stream**: Destination (\`fs.createWriteStream\`, \`res\` in HTTP).
- **Transform Stream**: Modifies chunks on the fly (e.g., gzip compression, encryption).
- **Backpressure**: When a writable stream cannot write as fast as the readable stream reads, libuv pauses reading until the buffer drains, preventing memory ballooning.`,

              // 4. Definitions and Key Concepts
              keyConcepts: [
                {
                  term: "libuv",
                  definition: "A C library providing the event loop and asynchronous I/O abstractions across operating systems, utilizing OS kernel notifications and a background worker pool."
                },
                {
                  term: "Backpressure",
                  definition: "A flow-control mechanism in stream processing where a slow consumer signals a fast producer to pause data emission until buffers drain."
                },
                {
                  term: "Middleware",
                  definition: "Functions in an Express request-response pipeline that have access to req, res, and next, capable of transforming data, authenticating sessions, or terminating requests."
                },
                {
                  term: "Thread Pool",
                  definition: "A pool of background C threads (default 4, configurable via UV_THREADPOOL_SIZE) used by libuv to perform CPU-intensive tasks like file I/O, DNS resolution, and cryptographic hashing without blocking the main JS thread."
                }
              ],

              // 5. Step-by-Step Worked Examples
              workedExamples: [
                {
                  title: "Tracing Express Middleware Chain & Error Propagation",
                  scenario: "Trace how an incoming HTTP request traverses an authentication middleware, a validation middleware, and a controller, with error routing.",
                  steps: [
                    {
                      stepNumber: 1,
                      action: "Incoming Request",
                      stateSnapshot: "HTTP GET /api/v1/orders arrives. Express invokes first middleware: cors()."
                    },
                    {
                      stepNumber: 2,
                      action: "Auth Middleware Execution",
                      stateSnapshot: "authMiddleware checks Authorization header. JWT is verified; req.user = { id: 42 } is attached. Calls next()."
                    },
                    {
                      stepNumber: 3,
                      action: "Validation Middleware Failure",
                      stateSnapshot: "validateOrder checks query params. Param ?limit=-5 is invalid. Middleware creates AppError('Invalid limit', 400) and calls next(err)."
                    },
                    {
                      stepNumber: 4,
                      action: "Bypass Standard Route Handlers",
                      stateSnapshot: "Because next() received an argument, Express skips all remaining standard route handlers and jumps to the error-handling middleware."
                    },
                    {
                      stepNumber: 5,
                      action: "Centralized Error Responder",
                      stateSnapshot: "errorHandler(err, req, res, next) formats JSON response: { success: false, error: 'Invalid limit' } with HTTP 400."
                    }
                  ],
                  result: "Client receives structured HTTP 400 Bad Request response; server remains stable without unhandled promise rejections."
                }
              ],

              // 6. Production Code Snippets
              codeSnippets: [
                {
                  language: "javascript",
                  title: "Express Middleware Pipeline & Centralized Error Handler",
                  code: `const express = require('express');
const app = express();

app.use(express.json());

// 1. Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    const err = new Error('Missing authentication token');
    err.statusCode = 401;
    return next(err); // Route directly to error handler
  }

  // Token verification logic...
  req.user = { userId: 'usr_8492' };
  next(); // Pass control to next middleware
};

// 2. Protected Route
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// 3. Centralized 4-Parameter Error Middleware
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  console.error('[API Error]:', err.message);
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});`,
                  annotation: "Express identifies error-handling middleware specifically by having 4 arguments: (err, req, res, next). Always pass unexpected errors to next(err)."
                }
              ],

              // 7. Common Mistakes and Corrections
              pitfalls: [
                {
                  mistake: "Blocking the main thread with heavy synchronous computations (e.g., JSON.parse on 100MB string, crypto.pbkdf2Sync, or infinite loops).",
                  whyItHappens: "Developers forget that Node.js executes JavaScript on a single thread; heavy computation starves all concurrent HTTP requests.",
                  correction: "Offload CPU-bound tasks to Worker Threads (worker_threads) or use asynchronous non-blocking APIs."
                },
                {
                  mistake: "Calling res.json() and forgetting to return, then calling next() or another res.send().",
                  whyItHappens: "Results in the dreaded 'Error: Cannot set headers after they are sent to the client'.",
                  correction: "Always write 'return res.json(...)' or structure conditionals to prevent multiple response writes."
                }
              ],

              // 8. Diagrams and Structured Reference Tables
              visualAids: [
                {
                  type: "comparison-table",
                  title: "Node.js Asynchronous Execution Primitives",
                  content: `| Mechanism | Phase Scheduled | Typical Use Case |
|---|---|---|
| \`process.nextTick()\` | Immediately after current operation | Resolving errors before I/O starts, microtask pre-empt |
| \`Promise.then()\` | Microtask queue (end of tick) | Standard async promise resolution |
| \`setImmediate()\` | Libuv 'Check' phase | Running callback immediately after poll I/O completes |
| \`setTimeout(fn, 0)\` | Libuv 'Timers' phase | Minimum threshold timer execution |`
                }
              ],

              // 9. Practice Exercises (With Automated Unit Test Runner)
              exercises: [
                {
                  difficulty: "Medium",
                  prompt: "Implement a URL Query Parameter Sanitizer function 'sanitizeQueryParams(query, allowedKeys)'. It takes a query object and a whitelist array of allowed keys, returns a sanitized object containing only allowed keys with trimmed string values, and discards any prototype pollution attempts (__proto__, constructor).",
                  hint: "Iterate over allowedKeys and copy existing properties using Object.prototype.hasOwnProperty.",
                  starterCode: `function sanitizeQueryParams(query, allowedKeys) {
  const sanitized = {};
  if (!query || typeof query !== 'object') return sanitized;

  allowedKeys.forEach(key => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const val = query[key];
      sanitized[key] = typeof val === 'string' ? val.trim() : val;
    }
  });

  return sanitized;
}`,
                  testCases: [
                    {
                      input: { query: { name: "  John Doe  ", age: 30, role: "admin", hacker: "script" }, allowedKeys: ["name", "age"] },
                      expected: { name: "John Doe", age: 30 }
                    },
                    {
                      input: { query: { __proto__: { admin: true }, search: "react" }, allowedKeys: ["__proto__", "search"] },
                      expected: { search: "react" }
                    }
                  ]
                }
              ],

              // 10. Concept Checkpoint Quiz
              quiz: [
                {
                  question: "What is the primary architectural difference between setImmediate() and setTimeout(fn, 0) in Node.js?",
                  options: [
                    "setImmediate() runs in the Check phase after Poll I/O, whereas setTimeout runs in the Timers phase.",
                    "setTimeout(fn, 0) runs on a separate OS thread while setImmediate runs on the main thread.",
                    "setImmediate() is deprecated in modern Node.js versions.",
                    "setTimeout(fn, 0) is guaranteed to execute before process.nextTick()."
                  ],
                  correctIndex: 0,
                  explanation: "In Node.js, setImmediate() is designed to execute a script once the current Poll phase completes (during the Check phase). setTimeout(fn, 0) runs in the Timers phase once the minimum millisecond threshold elapses."
                }
              ],

              // 11. Chapter Summary & Revision Notes
              summary: {
                takeaways: [
                  "Node.js runs single-threaded JavaScript code on V8, while libuv manages non-blocking I/O and the worker thread pool.",
                  "Streams prevent memory exhaustion by processing chunks incrementally with automatic backpressure.",
                  "Express middleware functions pass control down the pipeline with next(), while next(err) jumps directly to 4-parameter error handlers."
                ],
                quickCheatSheet: "UV_THREADPOOL_SIZE default is 4. Increase for high-concurrency crypto/fs workloads. Express error handlers must have 4 parameters: (err, req, res, next)."
              },

              // 12. Further Reading & Licensing Provenance
              metadata: {
                furtherReading: [
                  {
                    title: "HackYourFuture: Node.js Curriculum & REST APIs",
                    url: "https://github.com/HackYourFuture/curriculum/blob/master/Node.js/README.md",
                    annotation: "Modular guide to building server applications, routing, and database integrations."
                  },
                  {
                    title: "Node.js Official Event Loop Documentation",
                    url: "https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/",
                    annotation: "Definitive breakdown of Event Loop phases, timers, and process.nextTick()."
                  }
                ],
                licenseRecord: verifiedLicenses["lic-hackyourfuture"]
              }
            }
          ]
        }
      ]
    }
  ]
};
