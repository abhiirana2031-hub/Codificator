-- CODIFICATORS LMS DATABASE SCHEMA (SQLite / Relational SQL)
-- Enforces Foreign Keys, Relational Integrity, Unique Constraints, and Indexes

PRAGMA foreign_keys = ON;

-- 1. USERS & ROLES
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'INSTRUCTOR', 'STUDENT')),
  avatar_url TEXT,
  bio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. COURSES
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  thumbnail TEXT,
  category TEXT NOT NULL DEFAULT 'Computer Science',
  level TEXT NOT NULL DEFAULT 'Beginner to Intermediate',
  instructor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  estimated_duration TEXT DEFAULT '40 hours',
  price REAL DEFAULT 0,
  original_price REAL DEFAULT 0,
  is_published BOOLEAN DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  subtitle TEXT,
  target_audience TEXT,
  learning_objectives TEXT, -- JSON array of strings
  prerequisites TEXT,        -- JSON array of strings
  completion_requirements TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. COURSE INSTRUCTORS (Many-to-Many mapping for co-instructors)
CREATE TABLE IF NOT EXISTS course_instructors (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id, instructor_id)
);

-- 4. MODULES
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  estimated_duration TEXT DEFAULT '2 hours',
  is_published BOOLEAN DEFAULT 1,
  completion_policy TEXT NOT NULL DEFAULT 'POLICY_A_LESSONS' 
    CHECK (completion_policy IN ('POLICY_A_LESSONS', 'POLICY_B_QUIZ', 'POLICY_C_ASSIGNMENT', 'POLICY_D_SCORE')),
  min_passing_score REAL DEFAULT 70.0,
  prerequisite_module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. LESSONS (Text-First Architecture)
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (lesson_type IN ('TEXT', 'CODE', 'PDF', 'VIDEO')),
  text_content TEXT,
  content_markdown TEXT,
  is_preview BOOLEAN DEFAULT 0,
  is_admin_modified BOOLEAN DEFAULT 0,
  source_type TEXT DEFAULT 'IMPORTER',
  reading_time_minutes INTEGER DEFAULT 10,
  key_takeaways TEXT,          -- Structured JSON or Markdown summary of key learning points
  pdf_url TEXT,
  downloadable_resources TEXT, -- JSON array of {title, url, size}
  external_links TEXT,         -- JSON array of {title, url}
  duration_minutes INTEGER DEFAULT 15,
  order_index INTEGER NOT NULL DEFAULT 1,
  is_mandatory BOOLEAN DEFAULT 1,
  -- Deprecated legacy video fields retained solely for backward schema compatibility
  video_asset_id TEXT,
  video_url TEXT,
  video_threshold_percent INTEGER DEFAULT 90,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. LESSON RESOURCES (Downloadable files, guides, notes)
CREATE TABLE IF NOT EXISTS lesson_resources (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'application/pdf',
  file_size TEXT DEFAULT '1.5 MB',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DROPPED')),
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  progress_percent REAL DEFAULT 0.0,
  UNIQUE(user_id, course_id)
);

-- 8. LESSON PROGRESS
CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  last_playback_position REAL DEFAULT 0.0,
  video_duration REAL DEFAULT 0.0,
  watched_progress_percent REAL DEFAULT 0.0,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(enrollment_id, lesson_id)
);

-- 9. MODULE PROGRESS
CREATE TABLE IF NOT EXISTS module_progress (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT 0,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(enrollment_id, module_id)
);

-- 10. QUIZZES
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_percentage REAL DEFAULT 70.0,
  time_limit_minutes INTEGER DEFAULT 20,
  max_attempts INTEGER DEFAULT 3,
  is_required BOOLEAN DEFAULT 1,
  randomize_questions BOOLEAN DEFAULT 0,
  show_explanations BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'SINGLE_CHOICE' 
    CHECK (question_type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER')),
  marks REAL DEFAULT 1.0,
  explanation TEXT,
  concept_to_review TEXT,
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 12. QUIZ OPTIONS
CREATE TABLE IF NOT EXISTS quiz_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 13. QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  percentage REAL NOT NULL,
  is_passed BOOLEAN NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. QUIZ ANSWERS
CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_ids TEXT, -- JSON array of option IDs
  text_response TEXT,
  is_correct BOOLEAN DEFAULT 0,
  marks_awarded REAL DEFAULT 0.0
);

-- 15. ASSIGNMENTS
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  max_marks REAL DEFAULT 100.0,
  due_date DATETIME,
  is_required BOOLEAN DEFAULT 1,
  accepted_types TEXT DEFAULT 'text,zip,pdf,github',
  rubric TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. ASSIGNMENT SUBMISSIONS
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  content_text TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' 
    CHECK (status IN ('NOT_SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED')),
  marks_awarded REAL,
  feedback TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- 17. CERTIFICATES
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  certificate_code TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_id TEXT UNIQUE NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  completion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  template_version TEXT DEFAULT 'v1',
  verification_url TEXT
);

