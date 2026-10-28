import { Router } from 'express';
import {
  DESIGNATION_KEYS,
  LOCATION_KEYS,
  ROSTER_EDITOR_ROLES,
  ROSTER_ELIGIBLE_ROLES,
  SHIFTS,
  daysInMonth,
  isValidDate,
  locationLabel,
} from '@surg-d/shared';
import { pool } from '../db.js';
import { asyncHandler, HttpError } from '../errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { toAssignmentDto, validateRosterUpdate } from '../roster.js';

export const rosterRouter = Router();
rosterRouter.use(requireAuth);

const sqlList = (values) => values.map((v) => `'${v}'`).join(', ');
const SELECT_ASSIGNMENTS = `
  SELECT d.id, DATE_FORMAT(d.duty_date, '%Y-%m-%d') AS duty_date, d.shift, d.location, d.employee_id,
         e.full_name, e.mr_number, e.designation, e.role, e.country_code, e.phone_number
  FROM duty_assignments d
  JOIN employees e ON e.id = d.employee_id`;
const ORDER = `ORDER BY d.duty_date, d.shift, FIELD(d.location, ${sqlList(LOCATION_KEYS)}),
  FIELD(e.designation, ${sqlList(DESIGNATION_KEYS)}), e.full_name`;

const shiftLabel = (key) => SHIFTS.find((s) => s.key === key)?.label.toLowerCase() ?? key;

rosterRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const days = daysInMonth(req.query.month);
    if (!days) throw new HttpError(400, 'month must be YYYY-MM');
    const [rows] = await pool.query(`${SELECT_ASSIGNMENTS} WHERE d.duty_date BETWEEN ? AND ? ${ORDER}`, [
      days[0],
      days.at(-1),
    ]);
    res.json({ month: req.query.month, assignments: rows.map(toAssignmentDto) });
  })
);

// Everyone on duty on one date; the client sends its own local date.
rosterRouter.get(
  '/day',
  asyncHandler(async (req, res) => {
    if (!isValidDate(req.query.date)) throw new HttpError(400, 'date must be YYYY-MM-DD');
    const [rows] = await pool.query(`${SELECT_ASSIGNMENTS} WHERE d.duty_date = ? ${ORDER}`, [req.query.date]);
    res.json({ date: req.query.date, assignments: rows.map(toAssignmentDto) });
  })
);

// The signed-in user's own duties for `days` days starting at `from` (their local date).
const MY_DUTIES_MAX_DAYS = 62;
rosterRouter.get(
  '/mine',
  asyncHandler(async (req, res) => {
    if (!isValidDate(req.query.from)) throw new HttpError(400, 'from must be YYYY-MM-DD');
    const days = Number(req.query.days ?? 14);
    if (!Number.isInteger(days) || days < 1 || days > MY_DUTIES_MAX_DAYS) {
      throw new HttpError(400, `days must be 1-${MY_DUTIES_MAX_DAYS}`);
    }
    const [rows] = await pool.query(
      `${SELECT_ASSIGNMENTS} WHERE d.employee_id = ? AND d.duty_date BETWEEN ? AND DATE_ADD(?, INTERVAL ? DAY) ${ORDER}`,
      [req.user.id, req.query.from, req.query.from, days - 1]
    );
    res.json({ from: req.query.from, days, assignments: rows.map(toAssignmentDto) });
  })
);

// Place employees at one location for every (date, shift) given. Used for a single slot or a whole day.
rosterRouter.put(
  '/assignments',
  requireRole(...ROSTER_EDITOR_ROLES),
  asyncHandler(async (req, res) => {
    const { data, errors } = validateRosterUpdate(req.body ?? {});
    if (errors) throw new HttpError(422, 'Validation failed', errors);
    const { dates, shifts, location, employeeIds, mode } = data;

    if (employeeIds.length) {
      const [eligible] = await pool.query('SELECT id FROM employees WHERE id IN (?) AND is_active = 1 AND role IN (?)', [
        employeeIds,
        ROSTER_ELIGIBLE_ROLES,
      ]);
      if (eligible.length !== employeeIds.length) throw new HttpError(422, 'Some selected employees cannot be rostered');
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lock this shift's rows for the selected employees so nobody is placed in two locations.
      let existing = [];
      if (employeeIds.length) {
        [existing] = await connection.query(
          `SELECT DATE_FORMAT(d.duty_date, '%Y-%m-%d') AS duty_date, d.shift, d.location, d.employee_id, e.full_name
           FROM duty_assignments d JOIN employees e ON e.id = d.employee_id
           WHERE d.duty_date IN (?) AND d.shift IN (?) AND d.employee_id IN (?) FOR UPDATE`,
          [dates, shifts, employeeIds]
        );
      }
      const conflicts = existing.filter((r) => r.location !== location);
      if (conflicts.length) {
        const details = conflicts.map(
          (r) => `${r.full_name} is already in ${locationLabel(r.location)} for the ${shiftLabel(r.shift)} shift on ${r.duty_date}`
        );
        throw new HttpError(409, details[0], details);
      }

      if (mode === 'replace') {
        await connection.query('DELETE FROM duty_assignments WHERE duty_date IN (?) AND shift IN (?) AND location = ?', [
          dates,
          shifts,
          location,
        ]);
      }
      const alreadyHere = new Set(
        mode === 'add' ? existing.map((r) => `${r.duty_date}|${r.shift}|${r.employee_id}`) : []
      );
      const rows = dates.flatMap((date) =>
        shifts.flatMap((shift) =>
          employeeIds
            .filter((id) => !alreadyHere.has(`${date}|${shift}|${id}`))
            .map((id) => [date, shift, location, id, req.user.id])
        )
      );
      if (rows.length) {
        await connection.query(
          'INSERT INTO duty_assignments (duty_date, shift, location, employee_id, assigned_by) VALUES ?',
          [rows]
        );
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    const [updated] = await pool.query(`${SELECT_ASSIGNMENTS} WHERE d.duty_date IN (?) AND d.shift IN (?) ${ORDER}`, [
      dates,
      shifts,
    ]);
    res.json({ assignments: updated.map(toAssignmentDto) });
  })
);
