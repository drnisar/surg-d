import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LOCATIONS, ROSTER_ELIGIBLE_ROLES, SHIFTS } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useTaskBadge } from '../taskBadge.jsx';
import DayToolbar from '../components/DayToolbar.jsx';
import MyDutiesList from '../components/MyDutiesList.jsx';
import ShiftDutyCards from '../components/ShiftDutyCards.jsx';
import TaskList from '../components/TaskList.jsx';
import { dayQuery, today } from '../dates.js';

const MY_DUTY_DAYS = 14;

export default function TodayPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(today);
  const [assignments, setAssignments] = useState(null);
  const [myUpcoming, setMyUpcoming] = useState(null);
  const [tasks, setTasks] = useState(null); // today's open tasks: { mine, ward }
  const { refresh: refreshBadge } = useTaskBadge();
  const [error, setError] = useState('');
  const rostered = ROSTER_ELIGIBLE_ROLES.includes(user.role);
  const todayDate = today();

  useEffect(() => {
    let current = true;
    setAssignments(null);
    api(`/roster/day?date=${date}`)
      .then((data) => current && (setAssignments(data.assignments), setError('')))
      .catch((err) => current && setError(err.message));
    return () => {
      current = false;
    };
  }, [date]);

  // Upcoming duties are counted from today, so browsing other days doesn't move the list.
  useEffect(() => {
    if (!rostered) return;
    api(`/roster/mine?from=${todayDate}&days=${MY_DUTY_DAYS}`)
      .then((data) => setMyUpcoming(data.assignments))
      .catch((err) => setError(err.message));
  }, [rostered, todayDate]);

  // Tasks are always today's, whichever day the duty cards show. Visiting here doesn't mark them seen.
  const loadTasks = useCallback(async () => {
    const todayOnly = dayQuery();
    try {
      const [mine, ward] = await Promise.all([api(`/tasks?scope=mine&${todayOnly}`), api(`/tasks?${todayOnly}`)]);
      setTasks({ mine, ward });
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const complete = async (task) => {
    try {
      await api(`/tasks/${task.id}/complete`, { method: 'POST' });
    } catch (err) {
      setError(err.message);
    }
    loadTasks();
    refreshBadge();
  };

  const myDuties = (assignments ?? []).filter((a) => a.employee.id === user.id);

  return (
    <>
      <DayToolbar date={date} onChange={setDate} />

      {error && <p className="error">{error}</p>}

      {myDuties.length > 0 && (
        <p className="my-duty">
          You are on duty:{' '}
          {myDuties
            .map((a) => `${SHIFTS.find((s) => s.key === a.shift).label} — ${LOCATIONS.find((l) => l.key === a.location).name}`)
            .join(', ')}
        </p>
      )}

      {myUpcoming && (
        <MyDutiesList
          duties={myUpcoming}
          days={MY_DUTY_DAYS}
          selectedDate={date}
          todayDate={todayDate}
          onSelectDate={setDate}
        />
      )}

      {assignments === null && !error ? (
        <p className="muted">Loading…</p>
      ) : (
        <ShiftDutyCards assignments={assignments ?? []} highlightId={user.id} />
      )}

      {tasks && (
        <div className="task-columns mt-4">
          <section className="card">
            <h3>
              Assigned to me today <span className="count">{tasks.mine.length}</span>
            </h3>
            <TaskList tasks={tasks.mine} onComplete={complete} highlightId={user.id} emptyText="Nothing assigned to you today." />
          </section>
          <section className="card">
            <h3>
              Whole ward today <span className="count">{tasks.ward.length}</span>
            </h3>
            <TaskList tasks={tasks.ward} onComplete={complete} highlightId={user.id} emptyText="No open tasks on the ward today." />
          </section>
        </div>
      )}

      <p className="muted small footer-link">
        <Link to="/roster">Open the full duty roster →</Link> · <Link to="/tasks">Open My tasks →</Link>
      </p>
    </>
  );
}
