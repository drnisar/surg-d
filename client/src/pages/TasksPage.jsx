import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useTaskBadge } from '../taskBadge.jsx';
import { dayQuery, dayRange, formatDay, today } from '../dates.js';
import ArchiveNotice from '../components/ArchiveNotice.jsx';
import TaskList from '../components/TaskList.jsx';

// Personal task page for today: my open tasks, the whole ward's open tasks, and today's completed ones.
// Undone tasks from earlier days live on the Archive page.
export default function TasksPage() {
  const { user } = useAuth();
  const { refresh: refreshBadge } = useTaskBadge();
  const [mine, setMine] = useState(null);
  const [ward, setWard] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [earlier, setEarlier] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const todayOnly = dayQuery();
    try {
      const [m, w, c, e] = await Promise.all([
        api(`/tasks?scope=mine&${todayOnly}`),
        api(`/tasks?${todayOnly}`),
        api(`/tasks?status=completed&${todayOnly}`),
        api(`/tasks?to=${dayRange().from}`),
      ]);
      setMine(m);
      setWard(w);
      setCompleted(c);
      setEarlier(e);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Load first so new tasks are still flagged on this visit, then mark them seen and clear the badge.
  useEffect(() => {
    load()
      .then(() => api('/tasks/seen', { method: 'POST' }))
      .then(refreshBadge)
      .catch(() => {});
  }, [load, refreshBadge]);

  const complete = async (task) => {
    try {
      await api(`/tasks/${task.id}/complete`, { method: 'POST' });
    } catch (err) {
      setError(err.message);
    }
    load();
  };

  if (mine === null && !error) return <p className="muted">Loading…</p>;

  const earlierMine = earlier.filter((t) => t.assignedTo.id === user.id).length;

  return (
    <>
      <div className="toolbar">
        <div>
          <h2>My tasks</h2>
          <p className="muted subtitle">{formatDay(today()).long}</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <ArchiveNotice count={earlier.length} mine={earlierMine} />

      <div className="task-columns">
        <section className="card">
          <h3>
            Assigned to me <span className="count">{mine?.length ?? 0}</span>
          </h3>
          <TaskList tasks={mine ?? []} onComplete={complete} highlightId={user.id} emptyText="Nothing assigned to you today." />
        </section>

        <section className="card">
          <h3>
            Whole ward <span className="count">{ward.length}</span>
          </h3>
          <TaskList tasks={ward} onComplete={complete} highlightId={user.id} emptyText="No open tasks on the ward today." />
        </section>
      </div>

      <section className="card completed-section">
        <h3>Completed today</h3>
        <TaskList tasks={completed} emptyText="No tasks completed yet today." />
      </section>
    </>
  );
}
