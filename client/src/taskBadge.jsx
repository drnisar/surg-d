import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { dayQuery } from './dates.js';

const POLL_MS = 30_000;
const TaskBadgeContext = createContext({ count: 0, refresh: () => {} });

// Number of today's newly assigned tasks the signed-in user has not seen; polled while the app is open.
// The day range is recomputed on each poll so the count rolls over at midnight.
export function TaskBadgeProvider({ children }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    api(`/tasks/unseen-count?${dayQuery()}`)
      .then((data) => setCount(data.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const intervalId = setInterval(refresh, POLL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return <TaskBadgeContext.Provider value={{ count, refresh }}>{children}</TaskBadgeContext.Provider>;
}

export const useTaskBadge = () => useContext(TaskBadgeContext);

export function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="notify-badge" aria-label={`${count} new`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
