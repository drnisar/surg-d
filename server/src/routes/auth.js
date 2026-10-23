import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { asyncHandler, HttpError } from '../errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { toEmployeeDto } from '../employees.js';

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

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = :id AND is_active = 1', { id: req.user.id });
    if (!rows[0]) throw new HttpError(401, 'Account not found or inactive');
    res.json(toEmployeeDto(rows[0]));
  })
);
