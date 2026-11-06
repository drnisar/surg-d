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
  // An HttpError's message is written for users (e.g. a 502 when the hospital system is down);
  // anything else that fails is hidden behind a generic message.
  const expected = err instanceof HttpError;
  if (status >= 500 && !expected) console.error(err);
  res.status(status).json({ error: expected || status < 500 ? err.message : 'Internal server error', details: err.details });
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
