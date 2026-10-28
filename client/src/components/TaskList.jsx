import { formatDateTime } from '../dates.js';

// Tasks with who assigned them and, once done, who completed them.
// `onComplete(task)` shows a "Mark complete" button on open tasks; `highlightId` marks that person's new tasks.
export default function TaskList({ tasks, onComplete, showBed = true, highlightId, emptyText = 'No tasks.' }) {
  if (!tasks.length) return <p className="muted">{emptyText}</p>;

  return (
    <ul className="task-list">
      {tasks.map((t) => {
        const isNew = highlightId && t.assignedTo.id === highlightId && !t.seen && t.status === 'open';
        return (
          <li key={t.id} className={`task ${t.status} ${isNew ? 'new' : ''}`}>
            <div className="task-body">
              <div className="task-title">
                {showBed && <span className="bed-tag">{t.bedCode}</span>}
                <span className="task-desc">{t.description}</span>
                {isNew && <span className="new-tag">New</span>}
              </div>
              <div className="muted small">
                Assigned to <strong>{t.assignedTo.fullName}</strong>
                {t.assignedBy && <> by {t.assignedBy.fullName}</>} · {formatDateTime(t.createdAt)}
              </div>
              {t.status === 'completed' && (
                <div className="done small">
                  ✓ Completed by <strong>{t.completedBy?.fullName ?? 'unknown'}</strong> · {formatDateTime(t.completedAt)}
                </div>
              )}
            </div>
            {t.status === 'open' && onComplete && (
              <button className="btn ghost" onClick={() => onComplete(t)}>
                Mark complete
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
