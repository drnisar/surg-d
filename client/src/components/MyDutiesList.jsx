import { LOCATIONS, SHIFTS, locationLabel } from '@surg-d/shared';
import { formatDay } from '../dates.js';

const shiftLabel = (key) => SHIFTS.find((s) => s.key === key)?.label ?? key;
const placeName = (key) => LOCATIONS.find((l) => l.key === key)?.name ?? locationLabel(key);

// The signed-in user's upcoming duties, one row per date. `onSelectDate` opens that day on the Today page.
export default function MyDutiesList({ duties, days, selectedDate, todayDate, onSelectDate }) {
  const byDate = new Map();
  for (const d of duties) byDate.set(d.date, [...(byDate.get(d.date) ?? []), d]);

  return (
    <section className="card my-duties">
      <h3>
        My duties <span className="muted small">next {days} days</span>
      </h3>
      {byDate.size ? (
        <ul>
          {[...byDate].map(([date, list]) => (
            <li key={date}>
              <button
                className={`cell-btn duty-row ${date === selectedDate ? 'selected' : ''}`}
                onClick={() => onSelectDate(date)}
              >
                <span className="duty-date">
                  {formatDay(date).short}
                  {date === todayDate && <span className="today-tag">Today</span>}
                </span>
                <span className="duty-shifts">
                  {list.map((d) => (
                    <span key={d.shift} className="chip">
                      {shiftLabel(d.shift)} · {placeName(d.location)}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No duties on the roster for the next {days} days.</p>
      )}
    </section>
  );
}
