import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { asyncHandler, HttpError } from '../errors.js';
import { config } from '../config.js';
import { requireAuth, requireRole, signImpersonationToken, signToken } from '../middleware/auth.js';
import { toEmployeeDto, validatePasswordChange } from '../employees.js';

export const authRouter = Router();

// Log in with MR number, email or official email.
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const identifier = String(req.body?.identifier ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!identifier || !password) throw new HttpError(400, 'Identifier and password are required');

    const [rows] = await pool.query(
      'SELECT * FROM employees WHERE (mr_number = :upper OR email = :lower OR official_email = :lower) AND is_active = 1 LIMIT 1',
      { upper: identifier.toUpperCase(), lower: identifier.toLowerCase() }
    );
    const employee = rows[0];
    if (!employee?.password_hash || !(await bcrypt.compare(password, employee.password_hash))) {
      throw new HttpError(401, 'Invalid credentials');
    }
    res.json({ token: signToken(employee), user: toEmployeeDto(employee) });
  })
);

// Any signed-in user changes their own password; the admin resets others' from the Staff page.
authRouter.post(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.impersonatedBy) throw new HttpError(403, 'Return to your admin account first');
    const { data, errors } = validatePasswordChange(req.body ?? {});
    if (errors) throw new HttpError(422, 'Validation failed', errors);

    const [rows] = await pool.query('SELECT password_hash FROM employees WHERE id = ? AND is_active = 1', [req.user.id]);
    if (!rows[0]) throw new HttpError(401, 'Account not found or inactive');
    if (!rows[0].password_hash || !(await bcrypt.compare(data.currentPassword, rows[0].password_hash))) {
      throw new HttpError(422, 'Validation failed', { currentPassword: 'Current password is incorrect' });
    }
    await pool.query('UPDATE employees SET password_hash = ? WHERE id = ?', [
      await bcrypt.hash(data.newPassword, 10),
      req.user.id,
    ]);
    res.status(204).end();
  })
);

async function withImpersonator(employee, adminId) {
  if (!adminId) return employee;
  const [rows] = await pool.query('SELECT id, full_name FROM employees WHERE id = ?', [adminId]);
  return { ...employee, impersonatedBy: rows[0] ? { id: rows[0].id, fullName: rows[0].full_name } : { id: adminId } };
}

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = :id AND is_active = 1', { id: req.user.id });
    if (!rows[0]) throw new HttpError(401, 'Account not found or inactive');
    res.json(await withImpersonator(toEmployeeDto(rows[0]), req.user.impersonatedBy));
  })
);

// Testing aid: the admin gets a token for another active user without their password.
// Disabled in production unless ALLOW_IMPERSONATION=true.
authRouter.post(
  '/impersonate',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    if (!config.allowImpersonation) throw new HttpError(403, 'Switching user is disabled on this server');
    if (req.user.impersonatedBy) throw new HttpError(400, 'Return to your admin account first');
    const employeeId = Number(req.body?.employeeId);
    if (employeeId === Number(req.user.id)) throw new HttpError(400, 'That is your own account');

    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ? AND is_active = 1', [employeeId]);
    if (!rows[0]) throw new HttpError(404, 'Employee not found or inactive');
    console.log(`Admin ${req.user.id} is testing as employee ${employeeId}`);
    res.json({
      token: signImpersonationToken(rows[0], req.user.id),
      user: await withImpersonator(toEmployeeDto(rows[0]), req.user.id),
    });
  })
);
