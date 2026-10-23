export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err, _req, res, _next) {
  if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage?.includes('uq_duty_slot_employee')) {
    return res.status(409).json({ error: 'An employee is already on duty elsewhere in that shift' });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    const field = /uq_employees_(\w+)/.exec(err.sqlMessage ?? '')?.[1] ?? 'value';
    return res.status(409).json({ error: `An employee with this ${field.replace('_', ' ')} already exists` });
  }
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message, details: err.details });
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
