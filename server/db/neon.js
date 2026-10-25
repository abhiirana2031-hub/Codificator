import 'dotenv/config';
import { Pool, neon } from '@neondatabase/serverless';

/**
 * Neon Cloud PostgreSQL Service Client
 * 
 * Best Practices implemented from Neon documentation:
 * - Uses DATABASE_URL (pooled with PgBouncer) for standard application queries.
 * - Uses DATABASE_URL_UNPOOLED for DDL, migrations, and direct operations.
 * - Driver: @neondatabase/serverless for optimal latency and connection pooling.
 */

const pooledUrl = process.env.DATABASE_URL;
const unpooledUrl = process.env.DATABASE_URL_UNPOOLED || pooledUrl;

if (!pooledUrl) {
  console.warn('⚠️  [NEON WARNING]: DATABASE_URL is not set in environment.');
}

// Pooled connection for high-concurrency application queries
export const neonPool = new Pool({
  connectionString: pooledUrl
});

// Tagged SQL query executor from @neondatabase/serverless
export const neonSql = pooledUrl ? neon(pooledUrl) : null;

// Unpooled connection pool for schema migrations / DDL
export const unpooledPool = unpooledUrl ? new Pool({ connectionString: unpooledUrl }) : null;

/**
 * Helper to convert SQLite-style '?' placeholders to PostgreSQL '$1, $2, ...'
 */
export function formatPostgresQuery(sql, params = []) {
  let paramIndex = 1;
  const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return { pgSql, params };
}

/**
 * Query multiple rows from Neon Postgres
 */
export async function queryAllNeon(sql, params = []) {
  const { pgSql, params: pgParams } = formatPostgresQuery(sql, params);
  const result = await neonPool.query(pgSql, pgParams);
  return result.rows;
}

/**
 * Query a single row from Neon Postgres
 */
export async function queryOneNeon(sql, params = []) {
  const { pgSql, params: pgParams } = formatPostgresQuery(sql, params);
  const result = await neonPool.query(pgSql, pgParams);
  return result.rows[0] || null;
}

/**
 * Execute an INSERT/UPDATE/DELETE query on Neon Postgres
 */
export async function runNeonQuery(sql, params = []) {
  const { pgSql, params: pgParams } = formatPostgresQuery(sql, params);
  const result = await neonPool.query(pgSql, pgParams);
  return {
    rowCount: result.rowCount,
    rows: result.rows
  };
}

/**
 * Transaction wrapper on Neon Postgres
 */
export async function neonTransaction(callback) {
  const client = await neonPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Comprehensive health check for Neon Cloud PostgreSQL
 */
export async function checkNeonHealth() {
  if (!pooledUrl) {
    return {
      status: 'unconfigured',
      error: 'DATABASE_URL not configured'
    };
  }

  const startTime = Date.now();
  try {
    const res = await neonPool.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version,
        NOW() as server_time
    `);
    const latencyMs = Date.now() - startTime;

    return {
      status: 'connected',
      provider: 'Neon Cloud PostgreSQL',
      branch: process.env.NEON_BRANCH || 'production',
      database: res.rows[0].database,
      user: res.rows[0].user,
      version: res.rows[0].version,
      serverTime: res.rows[0].server_time,
      latencyMs
    };
  } catch (err) {
    return {
      status: 'error',
      provider: 'Neon Cloud PostgreSQL',
      error: err.message,
      latencyMs: Date.now() - startTime
    };
  }
}
