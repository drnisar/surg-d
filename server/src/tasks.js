import { BED_CODE_PATTERN, TASK_BATCH_LIMIT, TASK_MAX_LENGTH } from '@surg-d/shared';

// Accepts one task (`description`) or several for the same doctor (`descriptions`).
export function validateTask(input) {
  const errors = {};
  const bedCode = String(input.bedCode ?? '').trim().toUpperCase();
  const raw = Array.isArray(input.descriptions) ? input.descriptions : [input.description];
  const descriptions = [...new Set(raw.map((d) => String(d ?? '').trim().replace(/\s+/g, ' ')).filter(Boolean))];
  const assignedTo = Number(input.assignedTo);

  if (!BED_CODE_PATTERN.test(bedCode)) errors.bedCode = 'Unknown bed';
  if (!descriptions.length) errors.description = 'Add at least one task';
  else if (descriptions.length > TASK_BATCH_LIMIT) errors.description = `At most ${TASK_BATCH_LIMIT} tasks at a time`;
  else if (descriptions.some((d) => d.length > TASK_MAX_LENGTH)) errors.description = `Each task must be at most ${TASK_MAX_LENGTH} characters`;
  if (!Number.isInteger(assignedTo) || assignedTo <= 0) errors.assignedTo = 'Select a doctor';

  return { data: { bedCode, descriptions, assignedTo }, errors: Object.keys(errors).length ? errors : null };
}

// `from` / `to` are epoch milliseconds bounding created_at (to is exclusive). The client sends its own
// local midnight, so "today" follows the user's day rather than the server's timezone.
export function parseCreatedRange(query) {
  const range = {};
  for (const key of ['from', 'to']) {
    if (query[key] === undefined || query[key] === '') continue;
    const ms = Number(query[key]);
    if (!Number.isSafeInteger(ms) || ms < 0) return { range: null, error: `${key} must be a timestamp in milliseconds` };
    range[key] = ms;
  }
  if (range.from !== undefined && range.to !== undefined && range.from >= range.to) {
    return { range: null, error: 'from must be before to' };
  }
  return { range, error: null };
}

// SQL conditions for a parsed range; FROM_UNIXTIME compares in the session timezone, like the column.
export function createdRangeSql(range, column = 't.created_at') {
  const where = [];
  const params = [];
  if (range.from !== undefined) {
    where.push(`${column} >= FROM_UNIXTIME(?)`);
    params.push(range.from / 1000);
  }
  if (range.to !== undefined) {
    where.push(`${column} < FROM_UNIXTIME(?)`);
    params.push(range.to / 1000);
  }
  return { where, params };
}

const person = (id, name) => (id ? { id, fullName: name } : null);

export function toTaskDto(row) {
  return {
    id: row.id,
    bedCode: row.bed_code,
    patientMr: row.patient_mr,
    description: row.description,
    status: row.status,
    assignedTo: person(row.assigned_to, row.assigned_to_name),
    assignedBy: person(row.assigned_by, row.assigned_by_name),
    completedBy: person(row.completed_by, row.completed_by_name),
    completedAt: row.completed_at,
    seen: Boolean(row.seen_at),
    createdAt: row.created_at,
  };
}
