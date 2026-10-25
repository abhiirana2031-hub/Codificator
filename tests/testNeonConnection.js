import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function testConnection() {
  console.log('Testing connection to:', process.env.DATABASE_URL ? 'DATABASE_URL found' : 'DATABASE_URL missing');
  const sql = neon(process.env.DATABASE_URL);
  const result = await sql`SELECT version(), current_database(), current_user`;
  console.log('Neon Postgres connection verified:');
  console.log(result);
}

testConnection().catch(err => {
  console.error('Connection failed:', err);
  process.exit(1);
});
