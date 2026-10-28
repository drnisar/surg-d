import { Router } from 'express';
import { BED_CODE_PATTERN, TASK_ASSIGNEE_ROLES } from '@surg-d/shared';
import { pool } from '../db.js';
import { asyncHandler, HttpError } from '../errors.js';
import { findBed } from '../hospitalBeds.js';
import { requireAuth } from '../middleware/auth.js';
import { createdRangeSql, parseCreatedRange, toTaskDto, validateTask } from '../tasks.js';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const SELECT_TASKS = `
  SELECT t.*, a.full_name AS assigned_to_name, b.full_name AS assigned_by_name, c.full_name AS completed_by_name
  FROM tasks t
  JOIN employees a ON a.id = t.assigned_to
  LEFT JOIN employees b ON b.id = t.assigned_by
  LEFT JOIN employees c ON c.id = t.completed_by`;
const COMPLETED_LIMIT = 200;

function createdRangeOrThrow(query) {
  const { range, error } = parseCreatedRange(query);
  if (error) throw new HttpError(400, error);
  return createdRangeSql(range);
}

async function findTask(id) {
  const [rows] = await pool.query(`${SELECT_TASKS} WHERE t.id = ?`, [id]);
  return rows[0] ? toTaskDto(rows[0]) : null;
}

// ?scope=mine|ward (default ward) &status=open|completed (default open) &bed=K031539 &patient=<MR number>
// &from=&to= (epoch ms, created_at range; the client uses it for "today" and for the archive)
// Completed tasks come newest first and are capped; open tasks come oldest first.
tasksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status === 'completed' ? 'completed' : 'open';
    const where = ['t.status = ?'];
    const params = [status];
    if (req.query.scope === 'mine') {
      where.push('t.assigned_to = ?');
      params.push(req.user.id);
    }
    if (req.query.bed) {
      if (!BED_CODE_PATTERN.test(req.query.bed)) throw new HttpError(400, 'Unknown bed');
      where.push('t.bed_code = ?');
      params.push(req.query.bed);
    }
    if (req.query.patient) {
      if (!/^[A-Z]\d{13}$/.test(req.query.patient)) throw new HttpError(400, 'Unknown patient');
      where.push('t.patient_mr = ?');
      params.push(req.query.patient);
    }
    const created = createdRangeOrThrow(req.query);
    where.push(...created.where);
    params.push(...created.params);
    const order = status === 'open' ? 'ORDER BY t.created_at, t.id' : `ORDER BY t.completed_at DESC, t.id DESC LIMIT ${COMPLETED_LIMIT}`;
    const [rows] = await pool.query(`${SELECT_TASKS} WHERE ${where.join(' AND ')} ${order}`, params);
    res.json(rows.map(toTaskDto));
  })
);

tasksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { data, errors } = validateTask(req.body ?? {});
    if (errors) throw new HttpError(422, 'Validation failed', errors);

    // The patient comes from the hospital's current bed list, not from the client.
    let bed;
    try {
      bed = await findBed(data.bedCode);
    } catch {
      throw new HttpError(503, 'The hospital bed list is unavailable, so tasks cannot be assigned right now');
    }
    if (!bed) throw new HttpError(422, 'Validation failed', { bedCode: 'This bed is not in the current ward list' });

    const [assignee] = await pool.query('SELECT id FROM employees WHERE id = ? AND is_active = 1 AND role IN (?)', [
      data.assignedTo,
      TASK_ASSIGNEE_ROLES,
    ]);
    if (!assignee.length) throw new HttpError(422, 'Validation failed', { assignedTo: 'Tasks can only be assigned to active doctors' });

    // Saved in one transaction so a batch is all or nothing. Assigning to yourself needs no notification.
    const seenAt = data.assignedTo === req.user.id ? new Date() : null;
    const ids = [];
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const description of data.descriptions) {
        const [result] = await connection.query(
          'INSERT INTO tasks (bed_code, patient_mr, description, assigned_to, assigned_by, seen_at) VALUES (?, ?, ?, ?, ?, ?)',
          [bed.code, bed.mrNumber, description, data.assignedTo, req.user.id, seenAt]
        );
        ids.push(result.insertId);
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    const [created] = await pool.query(`${SELECT_TASKS} WHERE t.id IN (?) ORDER BY t.id`, [ids]);
    res.status(201).json(created.map(toTaskDto));
  })
);

// Anyone on the ward can complete a task; who did it is recorded.
tasksRouter.post(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const [result] = await pool.query(
      "UPDATE tasks SET status = 'completed', completed_by = ?, completed_at = NOW() WHERE id = ? AND status = 'open'",
      [req.user.id, req.params.id]
    );
    const task = await findTask(req.params.id);
    if (!task) throw new HttpError(404, 'Task not found');
    if (!result.affectedRows) throw new HttpError(409, `Already completed by ${task.completedBy?.fullName ?? 'someone else'}`);
    res.json(task);
  })
);

// Notification badge: open tasks assigned to me that I have not seen yet (optionally only today's, via from/to).
tasksRouter.get(
  '/unseen-count',
  asyncHandler(async (req, res) => {
    const created = createdRangeOrThrow(req.query);
    const where = ['t.assigned_to = ?', "t.status = 'open'", 't.seen_at IS NULL', ...created.where];
    const [[row]] = await pool.query(`SELECT COUNT(*) AS count FROM tasks t WHERE ${where.join(' AND ')}`, [
      req.user.id,
      ...created.params,
    ]);
    res.json({ count: Number(row.count) });
  })
);

tasksRouter.post(
  '/seen',
  asyncHandler(async (req, res) => {
    await pool.query('UPDATE tasks SET seen_at = NOW() WHERE assigned_to = ? AND seen_at IS NULL', [req.user.id]);
    res.status(204).end();
  })
);
