import { Link } from 'react-router-dom';

// "N undone tasks from earlier days" with a link to the Archive, optionally filtered ({ patient } or { bed }).
export default function ArchiveNotice({ count, mine = 0, filter = {} }) {
  if (!count) return null;
  const query = new URLSearchParams(filter).toString();

  return (
    <p className="archive-notice">
      {count} undone {count === 1 ? 'task' : 'tasks'} from earlier days
      {mine > 0 && <> ({mine} assigned to you)</>}.{' '}
      <Link to={`/archive${query ? `?${query}` : ''}`}>Open archive →</Link>
    </p>
  );
}
