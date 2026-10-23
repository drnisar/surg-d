import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LOCATIONS, SHIFTS } from '@surg-d/shared';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import DayToolbar from '../components/DayToolbar.jsx';
import ShiftDutyCards from '../components/ShiftDutyCards.jsx';
import { today } from '../dates.js';

export default function TodayPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(today);
  const [assignments, setAssignments] = useState(null);
  const [error, setError] = useState('');

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

      {assignments === null && !error ? (
        <p className="muted">Loading…</p>
      ) : (
        <ShiftDutyCards assignments={assignments ?? []} highlightId={user.id} />
      )}

      <p className="muted small footer-link">
        <Link to="/roster">Open the full duty roster →</Link>
      </p>
    </>
  );
}
