import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROSTER_EDITOR_ROLES, ROSTER_ELIGIBLE_ROLES, daysInMonth, locationLabel } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import RosterPicker from '../components/RosterPicker.jsx';
import RosterTable from '../components/RosterTable.jsx';
import { shiftMonth, toMonth } from '../dates.js';

export default function RosterPage() {
  const { user } = useAuth();
  const canEdit = ROSTER_EDITOR_ROLES.includes(user.role);
  const [month, setMonth] = useState(() => toMonth(new Date()));
  const [assignments, setAssignments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState(null); // { date, shifts, location, title }
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api(`/roster?month=${month}`);
      setAssignments(data.assignments);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  // The doctor list is only needed once someone starts editing.
  useEffect(() => {
    if (!editMode || doctors.length) return;
    api('/employees')
      .then((list) => setDoctors(list.filter((e) => ROSTER_ELIGIBLE_ROLES.includes(e.role))))
      .catch((err) => setError(err.message));
  }, [editMode, doctors.length]);

  // `${date}|${shift}|${location}` -> employees there; `${date}|${shift}` -> Map(employeeId -> location)
  const { bySlot, byShift } = useMemo(() => {
    const bySlot = new Map();
    const byShift = new Map();
    for (const a of assignments) {
      const slotKey = `${a.date}|${a.shift}|${a.location}`;
      bySlot.set(slotKey, [...(bySlot.get(slotKey) ?? []), a.employee]);
      const shiftKey = `${a.date}|${a.shift}`;
      if (!byShift.has(shiftKey)) byShift.set(shiftKey, new Map());
      byShift.get(shiftKey).set(a.employee.id, a.location);
    }
    return { bySlot, byShift };
  }, [assignments]);

  const slot = (date, shift, location) => bySlot.get(`${date}|${shift}|${location}`) ?? [];
  const days = daysInMonth(month) ?? [];

  const save = async ({ employeeIds, mode, location }) => {
    await api('/roster/assignments', {
      method: 'PUT',
      body: { dates: [editing.date], shifts: editing.shifts, location, employeeIds, mode },
    });
    setEditing(null);
    load();
  };

  // For a location in the shifts being edited: who starts ticked (there in every shift)
  // and who is unavailable because they are placed somewhere else in one of those shifts.
  const describe = (location) => {
    const { date, shifts } = editing;
    const [first, ...rest] = shifts.map((s) => new Set(slot(date, s, location).map((e) => e.id)));
    const initialIds = [...first].filter((id) => rest.every((set) => set.has(id)));
    const busy = new Map();
    for (const shift of shifts) {
      for (const [id, loc] of byShift.get(`${date}|${shift}`) ?? []) {
        if (loc === location) continue;
        const where = shifts.length > 1 ? `${locationLabel(loc)} (${shift})` : locationLabel(loc);
        busy.set(id, busy.has(id) ? `${busy.get(id)}, ${where}` : where);
      }
    }
    return { initialIds, busy };
  };

  return (
    <>
      <div className="toolbar">
        <h2>Duty roster</h2>
        <span className="spacer" />
        <div className="month-picker">
          <button className="btn ghost" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            ‹
          </button>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <button className="btn ghost" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            ›
          </button>
          <button className="btn ghost" onClick={() => setMonth(toMonth(new Date()))}>
            This month
          </button>
        </div>
        {canEdit && (
          <button className={`btn ${editMode ? 'primary' : 'ghost'}`} onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {editMode && (
        <p className="muted hint">
          Click a place of duty to set who is there, or click a date to place doctors for both shifts. Each person can be
          in only one place per shift.
        </p>
      )}
      {error && <p className="error">{error}</p>}

      <RosterTable days={days} slot={slot} canEdit={editMode} onEdit={setEditing} />

      {editing && (
        <RosterPicker
          title={editing.title}
          doctors={doctors}
          initialLocation={editing.location}
          describe={describe}
          chooseLocation={Boolean(editing.chooseLocation)}
          wholeDay={editing.shifts.length > 1}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </>
  );
}
