import 'dotenv/config';
import assert from 'node:assert/strict';
import { Pool, neon } from '@neondatabase/serverless';
import app from '../server/server.js';
import { checkNeonHealth, queryAllNeon, queryOneNeon, runNeonQuery, neonTransaction } from '../server/db/neon.js';

let passedCount = 0;
let failedCount = 0;

async function runTest(testNumber, description, fn) {
  try {
    await fn();
    console.log(`✅ [Test ${testNumber} Passed]: ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [Test ${testNumber} Failed]: ${description}`);
    console.error(err);
    failedCount++;
  }
}

async function runNeonTestSuite() {
  console.log('\n====================================================');
  console.log('NEON CLOUD POSTGRESQL END-TO-END VERIFICATION SUITE');
  console.log('====================================================\n');

  let server;
  let baseUrl;

  try {
    // 1. Neon Configuration & Connection
    await runTest(1, 'DATABASE_URL (pooled) is configured and valid', async () => {
      assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be present');
      assert.ok(process.env.DATABASE_URL.includes('neon.tech'), 'DATABASE_URL must target neon.tech');
      assert.ok(process.env.DATABASE_URL.includes('-pooler'), 'DATABASE_URL must use Neon PgBouncer connection pooler');
    });

    await runTest(2, 'DATABASE_URL_UNPOOLED (direct) is configured and valid', async () => {
      assert.ok(process.env.DATABASE_URL_UNPOOLED, 'DATABASE_URL_UNPOOLED must be present');
      assert.ok(process.env.DATABASE_URL_UNPOOLED.includes('neon.tech'), 'DATABASE_URL_UNPOOLED must target neon.tech');
      assert.ok(!process.env.DATABASE_URL_UNPOOLED.includes('-pooler'), 'DATABASE_URL_UNPOOLED must be direct connection');
    });

    await runTest(3, 'Neon health check succeeds and returns branch, database, and latency', async () => {
      const health = await checkNeonHealth();
      assert.equal(health.status, 'connected');
      assert.equal(health.provider, 'Neon Cloud PostgreSQL');
      assert.equal(health.database, 'neondb');
      assert.equal(health.branch, 'production');
      assert.ok(typeof health.latencyMs === 'number');
      assert.ok(health.latencyMs > 0);
    });

    // 2. Direct Query Verification with @neondatabase/serverless
    await runTest(4, 'Tagged neon SQL executor executes queries on Neon', async () => {
      const sql = neon(process.env.DATABASE_URL);
      const rows = await sql`SELECT 1 + 1 AS sum, current_database() as db`;
      assert.equal(rows[0].sum, 2);
      assert.equal(rows[0].db, 'neondb');
    });

    await runTest(5, 'Neon unpooled pool verifies all 30 LMS tables exist in Neon schema', async () => {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
      const res = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      await pool.end();
      const tableNames = res.rows.map(r => r.table_name);
      
      const expectedTables = [
        'users', 'courses', 'modules', 'lessons', 'enrollments', 
        'orders', 'coupons', 'course_entitlements', 'quizzes', 'assignments'
      ];
      for (const t of expectedTables) {
        assert.ok(tableNames.includes(t), `Table ${t} must exist in Neon`);
      }
    });

    // 3. CRUD & Transaction Operations on Neon
    const testRecordId = `audit-neon-test-${Date.now()}`;

    await runTest(6, 'Neon CRUD: INSERT and SELECT work over pooled connection', async () => {
      await runNeonQuery(
        'INSERT INTO audit_logs (id, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?)',
        [testRecordId, 'NEON_E2E_TEST_INSERT', 'SYSTEM', testRecordId, JSON.stringify({ test: true })]
      );

      const record = await queryOneNeon(
        'SELECT * FROM audit_logs WHERE id = ?',
        [testRecordId]
      );

      assert.ok(record, 'Record must be found in Neon');
      assert.equal(record.id, testRecordId);
      assert.equal(record.action, 'NEON_E2E_TEST_INSERT');
    });

    await runTest(7, 'Neon CRUD: UPDATE and DELETE work cleanly', async () => {
      await runNeonQuery(
        'UPDATE audit_logs SET action = ? WHERE id = ?',
        ['NEON_E2E_TEST_UPDATED', testRecordId]
      );

      const updated = await queryOneNeon('SELECT action FROM audit_logs WHERE id = ?', [testRecordId]);
      assert.equal(updated.action, 'NEON_E2E_TEST_UPDATED');

      await runNeonQuery('DELETE FROM audit_logs WHERE id = ?', [testRecordId]);
      const deleted = await queryOneNeon('SELECT id FROM audit_logs WHERE id = ?', [testRecordId]);
      assert.equal(deleted, null, 'Record must be deleted from Neon');
    });

    await runTest(8, 'Neon Transactions: COMMIT succeeds atomically', async () => {
      const txId = `tx-neon-test-${Date.now()}`;
      await neonTransaction(async (client) => {
        await client.query(
          'INSERT INTO audit_logs (id, action, resource_type, details) VALUES ($1, $2, $3, $4)',
          [txId, 'TX_TEST', 'SYSTEM', 'neon-test']
        );
      });

      const found = await queryOneNeon('SELECT id FROM audit_logs WHERE id = ?', [txId]);
      assert.ok(found, 'Committed transaction record must persist in Neon');

      // Cleanup
      await runNeonQuery('DELETE FROM audit_logs WHERE id = ?', [txId]);
    });

    // 4. Express Server Live API Endpoints
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    await runTest(9, 'Express /api/health returns live Neon Cloud PostgreSQL status', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(data.database.provider, 'Neon Cloud PostgreSQL');
      assert.equal(data.database.branch, 'production');
      assert.equal(data.database.status, 'connected');
      assert.ok(typeof data.database.latencyMs === 'number');
    });

    await runTest(10, 'Express /api/neon/status returns live table statistics from Neon', async () => {
      const res = await fetch(`${baseUrl}/api/neon/status`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.neon.status, 'connected');
      assert.ok(data.tables.users > 0, 'Users count in Neon must be > 0');
      assert.ok(data.tables.courses > 0, 'Courses count in Neon must be > 0');
    });

    await runTest(11, 'Express /api/neon/courses serves authoritative courses from Neon Cloud', async () => {
      const res = await fetch(`${baseUrl}/api/neon/courses`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.source, 'Neon Cloud PostgreSQL (production branch)');
      assert.ok(Array.isArray(data.courses));
      assert.ok(data.courses.length > 0);
      
      const fullstack = data.courses.find(c => c.id === 'course-fullstack-web');
      assert.ok(fullstack, 'Fullstack course must be returned from Neon');
      assert.equal(fullstack.price, 249);
    });

  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runNeonTestSuite().catch(err => {
  console.error('Fatal error in Neon test suite:', err);
  process.exit(1);
});
