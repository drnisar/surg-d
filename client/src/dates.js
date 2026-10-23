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
