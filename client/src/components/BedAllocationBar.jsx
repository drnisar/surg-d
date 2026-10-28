import { DESIGNATIONS } from '@surg-d/shared';

// Bottom bar on the Ward page while allocating: pick doctors, then add them to, or replace them on, the ticked beds.
export default function BedAllocationBar({ doctors, bedCount, doctorIds, onToggleDoctor, onApply, busy, error }) {
  const groups = DESIGNATIONS.map((d) => ({ ...d, doctors: doctors.filter((doc) => doc.designation === d.key) })).filter(
    (g) => g.doctors.length
  );
  const none = !bedCount || busy;

  return (
    <div className="card allocation-bar">
      <div className="allocation-doctors">
        {groups.map((g) => (
          <div key={g.key} className="allocation-group">
            <span className="muted small">{g.short}</span>
            {g.doctors.map((d) => (
              <button
                type="button"
                key={d.id}
                className={`chip-btn ${doctorIds.has(d.id) ? 'selected' : ''}`}
                aria-pressed={doctorIds.has(d.id)}
                onClick={() => onToggleDoctor(d.id)}
              >
                {d.fullName}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="allocation-actions">
        <span className="muted small">
          {bedCount} {bedCount === 1 ? 'bed' : 'beds'} ticked · {doctorIds.size} {doctorIds.size === 1 ? 'doctor' : 'doctors'}
        </span>
        <span className="spacer" />
        {error && <span className="error">{error}</span>}
        <button className="btn primary" disabled={none || !doctorIds.size} onClick={() => onApply('add')}>
          Add to beds
        </button>
        <button className="btn ghost" disabled={none || !doctorIds.size} onClick={() => onApply('replace')}>
          Replace on beds
        </button>
        <button className="btn ghost danger" disabled={none} onClick={() => onApply('clear')}>
          Clear beds
        </button>
      </div>
    </div>
  );
}
