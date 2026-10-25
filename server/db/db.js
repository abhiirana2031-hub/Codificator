import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.LMS_DB_PATH || path.join(__dirname, 'lms.db');

// Ensure db directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode for high concurrency
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Initialize schema and non-destructive column migrations
export function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Non-destructive migrations for existing databases
  try {
    db.exec('ALTER TABLE lessons ADD COLUMN reading_time_minutes INTEGER DEFAULT 10;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE lessons ADD COLUMN key_takeaways TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE quiz_questions ADD COLUMN concept_to_review TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE courses ADD COLUMN status TEXT DEFAULT 'DRAFT';");
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE courses ADD COLUMN tier TEXT DEFAULT 'FREE';");
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE users ADD COLUMN firebase_uid TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE lessons ADD COLUMN is_preview BOOLEAN DEFAULT 0;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE lessons ADD COLUMN content_markdown TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE courses ADD COLUMN subtitle TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE courses ADD COLUMN target_audience TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE lessons ADD COLUMN is_admin_modified BOOLEAN DEFAULT 0;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE lessons ADD COLUMN source_type TEXT DEFAULT 'IMPORTER';");
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);');
  } catch (e) {
    // Index already exists
  }
  try {
    // Ensure existing published courses have status = 'PUBLISHED'
    db.exec("UPDATE courses SET status = 'PUBLISHED' WHERE is_published = 1 AND (status IS NULL OR status = 'DRAFT');");
  } catch (e) {
    // Table/column state handled
  }

  // User Profile, Security & Account Status Migrations
  const userColumns = [
    'display_name TEXT',
    'phone TEXT',
    'college TEXT',
    'skills TEXT',
    'preferred_languages TEXT',
    'social_links TEXT',
    'is_active INTEGER DEFAULT 1',
    'reset_token TEXT',
    'reset_token_expiry DATETIME'
  ];
  for (const col of userColumns) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col};`);
    } catch (e) {
      // Column already exists
    }
  }

  // Orders table coupon references
  const orderColumns = [
    'coupon_id TEXT REFERENCES coupons(id)',
    'discount_amount REAL DEFAULT 0',
    'original_amount REAL',
    'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'
  ];
  for (const col of orderColumns) {
    try {
      db.exec(`ALTER TABLE orders ADD COLUMN ${col};`);
    } catch (e) {
      // Column already exists
    }
  }

  // Ensure Coupons, Course Entitlements & Password Resets tables exist
  try {
    db.exec(`
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

      CREATE INDEX IF NOT EXISTS idx_course_entitlements_lookup ON course_entitlements(user_id, course_id, is_active);

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

      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code, is_active);
      CREATE INDEX IF NOT EXISTS idx_coupons_course ON coupons(eligible_course_id);
      CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(user_id, coupon_id);
      CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash, expires_at);
    `);
  } catch (e) {
    // Tables handled
  }

  // Analytics & Billing performance indexes
  try {
    db.exec(`
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
    `);
  } catch (e) {
    // Indexes handled
  }

  // Certificates: enforce one cert per (user_id, course_id)
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_user_course ON certificates(user_id, course_id);');
  } catch (e) {
    // Index already exists or conflict — safe to ignore
  }

  // Migrate old CODIF- prefixed certificate codes to CFWD- so they remain verifiable
  try {
    db.exec(`
      UPDATE certificates
      SET certificate_code = 'CFWD-' || SUBSTR(certificate_code, 7),
          verification_url = '/verify/CFWD-' || SUBSTR(certificate_code, 7)
      WHERE certificate_code LIKE 'CODIF-%';
    `);
  } catch (e) {
    // Migration already applied or no rows to update
  }
}

let transactionDepth = 0;

// Transaction wrapper supporting nested calls
export function transaction(callback) {
  if (transactionDepth > 0) {
    return callback(db);
  }

  transactionDepth++;
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = callback(db);
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  } finally {
    transactionDepth--;
  }
}

// Helpers for prepared queries
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

export function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

export function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

// Automatically init schema on import
initSchema();
