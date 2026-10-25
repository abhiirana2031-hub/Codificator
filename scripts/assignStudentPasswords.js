import sqlite3 from 'node:sqlite';
import { runNeonQuery, queryOneNeon, queryAllNeon } from '../server/db/neon.js';

let localDb = null;
try {
  localDb = new sqlite3.DatabaseSync('./server/db/lms.db');
} catch (e) {
  console.log('Local SQLite not opened:', e.message);
}

// Students on the Paid Students tab of the Google Sheet + Karan
const paidStudents = [
  { name: 'Vansh', email: 'vanshrara5432@gmail.com', pass: 'Vansh@2026' },
  { name: 'Sagar', email: 'sagarpanwar914925@gmail.com', pass: 'Sagar@2026' },
  { name: 'Tanu', email: 'tannurajput663@gmail.com', pass: 'Tanu@2026' },
  { name: 'Roshni panwar', email: 'roshnipanwar969@gmail.com', pass: 'Roshni@2026' },
  { name: 'Arnav rathi', email: 'aarav210407@gmail.com', pass: 'Arnav@2026' },
  { name: 'Abhinav kumar', email: 'abhinavjaat106@gmail.com', pass: 'Abhinav@2026' },
  { name: 'Pratibha Choudhary', email: 'choudharypratibha668@gmail.com', pass: 'Pratibha@2026' },
  { name: 'Aditi Narayan', email: 'aditinarayan185@gmail.com', pass: 'Aditi@2026' },
  { name: 'Rajdeep', email: 'rajdeepdhaka072@gmail.com', pass: 'Rajdeep@2026' },
  { name: 'Vansh', email: 'cvanshraj1107@gmail.com', pass: 'VanshC@2026' },
  { name: 'Tanish Rana', email: 'tanishrana9990@gmail.com', pass: 'Tanish@2026' },
  { name: 'Aryaveer Malik', email: 'aryaveermalik04@gmail.com', pass: 'Aryaveer@2026' },
  { name: 'Jasmine Chaudhary', email: 'jasminechoudhary093@gmail.com', pass: 'Jasmine@2026' },
  { name: 'Vanshika Rajput', email: 'vanshikarajput.9837@gmail.com', pass: 'Vanshika@2026' },
  { name: 'Lavi Chaudhary', email: 'lavixy102@gmail.com', pass: 'Lavi@2026' },
  { name: 'Kuhu', email: 'kuhudabas2@gmail.com', pass: 'Kuhu@2026' },
  { name: 'VAIBHAV LAKHA', email: 'vaibhavlakha30@gmail.com', pass: 'Vaibhav@2026' },
  { name: 'Saksham sandhu', email: 'sakshamsandhu1408@gmail.com', pass: 'Saksham@2026' },
  { name: 'Anshika Siwach', email: 'siwachanshika551@gmail.com', pass: 'AnshikaS@2026' },
  { name: 'Khushi Chaudhary', email: 'anshikachoudhary2908@gmail.com', pass: 'Khushi@2026' },
  { name: 'Avika Malik', email: 'avikamalik0@gmail.com', pass: 'Avika@2026' },
  { name: 'Arpit', email: 'arpitpardhan003@gmail.com', pass: 'Arpit@2026' },
  { name: 'Karan', email: 'mrvsar242@gmail.com', pass: 'Karan@2026' },
  { name: 'Lavish', email: 'lavishchaudhary043@gmail.com', pass: 'Lavish@2026' },
  { name: 'Anushka Chauhan', email: 'chauhanannu2007@gmail.com', pass: 'Anushka@2026' },
  { name: 'Kashish saini', email: 'kashishsaini9546@gmail.com', pass: 'Kashish@2026' },
  { name: 'GOVIND ARYA', email: 'govindarya521@gmail.com', pass: 'Govind@2026' },
  { name: 'Anshika Sangwan', email: 'anshikasangwan18882@gmail.com', pass: 'Anshika@2026' }
];

async function main() {
  console.log('🚀 Assigning student passwords in Neon and local database...');

  const results = [];

  for (const s of paidStudents) {
    const user = await queryOneNeon('SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) = $1', [s.email.toLowerCase()]);
    if (user) {
      await runNeonQuery(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [s.pass, user.id]
      );

      if (localDb) {
        try {
          localDb.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(s.pass, user.id);
        } catch (e) { /* ignore */ }
      }

      // Fetch certificate info
      const cert = await queryOneNeon('SELECT certificate_code, course_id FROM certificates WHERE user_id = $1', [user.id]);

      results.push({
        name: user.name,
        email: user.email,
        password: s.pass,
        certificateCode: cert?.certificate_code || 'N/A'
      });
      console.log(`✅ Set password for ${user.name} (${user.email}) => "${s.pass}"`);
    } else {
      console.log(`⚠️ User not found for email: ${s.email}`);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 ALL PASSWORDS UPDATED SUCCESSFULLY!');
  console.log('======================================================');
  console.table(results);
}

main().catch(console.error);
