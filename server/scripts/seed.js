import bcrypt from 'bcryptjs';
import { buildMrNumber, DEFAULT_COUNTRY_CODE } from '@surg-d/shared';
import { pool } from '../src/db.js';

const email = (process.env.ADMIN_EMAIL ?? 'admin@surg-d.local').toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

try {
  const [existing] = await pool.query("SELECT id FROM employees WHERE role = 'admin' LIMIT 1");
  if (existing.length) {
    console.log('Admin already exists, skipping');
  } else {
    await pool.query('INSERT INTO employees SET ?', [
      {
        mr_number: buildMrNumber(process.env.ADMIN_EMPLOYEE_CODE ?? '1'),
        full_name: process.env.ADMIN_NAME ?? 'System Administrator',
        email,
        official_email: email,
        country_code: DEFAULT_COUNTRY_CODE,
        phone_number: '3000000000',
        designation: null,
        role: 'admin',
        password_hash: await bcrypt.hash(password, 10),
      },
    ]);
    console.log(`Admin created: ${email}`);
  }
} finally {
  await pool.end();
}
