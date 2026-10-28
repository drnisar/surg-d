import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BED_CODE_PATTERN } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { dateOf, dayRange, formatDay } from '../dates.js';
import TaskList from '../components/TaskList.jsx';

const COMPLETED_CAP = 200; // matches the server's limit on completed tasks per request

// Tasks created before today, grouped by day (newest first). Undone tasks can still be completed here.
// Filters live in the URL (?status=completed&patient=<MR>&bed=K031539&mine=1) so other pages can link to a view.
export default function ArchivePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') === 'completed' ? 'completed' : 'open';
  const patient = /^[A-Z]\d{13}$/.test(params.get('patient') ?? '') ? params.get('patient') : '';
  const bed = BED_CODE_PATTERN.test(params.get('bed') ?? '') ? params.get('bed') : '';
  const mine = params.get('mine') === '1';
  const [tasks, setTasks] = useState(null);
  const [wardBeds, setWardBeds] = useState([]); // current patients, for the patient filter
  const [error, setError] = useState('');

  useEffect(() => {
    api('/beds')
      .then((data) => setWardBeds(data.beds.filter((b) => b.mrNumber)))
      .catch(() => {});
  }, []);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    const query = new URLSearchParams({ to: dayRange().from, status });
    if (patient) query.set('patient', patient);
    if (bed) query.set('bed', bed);
    if (mine) query.set('scope', 'mine');
    try {
      setTasks(await api(`/tasks?${query}`));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [status, patient, bed, mine]);

  useEffect(() => {
    setTasks(null);
    load();
  }, [load]);

  const days = useMemo(() => {
    const map = new Map();
    for (const t of tasks ?? []) {
      const day = dateOf(t.createdAt);
      map.set(day, [...(map.get(day) ?? []), t]);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [tasks]);

  const complete = async (task) => {
    try {
      await api(`/tasks/${task.id}/complete`, { method: 'POST' });
    } catch (err) {
      setError(err.message);
    }
    load();
  };

  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Task archive</h2>
          <p className="muted subtitle">Tasks from before today</p>
        </div>
        <span className="spacer" />
        <div className="segmented archive-status" role="radiogroup" aria-label="Status">
          {[
            ['open', 'Undone'],
            ['completed', 'Completed'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={status === key}
              className={status === key ? 'active' : ''}
              onClick={() => setFilter('status', key === 'open' ? '' : key)}
            >
              {label}
            </button>
          ))}
        </div>
        <select value={patient} onChange={(e) => setFilter('patient', e.target.value)} aria-label="Patient">
          <option value="">All patients</option>
          {patient && !wardBeds.some((b) => b.mrNumber === patient) && (
            <option value={patient}>{patient} (no longer on the ward)</option>
          )}
          {wardBeds.map((b) => (
            <option key={b.code} value={b.mrNumber}>
              {b.code} · {b.patientName}
            </option>
          ))}
        </select>
        {bed && (
          <button className="btn ghost" onClick={() => setFilter('bed', '')} title="Clear bed filter">
            Bed {bed} ×
          </button>
        )}
        <label className="inline">
          <input type="checkbox" checked={mine} onChange={(e) => setFilter('mine', e.target.checked ? '1' : '')} />
          Only mine
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {tasks === null && !error ? (
        <p className="muted">Loading…</p>
      ) : !days.length ? (
        <p className="muted">
          {status === 'open' ? 'No undone tasks from earlier days.' : 'No completed tasks from earlier days.'}
        </p>
      ) : (
        <>
          <p className="muted small">
            {tasks.length} {status === 'open' ? 'undone' : 'completed'} {tasks.length === 1 ? 'task' : 'tasks'} across{' '}
            {days.length} {days.length === 1 ? 'day' : 'days'}
            {status === 'completed' && tasks.length >= COMPLETED_CAP && ` (latest ${COMPLETED_CAP} shown)`}
          </p>
          <div className="archive-days">
            {days.map(([day, list]) => (
              <section key={day} className="card">
                <h3>
                  {formatDay(day).long} <span className="count">{list.length}</span>
                </h3>
                <TaskList
                  tasks={list}
                  onComplete={status === 'open' ? complete : undefined}
                  highlightId={user.id}
                  showBed={!bed && !patient}
                />
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
