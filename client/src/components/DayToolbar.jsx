import { formatDay, shiftDate, today } from '../dates.js';

// Page heading for a single day with previous/next arrows, a date picker and a jump back to today.
export default function DayToolbar({ date, onChange }) {
  const isToday = date === today();

  return (
    <div className="toolbar">
      <div>
        <h2>{isToday ? 'On duty today' : 'On duty'}</h2>
        <p className="muted subtitle">{formatDay(date).long}</p>
      </div>
      <span className="spacer" />
      <div className="month-picker">
        <button className="btn ghost" onClick={() => onChange(shiftDate(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <input type="date" value={date} onChange={(e) => e.target.value && onChange(e.target.value)} />
        <button className="btn ghost" onClick={() => onChange(shiftDate(date, 1))} aria-label="Next day">
          ›
        </button>
        {!isToday && (
          <button className="btn ghost" onClick={() => onChange(today())}>
            Today
          </button>
        )}
      </div>
    </div>
  );
}
