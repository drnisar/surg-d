import { ROLES } from './designations.js';

export const SHIFTS = [
  { key: 'morning', label: 'Morning' },
  { key: 'evening', label: 'Evening' },
];

export const SHIFT_KEYS = SHIFTS.map((s) => s.key);

// Places of duty within a shift. An employee can be in only one place per shift.
export const LOCATIONS = [
  { key: 'ward', label: 'Ward', name: 'Ward' },
  { key: 'sau', label: 'SAU', name: 'Surgical Assessment Unit' },
  { key: 'or', label: 'OR', name: 'Operating Room' },
  { key: 'opd', label: 'OPD', name: 'Outpatient Department' },
];

export const LOCATION_KEYS = LOCATIONS.map((l) => l.key);

export function locationLabel(location) {
  return LOCATIONS.find((l) => l.key === location)?.label ?? location;
}

// Who can be put on the duty roster, and who can change it.
export const ROSTER_ELIGIBLE_ROLES = [ROLES.CONSULTANT, ROLES.MANAGER, ROLES.DOCTOR];
export const ROSTER_EDITOR_ROLES = [ROLES.ADMIN, ROLES.CONSULTANT, ROLES.MANAGER];

// 'YYYY-MM' -> ['YYYY-MM-01', ...] for every day of that month.
export function daysInMonth(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  if (!match) return null;
  const [year, mon] = [Number(match[1]), Number(match[2])];
  if (mon < 1 || mon > 12) return null;
  const count = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${match[1]}-${match[2]}-${String(i + 1).padStart(2, '0')}`);
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  return daysInMonth(value.slice(0, 7))?.includes(value) ?? false;
}
