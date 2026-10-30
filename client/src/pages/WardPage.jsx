import { useCallback, useEffect, useMemo, useState } from 'react';
import { BED_ALLOCATION_EDITOR_ROLES, TASK_ASSIGNEE_ROLES } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useTaskBadge } from '../taskBadge.jsx';
import { dayQuery, dayRange, formatDateTime } from '../dates.js';
import ArchiveNotice from '../components/ArchiveNotice.jsx';
import BedAllocationBar from '../components/BedAllocationBar.jsx';
import BedList from '../components/BedList.jsx';
import BedTaskDialog from '../components/BedTaskDialog.jsx';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  const checkFilter = (id, label, checked, onChange) => (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-auto">
          <h2 className="m-0 text-2xl font-semibold">Ward</h2>
          <p className="m-0 text-sm text-muted-foreground">
            {beds ? `${list.length} occupied beds` : 'Loading beds…'} · {openTasks.length} open{' '}
            {openTasks.length === 1 ? 'task' : 'tasks'} today
            {hasBeds && ` · ${myCount} of my beds occupied`}
          </p>
        </div>
        <span className="hidden flex-1 sm:block" />
        <Input
          className="w-full sm:w-64"
          placeholder="Search bed, patient, MR, consultant"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {checkFilter('only-with-tasks', 'Only beds with open tasks', onlyWithTasks, setOnlyWithTasks)}
        {hasBeds && checkFilter('only-mine', 'My beds', onlyMine, setOnlyMine)}
        {canAllocate && (
          <Button
            variant={allocating ? 'default' : 'outline'}
            onClick={() => (allocating ? stopAllocating() : setAllocating(true))}
          >
            {allocating ? 'Done' : 'Allocate beds'}
          </Button>
        )}
        {allocating && <div className="md:hidden">{checkFilter('tick-all', 'Tick all shown', allShownTicked, tickAllShown)}</div>}
      </div>

      {allocating && (
        <p className="mt-0 mb-3 text-sm text-muted-foreground">
          Tick beds (search narrows the list, "Tick all shown" ticks them all), pick doctors below, then add them to the beds
          or replace whoever covers them now.
        </p>
      )}
      {error && <p className="mt-0 mb-3 text-sm text-destructive">{error}</p>}
      {bedsError && <p className="mt-0 mb-3 text-sm text-destructive">{bedsError}</p>}
      {beds?.stale && (
        <p className="archive-notice">
          The hospital system isn't responding, so this is the bed list from {formatDateTime(beds.fetchedAt)}.
        </p>
      )}
      <ArchiveNotice count={earlierCount} />

      {beds && (
        <p className="mt-0 mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          From the hospital system · updated {formatDateTime(beds.fetchedAt)}
          <Button variant="outline" size="xs" onClick={() => loadBeds(true)} disabled={refreshing}>
            {refreshing ? 'Refreshing… (can take ~10 s)' : 'Refresh'}
          </Button>
        </p>
      )}

      <BedList
        beds={shown}
        emptyText={!beds && !bedsError ? 'Loading beds from the hospital system…' : 'No beds to show'}
        userId={user.id}
        tasksFor={(bed) => tasksByKey.get(bedKey(bed)) ?? []}
        doctorsFor={(bed) => doctorsByBed.get(bed.code) ?? []}
        onOpen={setSelected}
        allocating={allocating}
        isTicked={(bed) => tickedBeds.has(bed.code)}
        onToggle={(bed) => toggle(tickedBeds, setTickedBeds, bed.code)}
        allTicked={allShownTicked}
        onTickAll={tickAllShown}
      />

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