-- 18. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 19. CODING EXERCISES (Interactive Programming Exercises)
CREATE TABLE IF NOT EXISTS coding_exercises (
  id TEXT PRIMARY KEY,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Easy' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  points INTEGER DEFAULT 5,
  language TEXT NOT NULL DEFAULT 'python' CHECK (language IN ('python', 'javascript')),
  function_name TEXT NOT NULL,
  starter_code TEXT NOT NULL,
  sample_input TEXT,
  sample_output TEXT,
  hints TEXT, -- JSON array of strings
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 20. EXERCISE TEST CASES (Public & Backend-Protected Private Cases)
CREATE TABLE IF NOT EXISTS exercise_test_cases (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES coding_exercises(id) ON DELETE CASCADE,
  input_json TEXT NOT NULL,
  expected_output_json TEXT NOT NULL,
  is_private BOOLEAN DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 21. CODING SUBMISSIONS (Student Submission History & Automated Grading Records)
CREATE TABLE IF NOT EXISTS coding_submissions (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES coding_exercises(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id TEXT REFERENCES enrollments(id) ON DELETE SET NULL,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED', 'PENDING')),
  passed_tests INTEGER NOT NULL DEFAULT 0,
  total_tests INTEGER NOT NULL DEFAULT 0,
  runtime_ms REAL DEFAULT 0.0,
  error_message TEXT,
  feedback_details TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 22. LESSON BOOKMARKS (Personal Student Bookmarks for Fast Revision)
CREATE TABLE IF NOT EXISTS lesson_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

-- 23. LESSON STUDY NOTES (Personal Student Markdown Study Notes per Lesson)
CREATE TABLE IF NOT EXISTS lesson_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

-- 24. NOTIFICATIONS (Student Learning Reminders & Instructor Feedback Alerts)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'SYSTEM' CHECK (type IN ('ASSIGNMENT', 'QUIZ', 'CERTIFICATE', 'COURSE', 'SYSTEM')),
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 25. SUBSCRIPTIONS (SaaS Tier Subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('PRO_MONTHLY', 'PRO_ANNUAL', 'ENTERPRISE')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED')),
  current_period_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_end DATETIME NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 26. ORDERS & PAYMENTS (Course purchases & subscription invoices)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('COURSE_PURCHASE', 'SUBSCRIPTION')),
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  plan_id TEXT CHECK (plan_id IN ('PRO_MONTHLY', 'PRO_ANNUAL', 'ENTERPRISE')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  payment_method TEXT DEFAULT 'CREDIT_CARD',
  transaction_ref TEXT,
  receipt_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_enrollment_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_enrollment ON module_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module ON module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user ON assignment_submissions(user_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_cert_code ON certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_coding_exercises_lesson ON coding_exercises(lesson_id);
CREATE INDEX IF NOT EXISTS idx_coding_exercises_course ON coding_exercises(course_id);
CREATE INDEX IF NOT EXISTS idx_exercise_test_cases_exercise ON exercise_test_cases(exercise_id);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_user ON coding_submissions(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON lesson_bookmarks(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON lesson_notes(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_enrollment_course_status ON enrollments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollment_enrolled_at ON enrollments(enrolled_at);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_updated ON lesson_progress(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted ON quiz_attempts(quiz_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON quiz_answers(question_id, is_correct);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(assignment_id, status);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_status ON coding_submissions(exercise_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_course ON orders(user_id, course_id, status);

-- 27. COUPONS (Admin-Managed Discount & Course Access System)
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED', 'FREE')),
  discount_value REAL NOT NULL DEFAULT 0,
  max_discount REAL,
  min_purchase_amount REAL DEFAULT 0,
  eligible_course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  eligible_email TEXT,
  eligible_phone TEXT,
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATETIME,
  max_redemptions INTEGER DEFAULT 100,
  max_redemptions_per_user INTEGER DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  is_single_use BOOLEAN NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 28. COUPON REDEMPTIONS (Audit Trail & Idempotent Usage Logs)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  discount_amount REAL NOT NULL,
  original_price REAL NOT NULL,
  final_price REAL NOT NULL,
  redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 29. PASSWORD RESETS (Secure Single-Use Expiring Password Reset Tokens)
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 30. COURSE ENTITLEMENTS (Complimentary Admin Grants & Entitlement Overrides)
CREATE TABLE IF NOT EXISTS course_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  entitlement_type TEXT NOT NULL DEFAULT 'COMPLIMENTARY' CHECK (entitlement_type IN ('PURCHASE', 'SUBSCRIPTION', 'COMPLIMENTARY')),
  granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code, is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_course ON coupons(eligible_course_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(user_id, coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash, expires_at);
CREATE INDEX IF NOT EXISTS idx_course_entitlements_lookup ON course_entitlements(user_id, course_id, is_active);

