import { NavLink } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { ROLE_LABELS, ROLES } from '@surg-d/shared';
import { useSettings } from '../settings.jsx';
import { Badge } from '../taskBadge.jsx';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const linkClass = ({ isActive }) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-foreground',
    isActive && 'bg-accent font-medium text-foreground'
  );

const LINKS = [
  ['/', 'Today'],
  ['/ward', 'Ward'],
  ['/tasks', 'My tasks'],
  ['/archive', 'Archive'],
  ['/roster', 'Duty roster'],
  ['/employees', 'Staff'],
];

export default function Navbar({ user, taskCount, onLogout }) {
  const { settings } = useSettings();
  const links = LINKS.filter(([to]) => to !== '/archive' || settings.archive.enabled);
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background px-4 py-3 print:hidden">
      <strong className="font-semibold">Surgical D Ward</strong>
      <nav className="flex flex-wrap gap-1">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
            {label}
            {to === '/tasks' && <Badge count={taskCount} />}
          </NavLink>
        ))}
        {user.role === ROLES.ADMIN && (
          <NavLink to="/setup" className={linkClass}>
            <Settings className="size-4" />
            Setup
          </NavLink>
        )}
      </nav>
      <span className="flex-1" />
      <NavLink to="/profile" className={linkClass} title={taskCount ? `${taskCount} new task(s)` : 'My profile'}>
        {user.fullName} · {ROLE_LABELS[user.role]}
        <Badge count={taskCount} />
      </NavLink>
      <Button variant="outline" size="sm" onClick={onLogout}>
        <LogOut />
        Log out
      </Button>
    </header>
  );
}
