import { Router } from 'express';
import { BED_ALLOCATION_EDITOR_ROLES, DESIGNATION_KEYS, TASK_ASSIGNEE_ROLES } from '@surg-d/shared';
import { pool } from '../db.js';
import { toAllocationDto, validateBedAllocation } from '../bedAllocations.js';
import { asyncHandler, HttpError } from '../errors.js';
import { getBeds } from '../hospitalBeds.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const bedsRouter = Router();
bedsRouter.use(requireAuth);

const SELECT_ALLOCATIONS = `
  SELECT a.bed_code, a.employee_id, e.full_name, e.designation
  FROM bed_allocations a
  JOIN employees e ON e.id = a.employee_id AND e.is_active = 1`;
const ORDER = `ORDER BY a.bed_code, FIELD(e.designation, ${DESIGNATION_KEYS.map((k) => `'${k}'`).join(', ')}), e.full_name`;

// Occupied ward beds with patient and consultant, from the hospital API (cached). ?refresh=1 forces a reload.
bedsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      res.json(await getBeds({ refresh: req.query.refresh === '1' }));
    } catch (err) {
      console.error(`Hospital beds API failed: ${err.message}`);
      throw new HttpError(502, 'Could not load beds from the hospital system. Try again shortly.');
    }
  })
);

// Which doctors are responsible for which beds. Empty beds keep their allocation.
bedsRouter.get(
  '/allocations',
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(`${SELECT_ALLOCATIONS} ${ORDER}`);
    res.json(rows.map(toAllocationDto));
  })
);

bedsRouter.put(
  '/allocations',
  requireRole(...BED_ALLOCATION_EDITOR_ROLES),
  asyncHandler(async (req, res) => {
    const { data, errors } = validateBedAllocation(req.body ?? {});
    if (errors) throw new HttpError(422, 'Validation failed', errors);
    const { bedCodes, employeeIds, mode } = data;

    if (employeeIds.length) {
      const [eligible] = await pool.query('SELECT id FROM employees WHERE id IN (?) AND is_active = 1 AND role IN (?)', [
        employeeIds,
        TASK_ASSIGNEE_ROLES,
      ]);
      if (eligible.length !== employeeIds.length) {
        throw new HttpError(422, 'Validation failed', { employeeIds: 'Some selected people cannot be given beds' });
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (mode === 'replace') await connection.query('DELETE FROM bed_allocations WHERE bed_code IN (?)', [bedCodes]);
      const rows = bedCodes.flatMap((bed) => employeeIds.map((id) => [bed, id, req.user.id]));
      if (rows.length) {
        await connection.query('INSERT IGNORE INTO bed_allocations (bed_code, employee_id, assigned_by) VALUES ?', [rows]);
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    const [updated] = await pool.query(`${SELECT_ALLOCATIONS} WHERE a.bed_code IN (?) ${ORDER}`, [bedCodes]);
    res.json(updated.map(toAllocationDto));
  })
);
