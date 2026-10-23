import { LOCATIONS, SHIFTS, designationLabel } from '@surg-d/shared';
import { formatDay, today } from '../dates.js';

// Month grid of the duty roster: one row per day, one column per shift, filled places of duty within each shift.
// `slot(date, shift, location)` returns the employees placed there.
// When `canEdit` is set, cells are clickable and call `onEdit({ date, shifts, location, chooseLocation?, title })`.
export default function RosterTable({ days, slot, canEdit = false, onEdit }) {
  const todayStr = today();

  return (
    <div className="table-wrap">
      <table className="roster">
        <thead>
          <tr>
            <th className="date-col">Date</th>
            {SHIFTS.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((date) => {
            const { day, weekday, long, isWeekend } = formatDay(date);
            const rowClass = [date === todayStr && 'today', isWeekend && 'weekend'].filter(Boolean).join(' ');
            return (
              <tr key={date} className={rowClass}>
                <td className="date-col">
                  {canEdit ? (
                    <button
                      className="cell-btn date-btn"
                      onClick={() =>
                        onEdit({
                          date,
                          shifts: SHIFTS.map((s) => s.key),
                          location: 'ward',
                          chooseLocation: true,
                          title: `${long} — both shifts`,
                        })
                      }
                    >
                      <strong>{day}</strong> <span className="muted">{weekday}</span>
                    </button>
                  ) : (
                    <span>
                      <strong>{day}</strong> <span className="muted">{weekday}</span>
                    </span>
                  )}
                </td>
                {SHIFTS.map((s) => {
                  const filled = LOCATIONS.filter((loc) => slot(date, s.key, loc.key).length);
                  const firstEmpty = LOCATIONS.find((loc) => !filled.includes(loc)) ?? LOCATIONS[0];
                  return (
                    <td key={s.key}>
                      <div className="locations">
                        {filled.map((loc) => {
                          const content = (
                            <>
                              <span className="loc-tag" title={loc.name}>
                                {loc.label}
                              </span>
                              <span className="chips">
                                {slot(date, s.key, loc.key).map((p) => (
                                  <span key={p.id} className={`chip role-${p.role}`} title={designationLabel(p.designation)}>
                                    {p.fullName}
                                  </span>
                                ))}
                              </span>
                            </>
                          );
                          return canEdit ? (
                            <button
                              key={loc.key}
                              className="cell-btn loc-row"
                              onClick={() =>
                                onEdit({ date, shifts: [s.key], location: loc.key, title: `${long} — ${s.label} — ${loc.name}` })
                              }
                            >
                              {content}
                            </button>
                          ) : (
                            <div key={loc.key} className="loc-row">
                              {content}
                            </div>
                          );
                        })}
                        {canEdit ? (
                          <button
                            className="cell-btn add-btn muted"
                            onClick={() =>
                              onEdit({
                                date,
                                shifts: [s.key],
                                location: firstEmpty.key,
                                chooseLocation: true,
                                title: `${long} — ${s.label}`,
                              })
                            }
                          >
                            + Assign
                          </button>
                        ) : (
                          !filled.length && <span className="muted loc-row">—</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
