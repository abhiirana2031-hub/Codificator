-- CODIFICATORS LMS POSTGRESQL SCHEMA FOR NEON
-- Generated for PostgreSQL 16+ on Neon Cloud

-- Drop existing tables in reverse dependency order if recreating
DROP TABLE IF EXISTS course_entitlements CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS coupon_redemptions CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS lesson_notes CASCADE;
DROP TABLE IF EXISTS lesson_bookmarks CASCADE;
DROP TABLE IF EXISTS coding_submissions CASCADE;
DROP TABLE IF EXISTS exercise_test_cases CASCADE;
DROP TABLE IF EXISTS coding_exercises CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_options CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS module_progress CASCADE;
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS lesson_resources CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS course_instructors CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS & ROLES
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'INSTRUCTOR', 'STUDENT')),
  avatar_url TEXT,
  bio TEXT,
  display_name TEXT,
  phone TEXT,
  college TEXT,
  skills TEXT,
  preferred_languages TEXT,
  social_links TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  reset_token TEXT,
  reset_token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. COURSES
CREATE TABLE courses (
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
  is_published BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  tier TEXT DEFAULT 'FREE',
  learning_objectives TEXT,
  prerequisites TEXT,
  completion_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. COURSE INSTRUCTORS
CREATE TABLE course_instructors (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id, instructor_id)
);

-- 4. MODULES
CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  estimated_duration TEXT DEFAULT '2 hours',
  is_published BOOLEAN DEFAULT TRUE,
  completion_policy TEXT NOT NULL DEFAULT 'POLICY_A_LESSONS' 
    CHECK (completion_policy IN ('POLICY_A_LESSONS', 'POLICY_B_QUIZ', 'POLICY_C_ASSIGNMENT', 'POLICY_D_SCORE')),
  min_passing_score REAL DEFAULT 70.0,
  prerequisite_module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. LESSONS
CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (lesson_type IN ('TEXT', 'CODE', 'PDF', 'VIDEO')),
  text_content TEXT,
  reading_time_minutes INTEGER DEFAULT 10,
  key_takeaways TEXT,
  pdf_url TEXT,
  downloadable_resources TEXT,
  external_links TEXT,
  duration_minutes INTEGER DEFAULT 15,
  order_index INTEGER NOT NULL DEFAULT 1,
  is_mandatory BOOLEAN DEFAULT TRUE,
  video_asset_id TEXT,
  video_url TEXT,
  video_threshold_percent INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. LESSON RESOURCES
CREATE TABLE lesson_resources (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'application/pdf',
  file_size TEXT DEFAULT '1.5 MB',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. ENROLLMENTS
CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DROPPED')),
  enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  progress_percent REAL DEFAULT 0.0,
  UNIQUE(user_id, course_id)
);

-- 8. LESSON PROGRESS
CREATE TABLE lesson_progress (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  last_playback_position REAL DEFAULT 0.0,
  video_duration REAL DEFAULT 0.0,
  watched_progress_percent REAL DEFAULT 0.0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(enrollment_id, lesson_id)
);

-- 9. MODULE PROGRESS
CREATE TABLE module_progress (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  is_unlocked BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(enrollment_id, module_id)
);

-- 10. QUIZZES
CREATE TABLE quizzes (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_percentage REAL DEFAULT 70.0,
  time_limit_minutes INTEGER DEFAULT 20,
  max_attempts INTEGER DEFAULT 3,
  is_required BOOLEAN DEFAULT TRUE,
  randomize_questions BOOLEAN DEFAULT FALSE,
  show_explanations BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. QUIZ QUESTIONS
CREATE TABLE quiz_questions (
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
CREATE TABLE quiz_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 13. QUIZ ATTEMPTS
CREATE TABLE quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  max_score REAL NOT NULL,
  percentage REAL NOT NULL,
  is_passed BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. QUIZ ANSWERS
CREATE TABLE quiz_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_ids TEXT,
  text_response TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  marks_awarded REAL DEFAULT 0.0
);

-- 15. ASSIGNMENTS
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  max_marks REAL DEFAULT 100.0,
  due_date TIMESTAMPTZ,
  is_required BOOLEAN DEFAULT TRUE,
  accepted_types TEXT DEFAULT 'text,zip,pdf,github',
  rubric TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. ASSIGNMENT SUBMISSIONS
CREATE TABLE assignment_submissions (
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
  submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMPTZ,
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- 17. CERTIFICATES
CREATE TABLE certificates (
  id TEXT PRIMARY KEY,
  certificate_code TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_id TEXT UNIQUE NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  issue_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completion_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  template_version TEXT DEFAULT 'v1',
  verification_url TEXT
);

-- 18. AUDIT LOGS
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. CODING EXERCISES
CREATE TABLE coding_exercises (
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
  hints TEXT,
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 20. EXERCISE TEST CASES
CREATE TABLE exercise_test_cases (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES coding_exercises(id) ON DELETE CASCADE,
  input_json TEXT NOT NULL,
  expected_output_json TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 21. CODING SUBMISSIONS
CREATE TABLE coding_submissions (
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
  submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 22. LESSON BOOKMARKS
CREATE TABLE lesson_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

-- 23. LESSON STUDY NOTES
CREATE TABLE lesson_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

-- 24. NOTIFICATIONS
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'SYSTEM' CHECK (type IN ('ASSIGNMENT', 'QUIZ', 'CERTIFICATE', 'COURSE', 'SYSTEM')),
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 25. SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('PRO_MONTHLY', 'PRO_ANNUAL', 'ENTERPRISE')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 26. ORDERS & PAYMENTS
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('COURSE_PURCHASE', 'SUBSCRIPTION')),
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  plan_id TEXT CHECK (plan_id IN ('PRO_MONTHLY', 'PRO_ANNUAL', 'ENTERPRISE')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  payment_method TEXT DEFAULT 'RAZORPAY',
  transaction_ref TEXT,
  receipt_url TEXT,
  coupon_id TEXT,
  discount_amount REAL DEFAULT 0,
  original_amount REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 27. COUPONS
CREATE TABLE coupons (
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
  start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMPTZ,
  max_redemptions INTEGER DEFAULT 100,
  max_redemptions_per_user INTEGER DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_single_use BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 28. COUPON REDEMPTIONS
CREATE TABLE coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  discount_amount REAL NOT NULL,
  original_price REAL NOT NULL,
  final_price REAL NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 29. PASSWORD RESETS
CREATE TABLE password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 30. COURSE ENTITLEMENTS
CREATE TABLE course_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  entitlement_type TEXT NOT NULL DEFAULT 'COMPLIMENTARY' CHECK (entitlement_type IN ('PURCHASE', 'SUBSCRIPTION', 'COMPLIMENTARY')),
  granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_enrollment_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user ON assignment_submissions(user_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_cert_code ON certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code, is_active);
CREATE INDEX IF NOT EXISTS idx_course_entitlements_lookup ON course_entitlements(user_id, course_id, is_active);
