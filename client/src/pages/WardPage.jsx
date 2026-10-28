import { useCallback, useEffect, useMemo, useState } from 'react';
import { BED_ALLOCATION_EDITOR_ROLES, TASK_ASSIGNEE_ROLES } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useTaskBadge } from '../taskBadge.jsx';
import { dayQuery, dayRange, formatDateTime } from '../dates.js';
import ArchiveNotice from '../components/ArchiveNotice.jsx';
import BedAllocationBar from '../components/BedAllocationBar.jsx';
import BedTaskDialog from '../components/BedTaskDialog.jsx';

// Tasks follow the patient; older tasks saved before patients were linked fall back to the bed code.
const taskKey = (t) => t.patientMr ?? `bed:${t.bedCode}`;
const bedKey = (b) => b.mrNumber ?? `bed:${b.code}`;

export default function WardPage() {
  const { user } = useAuth();
  const canAllocate = BED_ALLOCATION_EDITOR_ROLES.includes(user.role);
  const { refresh: refreshBadge } = useTaskBadge();
  const [beds, setBeds] = useState(null); // { beds, fetchedAt, stale } from the hospital system
  const [bedsError, setBedsError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [openTasks, setOpenTasks] = useState([]); // today's only
  const [earlierCount, setEarlierCount] = useState(0);
  const [doctors, setDoctors] = useState([]);
  const [allocations, setAllocations] = useState([]); // [{ bedCode, doctor }]
  const [onlyWithTasks, setOnlyWithTasks] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [tickedBeds, setTickedBeds] = useState(() => new Set());
  const [tickedDoctors, setTickedDoctors] = useState(() => new Set());
  const [allocBusy, setAllocBusy] = useState(false);
  const [allocError, setAllocError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const loadBeds = useCallback(async (refresh = false) => {
    setRefreshing(refresh);
    try {
      setBeds(await api(`/beds${refresh ? '?refresh=1' : ''}`));
      setBedsError('');
    } catch (err) {
      setBedsError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadTasks = useCallback(() => {
    api(`/tasks?${dayQuery()}`)
      .then(setOpenTasks)
      .catch((err) => setError(err.message));
    api(`/tasks?to=${dayRange().from}`)
      .then((earlier) => setEarlierCount(earlier.length))
      .catch(() => {});
  }, []);

  const loadAllocations = useCallback(
    () =>
      api('/beds/allocations')
        .then(setAllocations)
        .catch((err) => setError(err.message)),
    []
  );

  useEffect(() => {
    loadBeds();
    loadAllocations();
    api('/employees')
      .then((list) => setDoctors(list.filter((e) => TASK_ASSIGNEE_ROLES.includes(e.role))))
      .catch((err) => setError(err.message));
    loadTasks();
  }, [loadBeds, loadAllocations, loadTasks]);

  const tasksByKey = useMemo(() => {
    const map = new Map();
    for (const t of openTasks) map.set(taskKey(t), [...(map.get(taskKey(t)) ?? []), t]);
    return map;
  }, [openTasks]);

  const doctorsByBed = useMemo(() => {
    const map = new Map();
    for (const a of allocations) map.set(a.bedCode, [...(map.get(a.bedCode) ?? []), a.doctor]);
    return map;
  }, [allocations]);

  const isMine = (b) => doctorsByBed.get(b.code)?.some((d) => d.id === user.id) ?? false;
  const hasBeds = allocations.some((a) => a.doctor.id === user.id);

  const list = beds?.beds ?? [];
  const myCount = list.filter(isMine).length;
  const q = query.trim().toLowerCase();
  const shown = list.filter(
    (b) =>
      (!onlyWithTasks || tasksByKey.has(bedKey(b))) &&
      (!onlyMine || isMine(b)) &&
      (!q || [b.code, b.patientName, b.mrNumber, b.consultantName].some((v) => v?.toLowerCase().includes(q)))
  );

  const toggle = (set, setter, value) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };
  const allShownTicked = shown.length > 0 && shown.every((b) => tickedBeds.has(b.code));
  const tickAllShown = () => {
    const next = new Set(tickedBeds);
    for (const b of shown) {
      if (allShownTicked) next.delete(b.code);
      else next.add(b.code);
    }
    setTickedBeds(next);
  };

  const applyAllocation = async (action) => {
    setAllocBusy(true);
    setAllocError('');
    try {
      await api('/beds/allocations', {
        method: 'PUT',
        body: {
          bedCodes: [...tickedBeds],
          employeeIds: action === 'clear' ? [] : [...tickedDoctors],
          mode: action === 'add' ? 'add' : 'replace',
        },
      });
      setTickedBeds(new Set());
      await loadAllocations();
    } catch (err) {
      setAllocError(err.details ? Object.values(err.details)[0] : err.message);
    } finally {
      setAllocBusy(false);
    }
  };

  const stopAllocating = () => {
    setAllocating(false);
    setTickedBeds(new Set());
    setAllocError('');
  };

  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Ward</h2>
          <p className="muted subtitle">
            {beds ? `${list.length} occupied beds` : 'Loading beds…'} · {openTasks.length} open{' '}
            {openTasks.length === 1 ? 'task' : 'tasks'} today
            {hasBeds && ` · ${myCount} of my beds occupied`}
          </p>
        </div>
        <span className="spacer" />
        <input placeholder="Search bed, patient, MR, consultant" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="inline">
          <input type="checkbox" checked={onlyWithTasks} onChange={(e) => setOnlyWithTasks(e.target.checked)} />
          Only beds with open tasks
        </label>
        {hasBeds && (
          <label className="inline">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            My beds
          </label>
        )}
        {canAllocate && (
          <button
            className={`btn ${allocating ? 'primary' : 'ghost'}`}
            onClick={() => (allocating ? stopAllocating() : setAllocating(true))}
          >
            {allocating ? 'Done' : 'Allocate beds'}
          </button>
        )}
      </div>

      {allocating && (
        <p className="muted hint">
          Tick beds (search narrows the list, the header box ticks all shown), pick doctors below, then add them to the beds
          or replace whoever covers them now.
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {bedsError && <p className="error">{bedsError}</p>}
      {beds?.stale && (
        <p className="archive-notice">
          The hospital system isn't responding, so this is the bed list from {formatDateTime(beds.fetchedAt)}.
        </p>
      )}
      <ArchiveNotice count={earlierCount} />

      {beds && (
        <p className="muted small beds-source">
          From the hospital system · updated {formatDateTime(beds.fetchedAt)}{' '}
          <button className="btn ghost small-btn" onClick={() => loadBeds(true)} disabled={refreshing}>
            {refreshing ? 'Refreshing… (can take ~10 s)' : 'Refresh'}
          </button>
        </p>
      )}

      <div className="table-wrap">
        <table className="beds">
          <thead>
            <tr>
              {allocating && (
                <th className="tick">
                  <input type="checkbox" aria-label="Tick all shown beds" checked={allShownTicked} onChange={tickAllShown} />
                </th>
              )}
              <th>Bed</th>
              <th>Patient</th>
              <th>Open tasks today</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((bed) => {
              const tasks = tasksByKey.get(bedKey(bed)) ?? [];
              const responsible = doctorsByBed.get(bed.code) ?? [];
              return (
                <tr key={bed.code} className={tickedBeds.has(bed.code) ? 'ticked' : ''}>
                  {allocating && (
                    <td className="tick">
                      <input
                        type="checkbox"
                        aria-label={`Tick bed ${bed.code}`}
                        checked={tickedBeds.has(bed.code)}
                        onChange={() => toggle(tickedBeds, setTickedBeds, bed.code)}
                      />
                    </td>
                  )}
                  <td className="mono">
                    <strong>{bed.code}</strong>
                  </td>
                  <td>
                    {bed.patientName ?? <span className="muted">—</span>}
                    <div className="muted small">
                      {[bed.mrNumber, bed.consultantName, bed.unit].filter(Boolean).join(' · ')}
                    </div>
                    <div className="responsible small">
                      <span className="muted">Responsible:</span>{' '}
                      {responsible.length ? (
                        responsible.map((d) => (
                          <span key={d.id} className={`chip ${d.id === user.id ? 'mine' : ''}`}>
                            {d.fullName}
                          </span>
                        ))
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </div>
                  </td>
                  <td className="bed-tasks">
                    {tasks.length ? (
                      <div className="chips">
                        {tasks.map((t) => (
                          <span key={t.id} className={`chip ${t.assignedTo.id === user.id ? 'mine' : ''}`}>
                            {t.description} <span className="muted">→ {t.assignedTo.fullName}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="actions">
                    <button className="btn ghost" onClick={() => setSelected(bed)}>
                      Tasks{tasks.length ? ` (${tasks.length})` : ''}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!shown.length && (
              <tr>
                <td colSpan={allocating ? 5 : 4} className="muted center">
                  {!beds && !bedsError ? 'Loading beds from the hospital system…' : 'No beds to show'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {allocating && (
        <BedAllocationBar
          doctors={doctors}
          bedCount={tickedBeds.size}
          doctorIds={tickedDoctors}
          onToggleDoctor={(id) => toggle(tickedDoctors, setTickedDoctors, id)}
          onApply={applyAllocation}
          busy={allocBusy}
          error={allocError}
        />
      )}

      {selected && (
        <BedTaskDialog
          bed={selected}
          doctors={doctors}
          onClose={() => setSelected(null)}
          onChanged={() => {
            loadTasks();
            refreshBadge();
          }}
        />
      )}
    </>
  );
}
