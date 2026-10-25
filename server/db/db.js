import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serverless guard: node:sqlite is NOT available on Vercel.
// On Vercel all persistence goes through Neon PostgreSQL (neon.js).
// We export safe no-op stubs so the server boots without crashing.
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

let db = null;

if (!IS_SERVERLESS) {
  const { DatabaseSync } = await import('node:sqlite');
  const { schemaSql: bundledSchemaSql } = await import('./schemaText.js');

  const DB_PATH = process.env.LMS_DB_PATH || path.join(__dirname, 'lms.db');
  const dir = path.dirname(DB_PATH);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) { /* safe ignore */ }

  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
}

export { db };

export function initSchema() {
  if (IS_SERVERLESS || !db) {
    console.log('info [DB] SQLite skipped on Vercel (Neon PostgreSQL active).');
    return;
  }

  const safeExec = (sql) => { try { db.exec(sql); } catch (e) { /* already exists */ } };

  safeExec('ALTER TABLE lessons ADD COLUMN reading_time_minutes INTEGER DEFAULT 10;');
  safeExec('ALTER TABLE lessons ADD COLUMN key_takeaways TEXT;');
  safeExec('ALTER TABLE quiz_questions ADD COLUMN concept_to_review TEXT;');
  safeExec("ALTER TABLE courses ADD COLUMN status TEXT DEFAULT 'DRAFT';");
  safeExec("ALTER TABLE courses ADD COLUMN tier TEXT DEFAULT 'FREE';");
  safeExec('ALTER TABLE users ADD COLUMN firebase_uid TEXT;');
  safeExec('ALTER TABLE lessons ADD COLUMN is_preview BOOLEAN DEFAULT 0;');
  safeExec('ALTER TABLE lessons ADD COLUMN content_markdown TEXT;');
  safeExec('ALTER TABLE courses ADD COLUMN subtitle TEXT;');
  safeExec('ALTER TABLE courses ADD COLUMN target_audience TEXT;');
  safeExec('ALTER TABLE lessons ADD COLUMN is_admin_modified BOOLEAN DEFAULT 0;');
  safeExec("ALTER TABLE lessons ADD COLUMN source_type TEXT DEFAULT 'IMPORTER';");
  safeExec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);');
  safeExec("UPDATE courses SET status = 'PUBLISHED' WHERE is_published = 1 AND (status IS NULL OR status = 'DRAFT');");

  for (const col of [
    'display_name TEXT', 'phone TEXT', 'college TEXT', 'skills TEXT',
    'preferred_languages TEXT', 'social_links TEXT',
    'is_active INTEGER DEFAULT 1', 'reset_token TEXT', 'reset_token_expiry DATETIME'
  ]) { safeExec(`ALTER TABLE users ADD COLUMN ${col};`); }

  for (const col of [
    'coupon_id TEXT REFERENCES coupons(id)', 'discount_amount REAL DEFAULT 0',
    'original_amount REAL', 'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'
  ]) { safeExec(`ALTER TABLE orders ADD COLUMN ${col};`); }

  safeExec(`
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, description TEXT,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED', 'FREE')),
      discount_value REAL NOT NULL DEFAULT 0, max_discount REAL,
      min_purchase_amount REAL DEFAULT 0,
      eligible_course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
      eligible_email TEXT, eligible_phone TEXT,
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP, expiry_date DATETIME,
      max_redemptions INTEGER DEFAULT 100, max_redemptions_per_user INTEGER DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT 1, is_single_use BOOLEAN NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS course_entitlements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      entitlement_type TEXT NOT NULL DEFAULT 'COMPLIMENTARY'
        CHECK (entitlement_type IN ('PURCHASE', 'SUBSCRIPTION', 'COMPLIMENTARY')),
      granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, revoked_at DATETIME,
      UNIQUE(user_id, course_id)
    );
    CREATE INDEX IF NOT EXISTS idx_course_entitlements_lookup ON course_entitlements(user_id, course_id, is_active);
    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id TEXT PRIMARY KEY,
      coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      discount_amount REAL NOT NULL, original_price REAL NOT NULL, final_price REAL NOT NULL,
      redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL, expires_at DATETIME NOT NULL,
      used_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code, is_active);
    CREATE INDEX IF NOT EXISTS idx_coupons_course ON coupons(eligible_course_id);
    CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(user_id, coupon_id);
    CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash, expires_at);
  `);

  safeExec(`
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

  safeExec('CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_user_course ON certificates(user_id, course_id);');
  safeExec(`
    UPDATE certificates
    SET certificate_code = 'CFWD-' || SUBSTR(certificate_code, 7),
        verification_url = '/verify/CFWD-' || SUBSTR(certificate_code, 7)
    WHERE certificate_code LIKE 'CODIF-%';
  `);
}

let transactionDepth = 0;

export function transaction(callback) {
  if (IS_SERVERLESS || !db) return callback(null);
  if (transactionDepth > 0) return callback(db);
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

export function queryAll(sql, params = []) {
  if (IS_SERVERLESS || !db) return [];
  return db.prepare(sql).all(...params);
}

export function queryOne(sql, params = []) {
  if (IS_SERVERLESS || !db) return null;
  return db.prepare(sql).get(...params);
}

export function runQuery(sql, params = []) {
  if (IS_SERVERLESS || !db) return { changes: 0, lastInsertRowid: null };
  return db.prepare(sql).run(...params);
}

initSchema();
