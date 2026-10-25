// Database Management Systems & PostgreSQL 18 Curriculum Module
// Based on "PostgreSQL 18.6 Documentation" (PostgreSQL Global Development Group)

export const dbmsModule = {
  id: "dbms-postgresql",
  courseId: "dbms-postgresql",
  title: "Database Management Systems & PostgreSQL 18 Architecture",
  category: "Computer Science Core",
  level: "Beginner to Advanced",
  rating: 4.97,
  reviewsCount: 14800,
  studentsCount: "350k+",
  instructor: "PostgreSQL Global Development Group & Codificator Systems Team",
  bannerGradient: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
  badge: "PostgreSQL 18 Flagship • Official Documentation",
  description: "Exhaustive database systems curriculum based on the official PostgreSQL 18 documentation. Covers relational algebra, SQL DDL/DML, advanced queries, window functions, indexing architectures (B-Tree, GIN, BRIN, Hash), Multi-Version Concurrency Control (MVCC), Write-Ahead Logging (WAL), buffer pools, and query plan optimization with EXPLAIN ANALYZE.",
  highlights: [
    "Official curriculum adapted from PostgreSQL 18.6 Documentation",
    "SQL mastery: DDL constraints, complex joins, Common Table Expressions (CTEs), and window functions",
    "Physical storage internals: 8KB page layout, PageHeaderData, ItemId pointers, and tuple headers (xmin/xmax)",
    "Index architectures: B-Tree internal nodes, Hash, GIN for JSONB, and BRIN for big-data time-series",
    "ACID concurrency control: MVCC snapshot isolation, transaction anomalies, vacuuming, and autovacuum",
    "Query planner and execution engine: sequential scans, index scans, bitmap scans, hash joins, and merge joins"
  ],
  modules: [
    {
      id: "dbms-m1",
      title: "Module 1: Relational Foundations, SQL Syntax & Schema Design",
      chapters: [
        {
          id: "dbms-m1-c1",
          title: "Chapter 1: Relational Model, Data Definition & Advanced SQL",
          lessons: [
            {
              id: "dbms-m1-c1-l1",
              title: "Relational Model, Data Types, Constraints & DDL Schema Architecture",
              estimatedReadTime: "22 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Understand the relational model: Relations (Tables), Tuples (Rows), and Attributes (Columns).",
                "Utilize PostgreSQL 18 data types: numeric, integer, text, varchar, timestamp with time zone, boolean, JSONB, and UUID.",
                "Enforce relational integrity using PRIMARY KEY, FOREIGN KEY (ON DELETE CASCADE), UNIQUE, CHECK, and NOT NULL.",
                "Execute DDL statements: CREATE TABLE, ALTER TABLE, DROP TABLE, and TRUNCATE."
              ],
              prerequisites: [
                { title: "Basic understanding of data storage and file systems" }
              ],
              notes: `## Relational Data Model & PostgreSQL 18 Architecture

PostgreSQL is an advanced, enterprise-grade open-source **object-relational database management system (ORDBMS)** originally derived from the POSTGRES project at the University of California, Berkeley.

---

## 1. Relational Model Terminology

| Mathematical Concept | Relational Term | Database Physical Entity |
|---|---|---|
| Relation | Table | Relation file (\`base/database_oid/rel_filenode\`) |
| Tuple | Row / Record | Physical Item / Heap Tuple |
| Attribute | Column / Field | Named column with explicit data type |
| Cardinality | Number of rows | Total tuple count |
| Degree / Arity | Number of columns | Number of attributes |

---

## 2. PostgreSQL 18 Schema Creation with Integrity Constraints

\`\`\`sql
-- Create custom enum type
CREATE TYPE enrollment_status AS ENUM ('enrolled', 'completed', 'dropped');

-- Create Courses table with primary key and domain check constraint
CREATE TABLE courses (
    course_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    credits INT NOT NULL CHECK (credits > 0 AND credits <= 10),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create Students table with unique email constraint
CREATE TABLE students (
    student_id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Junction table with composite foreign key and cascade deletion
CREATE TABLE enrollments (
    enrollment_id BIGSERIAL PRIMARY KEY,
    student_id BIGINT REFERENCES students(student_id) ON DELETE CASCADE,
    course_id VARCHAR(64) REFERENCES courses(course_id) ON DELETE RESTRICT,
    status enrollment_status DEFAULT 'enrolled',
    grade NUMERIC(3, 2) CHECK (grade >= 0.0 AND grade <= 4.0),
    enrolled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
);
\`\`\`

---

## 3. Data Integrity Constraints

1. **PRIMARY KEY**: Enforces both uniqueness and NOT NULL on identifying columns; automatically creates a unique B-Tree index.
2. **FOREIGN KEY**: Guarantees referential integrity between tables.
   - \`ON DELETE CASCADE\`: Deleting parent automatically removes dependent children rows.
   - \`ON DELETE RESTRICT\`: Rejects deletion of parent if child references exist.
3. **CHECK Constraints**: Evaluates a boolean expression on every row insertion or update.
4. **JSONB**: Binary JSON storage format in PostgreSQL supporting indexing via GIN (Generalized Inverted Index).`,
              quiz: [
                {
                  question: "What occurs if an ON DELETE CASCADE clause is specified on a foreign key and the referenced parent row is deleted?",
                  options: [
                    "An error is raised preventing deletion",
                    "The foreign key columns in child rows are set to NULL",
                    "All referencing child rows are automatically deleted",
                    "The parent row is marked inactive without deleting"
                  ],
                  correctIndex: 2,
                  explanation: "ON DELETE CASCADE automatically propagates deletion from the parent table to all matching rows in referencing child tables."
                }
              ]
            },
            {
              id: "dbms-m1-c1-l2",
              title: "Complex Queries: Joins, Aggregations, Window Functions & CTEs",
              estimatedReadTime: "25 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Master relational joins: INNER JOIN, LEFT OUTER JOIN, RIGHT OUTER JOIN, and FULL OUTER JOIN.",
                "Execute aggregate queries with GROUP BY, HAVING, and FILTER clauses.",
                "Implement Window Functions (ROW_NUMBER(), RANK(), DENSE_RANK(), LAG(), LEAD(), OVER(PARTITION BY)).",
                "Construct modular Common Table Expressions (CTEs) using WITH and recursive CTEs."
              ],
              prerequisites: [
                { title: "Lesson 1: Relational Model and DDL Schema Architecture" }
              ],
              notes: `## Advanced SQL: Joins, Window Functions & CTEs

---

## 1. Relational Joins

- **INNER JOIN**: Returns rows only when keys match in both relations.
- **LEFT OUTER JOIN**: Returns all rows from left table, with NULLs for non-matching right table columns.
- **FULL OUTER JOIN**: Returns all rows from both tables, filling missing matches with NULLs.

\`\`\`sql
SELECT 
    s.student_id,
    s.full_name,
    c.title AS course_title,
    e.status,
    COALESCE(e.grade, 0.0) AS final_grade
FROM students s
INNER JOIN enrollments e ON s.student_id = e.student_id
INNER JOIN courses c ON e.course_id = c.course_id
WHERE e.status = 'enrolled';
\`\`\`

---

## 2. Window Functions (\`OVER (PARTITION BY ...)\`)

Unlike \`GROUP BY\` (which collapses rows into a single summary row), **Window Functions** compute aggregate or analytical metrics across related rows while retaining each individual row:

\`\`\`sql
SELECT 
    student_id,
    course_id,
    grade,
    -- Rank students within each course by grade descending
    DENSE_RANK() OVER (
        PARTITION BY course_id 
        ORDER BY grade DESC
    ) AS class_rank,
    -- Calculate difference from the average grade of that specific course
    ROUND(grade - AVG(grade) OVER (PARTITION BY course_id), 2) AS diff_from_avg
FROM enrollments
WHERE grade IS NOT NULL;
\`\`\`

---

## 3. Common Table Expressions (CTEs)

\`\`\`sql
WITH CourseStats AS (
    SELECT 
        course_id,
        COUNT(student_id) AS total_enrolled,
        AVG(grade) AS average_grade
    FROM enrollments
    GROUP BY course_id
)
SELECT 
    c.title,
    cs.total_enrolled,
    ROUND(cs.average_grade, 2) AS avg_grade
FROM courses c
JOIN CourseStats cs ON c.course_id = cs.course_id
WHERE cs.total_enrolled >= 5;
\`\`\``,
              quiz: [
                {
                  question: "What differentiates a Window Function from a GROUP BY aggregation in SQL?",
                  options: [
                    "Window functions only operate on numeric columns",
                    "Window functions preserve individual row identities while calculating group metrics",
                    "Window functions run before WHERE filtering",
                    "Window functions can only be used in UPDATE queries"
                  ],
                  correctIndex: 1,
                  explanation: "Window functions calculate metrics across a partition of rows without collapsing the underlying rows into a single record."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "dbms-m2",
      title: "Module 2: Storage Internals, Indexing & Concurrency (MVCC)",
      chapters: [
        {
          id: "dbms-m2-c1",
          title: "Chapter 2: Physical Page Layout, Index Architectures & Concurrency",
          lessons: [
            {
              id: "dbms-m2-c1-l1",
              title: "PostgreSQL 8KB Page Layout, B-Tree, GIN, BRIN & Hash Indexes",
              estimatedReadTime: "28 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Deconstruct the PostgreSQL 8KB physical heap page: PageHeaderData, ItemId array, and Free Space.",
                "Understand B-Tree internal node fanout and leaf node doubly linked list traversal.",
                "Analyze GIN (Generalized Inverted Index) for high-performance JSONB and full-text search.",
                "Apply BRIN (Block Range Index) for massive multi-terabyte time-series data.",
                "Interpret EXPLAIN and EXPLAIN ANALYZE execution plans."
              ],
              prerequisites: [
                { title: "Module 1: Relational Foundations and SQL Queries" }
              ],
              notes: `## Physical Storage & Index Internals

In PostgreSQL, all tables and indexes are stored on disk in fixed-size blocks called **Pages** (default size: **8 KB**).

---

## 1. The PostgreSQL 8KB Page Architecture

\`\`\`
+---------------------------------------------------------------+
| PageHeaderData (24 bytes: LSN, checksum, pd_lower, pd_upper)  |
+---------------------------------------------------------------+
| ItemIdArray [ ItemId1, ItemId2, ItemId3 ... ]                 |
| (Line pointers growing downwards towards free space)           |
+---------------------------------------------------------------+
|                        FREE SPACE                             |
+---------------------------------------------------------------+
| HeapTupleData (Actual tuple records growing upwards from end) |
+---------------------------------------------------------------+
| Special Space (Index-specific metadata at page end)          |
+---------------------------------------------------------------+
\`\`\`

- **ItemPointer (\`ctid\`)**: Tuple physical address consisting of \`(block_number, offset_number)\`.
- Pointers grow forward from the header; tuples grow backward from the bottom. When they meet, the page is full!

---

## 2. PostgreSQL 18 Index Architectures

1. **B-Tree Index (Default)**:
   - Self-balancing tree suitable for equality (\`=\`) and range queries (\`<, <=, >, >=, BETWEEN\`).
   - Leaf pages form a doubly linked list allowing efficient range scans without backtracking to the root.
2. **GIN (Generalized Inverted Index)**:
   - Stores \`{key -> list of tuple pointers}\`.
   - Optimized for multi-value documents: **JSONB**, array columns, and full-text search (\`tsvector\`).
3. **BRIN (Block Range Index)**:
   - Stores only the minimum and maximum value for each range of physical disk pages (e.g., 128 pages = 1 MB).
   - Extremely compact (kilobytes instead of gigabytes) for naturally ordered time-series data.
4. **Hash Index**:
   - Provides constant time $O(1)$ lookups for direct equality checks (\`=\`).

---

## 3. Query Plan Inspection: \`EXPLAIN ANALYZE\`

\`\`\`sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM enrollments WHERE student_id = 1042;
\`\`\`

Output indicates:
- **Scan Method**: Sequential Scan vs Index Scan vs Bitmap Heap Scan.
- **Cost**: Startup cost and total cost measured in arbitrary page fetch units.
- **Buffers**: Cache hits vs disk reads.`,
              quiz: [
                {
                  question: "Why is a BRIN (Block Range Index) exceptionally suited for multi-gigabyte append-only audit logs or time-series tables?",
                  options: [
                    "It builds a hash map of all individual rows",
                    "It only stores the min and max value for ranges of consecutive disk pages, resulting in tiny index size",
                    "It compresses text using Gzip",
                    "It replaces the heap file completely"
                  ],
                  correctIndex: 1,
                  explanation: "BRIN indexes store summary min/max metadata per block range, providing massive memory savings for physically sorted data."
                }
              ]
            },
            {
              id: "dbms-m2-c1-l2",
              title: "Transactions, ACID Properties, MVCC & Write-Ahead Logging (WAL)",
              estimatedReadTime: "26 min read",
              lastReviewedDate: "2026-10-20",
              reviewStatus: "verified",
              objectives: [
                "Define the ACID guarantees: Atomicity, Consistency, Isolation, and Durability.",
                "Understand Multi-Version Concurrency Control (MVCC) via xmin and xmax tuple headers.",
                "Prevent transaction anomalies: Dirty Reads, Non-Repeatable Reads, and Phantom Reads.",
                "Explain the role of Write-Ahead Logging (WAL) and checkpoints for crash recovery.",
                "Understand why VACUUM and autovacuum are necessary to reclaim dead tuples."
              ],
              prerequisites: [
                { title: "Lesson 1: Page Layout and Index Architectures" }
              ],
              notes: `## Transactions, MVCC & Write-Ahead Logging

A **Transaction** is a logical unit of database processing that includes one or more database access operations.

---

## 1. The ACID Guarantees

- **Atomicity**: All operations in the transaction succeed, or all are rolled back (\`COMMIT\` or \`ROLLBACK\`).
- **Consistency**: The database transitions from one valid state to another satisfying all schema constraints.
- **Isolation**: Concurrent transactions execute without interfering with one another.
- **Durability**: Once committed, changes survive power outages and crashes via persistent logs.

---

## 2. PostgreSQL MVCC (Multi-Version Concurrency Control)

In PostgreSQL:
> **"Readers never block writers, and writers never block readers."**

Instead of locking data rows for reading, PostgreSQL maintains multiple versions of each row using hidden header fields:
- **\`xmin\`**: The Transaction ID (XID) of the transaction that inserted the row.
- **\`xmax\`**: The Transaction ID of the transaction that deleted or updated the row (0 if row is alive).

When a row is updated:
1. PostgreSQL does **not overwrite** the existing row!
2. It sets \`xmax = current_xid\` on the old tuple.
3. It inserts a brand-new tuple with \`xmin = current_xid\`.
4. Concurrent transactions see the version corresponding to their snapshot!

---

## 3. The Need for \`VACUUM\`

Because updated and deleted tuples are not physically overwritten immediately, they become **dead tuples**.
- **\`VACUUM\`**: Scans pages and marks dead tuples space as reusable for future insertions.
- **\`VACUUM FULL\`**: Rewrites the entire table into a new file to compact disk space (requires exclusive table lock).
- **Autovacuum**: Daemon process that monitors write activity and triggers automatic vacuuming and statistics updates.

---

## 4. Write-Ahead Logging (WAL)

To ensure **Durability** without forcing slow, synchronous random disk writes on every \`COMMIT\`:
1. PostgreSQL writes changes sequentially to the **Write-Ahead Log (WAL)** buffer on disk before modifying the actual table data pages in the buffer pool.
2. In the event of a crash, recovery replays the WAL from the last **Checkpoint** to restore state.`,
              quiz: [
                {
                  question: "In PostgreSQL's MVCC implementation, what happens physically when an UPDATE statement modifies a row?",
                  options: [
                    "The row data is overwritten directly in place",
                    "The old row is marked with an xmax and a new row version with xmin is inserted",
                    "The table is locked exclusively until all readers disconnect",
                    "The change is kept only in RAM until server restart"
                  ],
                  correctIndex: 1,
                  explanation: "PostgreSQL inserts a new tuple version with the current transaction xmin and updates the xmax of the previous tuple, preserving concurrent reader snapshots."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
