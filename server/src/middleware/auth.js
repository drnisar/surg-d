import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../errors.js';

export function signToken(employee) {
  return jwt.sign({ sub: employee.id, role: employee.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Token for `employee` issued to an admin testing as them; `imp` records the admin.
export function signImpersonationToken(employee, adminId) {
  return jwt.sign({ sub: employee.id, role: employee.role, imp: adminId }, config.jwtSecret, {
    expiresIn: config.impersonationExpiresIn,
  });
}

export function requireAuth(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return next(new HttpError(401, 'Authentication required'));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, role: payload.role, impersonatedBy: payload.imp };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'Insufficient permissions'));
