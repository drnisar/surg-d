import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { DESIGNATION_KEYS, ROLES, addableDesignations, canEditEmployee, designationLabel } from '@surg-d/shared';
import { pool } from '../db.js';
import { asyncHandler, HttpError } from '../errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { toEmployeeDto, validateEmployee } from '../employees.js';

export const employeesRouter = Router();
employeesRouter.use(requireAuth);

// Seniority order follows the designation list; admin accounts (no designation) come first.
const ORDER_BY = `ORDER BY FIELD(designation, ${DESIGNATION_KEYS.map((k) => `'${k}'`).join(', ')}), full_name`;

employeesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = [];
    const params = {};
    if (req.query.designation) {
      where.push('designation = :designation');
      params.designation = req.query.designation;
    }
    if (req.query.role) {
      where.push('role = :role');
      params.role = req.query.role;
    }
    if (req.query.q) {
      where.push('(full_name LIKE :q OR mr_number LIKE :q OR email LIKE :q OR official_email LIKE :q)');
      params.q = `%${req.query.q}%`;
    }
    if (req.query.includeInactive !== 'true') where.push('is_active = 1');

    const sql = `SELECT * FROM employees ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ${ORDER_BY}`;
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(toEmployeeDto));
  })
);

employeesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = :id', { id: req.params.id });
    if (!rows[0]) throw new HttpError(404, 'Employee not found');
    res.json(toEmployeeDto(rows[0]));
  })
);

async function toColumns(data) {
  const { password, ...columns } = data;
  if (password) columns.password_hash = await bcrypt.hash(password, 10);
  return columns;
}

const findMe = async (id) =>
  (await pool.query('SELECT role, designation FROM employees WHERE id = ? AND is_active = 1', [id]))[0][0] ?? null;

// Only the admin may create or make admin accounts, so `role` is ignored for everyone else.
const bodyFor = (me, body) => (me.role === ROLES.ADMIN ? body ?? {} : { ...body, role: undefined });

function checkDesignation(me, data, verb) {
  const allowed = addableDesignations(me);
  if (me.role !== ROLES.ADMIN && data.designation !== undefined && !allowed.includes(data.designation)) {
    throw new HttpError(422, 'Validation failed', {
      designation: `You can ${verb} only ${allowed.map(designationLabel).join(' or ')}`,
    });
  }
}

// The admin adds anyone; some designations may add juniors (see addableDesignations).
employeesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const me = await findMe(req.user.id);
    if (!me || !addableDesignations(me).length) throw new HttpError(403, 'Insufficient permissions');

    const { data, errors } = validateEmployee(bodyFor(me, req.body));
    if (errors) throw new HttpError(422, 'Validation failed', errors);
    checkDesignation(me, data, 'add');

    const columns = await toColumns(data);
    const [result] = await pool.query('INSERT INTO employees SET ?', [columns]);
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    res.status(201).json(toEmployeeDto(rows[0]));
  })
);

// The admin edits anyone; others edit only the designations they may add, and keep them within those.
employeesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const me = await findMe(req.user.id);
    const [target] = await pool.query('SELECT designation FROM employees WHERE id = ?', [req.params.id]);
    if (!target[0]) throw new HttpError(404, 'Employee not found');
    if (!me || !canEditEmployee(me, target[0])) throw new HttpError(403, 'Insufficient permissions');

    const { data, errors } = validateEmployee(bodyFor(me, req.body), { partial: true });
    if (errors) throw new HttpError(422, 'Validation failed', errors);
    checkDesignation(me, data, 'set');

    const columns = await toColumns(data);
    if (Object.keys(columns).length) {
      const [result] = await pool.query('UPDATE employees SET ? WHERE id = ?', [columns, req.params.id]);
      if (!result.affectedRows) throw new HttpError(404, 'Employee not found');
    }
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!rows[0]) throw new HttpError(404, 'Employee not found');
    res.json(toEmployeeDto(rows[0]));
  })
);

// Soft delete: records are kept for history; the account can no longer log in.
employeesRouter.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === Number(req.user.id)) throw new HttpError(400, 'You cannot deactivate your own account');
    const [result] = await pool.query('UPDATE employees SET is_active = 0 WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) throw new HttpError(404, 'Employee not found');
    res.status(204).end();
  })
);
