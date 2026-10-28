import { NavLink } from 'react-router-dom';
import { ROLE_LABELS } from '@surg-d/shared';
import { Badge } from '../taskBadge.jsx';

export default function Navbar({ user, taskCount, onLogout }) {
  return (
    <header className="topbar">
      <strong>Surgical D Ward</strong>
      <nav className="nav">
        <NavLink to="/" end>
          Today
        </NavLink>
        <NavLink to="/ward">Ward</NavLink>
        <NavLink to="/tasks" className="with-badge">
          My tasks
          <Badge count={taskCount} />
        </NavLink>
        <NavLink to="/archive">Archive</NavLink>
        <NavLink to="/roster">Duty roster</NavLink>
        <NavLink to="/employees">Staff</NavLink>
      </nav>
      <span className="spacer" />
      <NavLink to="/profile" className="profile with-badge" title={taskCount ? `${taskCount} new task(s)` : 'My profile'}>
        {user.fullName} · {ROLE_LABELS[user.role]}
        <Badge count={taskCount} />
      </NavLink>
      <button className="btn ghost" onClick={onLogout}>
        Log out
      </button>
    </header>
  );
}
