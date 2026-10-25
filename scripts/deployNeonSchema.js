import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploySchema() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED not found in environment');
  }

  console.log('Connecting to Neon unpooled endpoint for schema deployment...');
  const pool = new Pool({ connectionString });
  
  const schemaPath = path.join(__dirname, '../server/db/neonSchema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Executing neonSchema.sql on Neon Cloud PostgreSQL...');
  await pool.query(sql);
  console.log('Schema deployed successfully to Neon Postgres!');

  // Verify tables
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('Verified Neon Tables count:', res.rows.length);
  console.log('Tables:', res.rows.map(r => r.table_name).join(', '));

  await pool.end();
}

deploySchema().catch(err => {
  console.error('Schema deployment failed:', err);
  process.exit(1);
});
