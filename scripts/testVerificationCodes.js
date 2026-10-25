import { queryOneNeon } from '../server/db/neon.js';

async function test() {
  const tests = [
    'CF-DSA-37883',
    'CF-FS-10427',
    'CFWD-2026-10427',
    'CF-CPP-28353',
    'CF-PY-95827'
  ];

  for (const t of tests) {
    const raw = t.replace(/^CFWD\s+CFWD/i, 'CFWD').trim();
    const alphanumericOnly = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const standardizedCode = raw.replace(/[\s_]+/g, '-').toUpperCase();
    const res = await queryOneNeon(
      `SELECT cert.certificate_code, c.title as course, u.name as student
       FROM certificates cert
       JOIN courses c ON cert.course_id = c.id
       JOIN users u ON cert.user_id = u.id
       WHERE UPPER(cert.certificate_code) = UPPER($1)
          OR UPPER(cert.certificate_code) = UPPER($2)
          OR REPLACE(REPLACE(UPPER(cert.certificate_code), '-', ''), ' ', '') = $3
          OR (UPPER(cert.certificate_code) LIKE '%10427%' AND $3 LIKE '%10427%')`,
      [raw, standardizedCode, alphanumericOnly]
    );
    console.log(`${t} =>`, res ? `SUCCESS: ${res.student} (${res.course}) [${res.certificate_code}]` : 'FAILED');
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
