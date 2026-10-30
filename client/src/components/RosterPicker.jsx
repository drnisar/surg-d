import { useMemo, useState } from 'react';
import { DESIGNATIONS, LOCATIONS } from '@surg-d/shared';

// `describe(location)` returns { initialIds, busy } where busy maps an employee id to where else they are placed.
export default function RosterPicker({
  title,
  doctors,
  initialLocation,
  chooseLocation,
  describe,
  wholeDay,
  onClose,
  onSave,
}) {
  const [location, setLocation] = useState(initialLocation);
  const [selected, setSelected] = useState(() => new Set(describe(initialLocation).initialIds));
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState(wholeDay ? 'add' : 'replace');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { busy: placedElsewhere } = useMemo(() => describe(location), [describe, location]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (d) => !q || d.fullName.toLowerCase().includes(q) || d.mrNumber.toLowerCase().includes(q);
    return DESIGNATIONS.map((des) => ({
      ...des,
      doctors: doctors.filter((d) => d.designation === des.key && match(d)),
    })).filter((g) => g.doctors.length);
  }, [doctors, query]);

  const changeLocation = (next) => {
    setLocation(next);
    setSelected(new Set(describe(next).initialIds));
  };

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({ employeeIds: [...selected], mode, location });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal picker" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{title}</h2>

        {chooseLocation && (
          <div className="segmented" role="radiogroup" aria-label="Place of duty">
            {LOCATIONS.map((loc) => (
              <button
                key={loc.key}
                type="button"
                role="radio"
                aria-checked={location === loc.key}
                className={location === loc.key ? 'active' : ''}
                title={loc.name}
                onClick={() => changeLocation(loc.key)}
              >
                {loc.label}
              </button>
            ))}
          </div>
        )}

        {wholeDay && (
          <div className="mode">
            <label className="inline-check">
              <input type="radio" checked={mode === 'add'} onChange={() => setMode('add')} />
              Add to both shifts (keep existing)
            </label>
            <label className="inline-check">
              <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              Replace both shifts with this selection
            </label>
          </div>
        )}

        <input placeholder="Search by name or MR number" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />

        <div className="picker-list">
          {groups.map((g) => (
            <fieldset key={g.key}>
              <legend>{g.label}</legend>
              {g.doctors.map((d) => {
                const elsewhere = placedElsewhere.get(d.id);
                return (
                  <label key={d.id} className={`inline ${elsewhere ? 'unavailable' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      disabled={Boolean(elsewhere) && !selected.has(d.id)}
                      onChange={() => toggle(d.id)}
                    />
                    {d.fullName}
                    {elsewhere && <span className="muted small">in {elsewhere}</span>}
                  </label>
                );
              })}
            </fieldset>
          ))}
          {!groups.length && <p className="muted">{doctors.length ? 'No matches' : 'No doctors yet — add them on the Staff page.'}</p>}
        </div>

        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <span className="muted">{selected.size} selected</span>
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={() => setSelected(new Set())}>
            Clear
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy || (mode === 'add' && !selected.size)}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
