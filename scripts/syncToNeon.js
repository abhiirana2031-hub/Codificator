import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncData() {
  const dbPath = path.join(__dirname, '../server/db/lms.db');
  const sqlite = new DatabaseSync(dbPath);
  
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });

  console.log('Syncing data from SQLite to Neon PostgreSQL...');

  const tables = [
    'users',
    'courses',
    'course_instructors',
    'modules',
    'lessons',
    'lesson_resources',
    'enrollments',
    'lesson_progress',
    'module_progress',
    'quizzes',
    'quiz_questions',
    'quiz_options',
    'quiz_attempts',
    'quiz_answers',
    'assignments',
    'assignment_submissions',
    'certificates',
    'audit_logs',
    'coding_exercises',
    'exercise_test_cases',
    'coding_submissions',
    'lesson_bookmarks',
    'lesson_notes',
    'notifications',
    'subscriptions',
    'orders',
    'coupons',
    'coupon_redemptions',
    'password_resets',
    'course_entitlements'
  ];

  for (const table of tables) {
    try {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      if (!rows || rows.length === 0) {
        continue;
      }

      console.log(`Syncing ${rows.length} rows for table ${table}...`);
      
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row).map(val => {
          // Handle boolean conversion if needed (0/1 to false/true)
          if (typeof val === 'number' && (val === 0 || val === 1)) {
            // Check column names commonly boolean
            if (['is_published', 'is_mandatory', 'is_required', 'is_completed', 'is_unlocked', 'is_passed', 'is_correct', 'is_private', 'is_read', 'cancel_at_period_end', 'is_active', 'is_single_use'].includes(columns[Object.values(row).indexOf(val)])) {
              return Boolean(val);
            }
          }
          return val;
        });

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = columns.join(', ');
        
        const insertSql = `
          INSERT INTO ${table} (${colNames}) 
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        await pool.query(insertSql, values);
      }
    } catch (err) {
      console.warn(`Notice while syncing table ${table}:`, err.message);
    }
  }

  console.log('Data synchronization from SQLite to Neon Postgres complete!');

  // Verify counts in Neon
  const countUsers = await pool.query('SELECT COUNT(*) as count FROM users');
  const countCourses = await pool.query('SELECT COUNT(*) as count FROM courses');
  const countModules = await pool.query('SELECT COUNT(*) as count FROM modules');
  const countLessons = await pool.query('SELECT COUNT(*) as count FROM lessons');
  const countOrders = await pool.query('SELECT COUNT(*) as count FROM orders');

  console.log(`Neon Verification Summary:
- Users: ${countUsers.rows[0].count}
- Courses: ${countCourses.rows[0].count}
- Modules: ${countModules.rows[0].count}
- Lessons: ${countLessons.rows[0].count}
- Orders: ${countOrders.rows[0].count}
  `);

  await pool.end();
}

syncData().catch(err => {
  console.error('Data sync failed:', err);
  process.exit(1);
});
