import { LOCATIONS, SHIFTS, designationLabel } from '@surg-d/shared';

// One card per shift listing who is on duty in each place of duty; empty places are hidden.
// `assignments` are one day's roster entries; `highlightId` marks that employee's rows (e.g. the signed-in user).
export default function ShiftDutyCards({ assignments, highlightId }) {
  const people = (shift, location) =>
    assignments.filter((a) => a.shift === shift && a.location === location).map((a) => a.employee);

  return (
    <div className="shift-cards">
      {SHIFTS.map((shift) => {
        const places = LOCATIONS.map((loc) => ({ ...loc, people: people(shift.key, loc.key) })).filter(
          (loc) => loc.people.length
        );
        return (
          <section key={shift.key} className="card shift-card">
            <h3>{shift.label} shift</h3>
            {places.length ? (
              places.map((loc) => (
                <div key={loc.key} className="duty-place">
                  <h4>
                    {loc.name} {loc.label !== loc.name && <span className="muted">({loc.label})</span>}
                  </h4>
                  <ul>
                    {loc.people.map((p) => (
                      <li key={p.id} className={p.id === highlightId ? 'me' : ''}>
                        <span className={`dot role-${p.role}`} />
                        <span className="who">
                          <strong>{p.fullName}</strong>
                          <span className="muted">{designationLabel(p.designation)}</span>
                        </span>
                        {p.phone && (
                          <a className="mono phone-link" href={`tel:${p.phone}`}>
                            {p.phone}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="muted">No one rostered.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
