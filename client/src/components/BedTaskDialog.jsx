import { useCallback, useEffect, useState } from 'react';
import { DESIGNATIONS, TASK_MAX_LENGTH, TASK_TEMPLATES } from '@surg-d/shared';
import { api } from '../api.js';
import { dayQuery, dayRange } from '../dates.js';
import ArchiveNotice from './ArchiveNotice.jsx';
import TaskList from './TaskList.jsx';

// Dialog for one bed: assign one or more tasks (typed or picked from the predefined list) to a doctor,
// and see the bed's open and completed tasks for today. Earlier undone tasks are linked to the Archive.
export default function BedTaskDialog({ bed, doctors, onClose, onChanged }) {
  const [open, setOpen] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [earlierCount, setEarlierCount] = useState(0);
  const [items, setItems] = useState([]); // tasks queued for assignment
  const [draft, setDraft] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Tasks follow the patient, so they show here even if they were assigned on a previous bed.
  const filter = bed.mrNumber ? { patient: bed.mrNumber } : { bed: bed.code };
  const filterQuery = new URLSearchParams(filter).toString();

  const load = useCallback(async () => {
    try {
      const todayOnly = dayQuery();
      const [o, c, e] = await Promise.all([
        api(`/tasks?${filterQuery}&${todayOnly}`),
        api(`/tasks?${filterQuery}&status=completed&${todayOnly}`),
        api(`/tasks?${filterQuery}&to=${dayRange().from}`),
      ]);
      setOpen(o);
      setCompleted(c);
      setEarlierCount(e.length);
    } catch (err) {
      setError(err.message);
    }
  }, [filterQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const addDraft = () => {
    const text = draft.trim().replace(/\s+/g, ' ');
    if (text && !items.includes(text)) setItems([...items, text]);
    setDraft('');
  };

  const toggleTemplate = (t) => setItems(items.includes(t) ? items.filter((i) => i !== t) : [...items, t]);

  // Text still in the box counts too, so a single typed task can be assigned without pressing Add.
  const pending = draft.trim() && !items.includes(draft.trim()) ? [...items, draft.trim()] : items;

  const assign = async (e) => {
    e.preventDefault();
    if (!pending.length) {
      setErrors({ description: 'Add at least one task' });
      return;
    }
    setBusy(true);
    setErrors({});
    setError('');
    try {
      await api('/tasks', { method: 'POST', body: { bedCode: bed.code, descriptions: pending, assignedTo } });
      setItems([]);
      setDraft('');
      await load();
      onChanged();
    } catch (err) {
      setError(err.details ? '' : err.message);
      setErrors(err.details ?? {});
    } finally {
      setBusy(false);
    }
  };

  const complete = async (task) => {
    try {
      await api(`/tasks/${task.id}/complete`, { method: 'POST' });
    } catch (err) {
      setError(err.message);
    }
    await load();
    onChanged();
  };

  const groups = DESIGNATIONS.map((d) => ({ ...d, doctors: doctors.filter((doc) => doc.designation === d.key) })).filter(
    (g) => g.doctors.length
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal task-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>Bed {bed.code}</h2>
          {bed.patientName && (
            <p className="muted">
              {[bed.patientName, bed.mrNumber, bed.consultantName].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <form className="task-form" onSubmit={assign}>
          <label>
            Tasks
            <div className="task-input">
              <input
                list="task-templates"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDraft();
                  }
                }}
                placeholder="Type a task and press Enter, or pick below"
                maxLength={TASK_MAX_LENGTH}
                autoFocus
              />
              <button type="button" className="btn ghost" onClick={addDraft} disabled={!draft.trim()}>
                Add
              </button>
            </div>
            <datalist id="task-templates">
              {TASK_TEMPLATES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {errors.description && <span className="error">{errors.description}</span>}
          </label>
          <div className="template-chips">
            {TASK_TEMPLATES.map((t) => (
              <button
                type="button"
                key={t}
                className={`chip-btn ${items.includes(t) ? 'selected' : ''}`}
                aria-pressed={items.includes(t)}
                onClick={() => toggleTemplate(t)}
              >
                {items.includes(t) ? '✓ ' : ''}
                {t}
              </button>
            ))}
          </div>
          {items.length > 0 && (
            <ol className="pending-tasks">
              {items.map((t) => (
                <li key={t}>
                  <span>{t}</span>
                  <button type="button" className="remove" aria-label={`Remove ${t}`} onClick={() => toggleTemplate(t)}>
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}
          <label>
            Assign to
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} required>
              <option value="">Select doctor…</option>
              {groups.map((g) => (
                <optgroup key={g.key} label={g.label}>
                  {g.doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.assignedTo && <span className="error">{errors.assignedTo}</span>}
          </label>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Close
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Assigning…' : pending.length > 1 ? `Assign ${pending.length} tasks` : 'Assign task'}
            </button>
          </div>
        </form>

        <h3>Open tasks today</h3>
        <ArchiveNotice count={earlierCount} filter={filter} />
        <TaskList tasks={open} onComplete={complete} showBed={false} emptyText="No open tasks for this patient today." />
        {completed.length > 0 && (
          <>
            <h3>Completed today</h3>
            <TaskList tasks={completed} showBed={false} />
          </>
        )}
      </div>
    </div>
  );
}
