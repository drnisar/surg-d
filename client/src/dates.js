// Dates are handled as local 'YYYY-MM-DD' / 'YYYY-MM' strings to avoid timezone shifts.
const pad = (n) => String(n).padStart(2, '0');

export const toMonth = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const toDate = (d) => `${toMonth(d)}-${pad(d.getDate())}`;
export const today = () => toDate(new Date());

const parse = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d ?? 1);
};

export function shiftMonth(month, delta) {
  const d = parse(month);
  return toMonth(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

export function shiftDate(date, delta) {
  const d = parse(date);
  return toDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
}

export function formatDay(date) {
  const local = parse(date);
  return {
    day: local.getDate(),
    weekday: local.toLocaleDateString('en-GB', { weekday: 'short' }),
    long: local.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    isWeekend: local.getDay() === 0,
  };
}

// Local midnight to the next local midnight, in epoch ms, for the API's created-at range filters.
export function dayRange(date = today()) {
  return { from: parse(date).getTime(), to: parse(shiftDate(date, 1)).getTime() };
}

// Query string for tasks created on `date` (default today), e.g. 'from=…&to=…'.
export const dayQuery = (date) => new URLSearchParams(dayRange(date)).toString();

// ISO timestamp -> local 'YYYY-MM-DD'
export const dateOf = (iso) => toDate(new Date(iso));

// ISO timestamp -> '23 Oct, 10:15'
export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
