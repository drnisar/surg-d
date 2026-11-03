import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, Moon, Settings, Sun, X } from 'lucide-react';
import { ROLE_LABELS, ROLES } from '@surg-d/shared';
import { useSettings } from '../settings.jsx';
import { useTheme } from '../theme.js';
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

// Inline from `md` up; on phones a single bar with a menu button that opens the links below it.
export default function Navbar({ user, taskCount, onLogout }) {
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const links = LINKS.filter(([to]) => to !== '/archive' || settings.archive.enabled);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const navLinks = (extra) => (
    <>
      {links.map(([to, label]) => (
        <NavLink key={to} to={to} end={to === '/'} className={(s) => cn(linkClass(s), extra)}>
          {label}
          {to === '/tasks' && <Badge count={taskCount} />}
        </NavLink>
      ))}
      {user.role === ROLES.ADMIN && (
        <NavLink to="/setup" className={(s) => cn(linkClass(s), extra)}>
          <Settings className="size-4" />
          Setup
        </NavLink>
      )}
    </>
  );

  const account = (extra) => (
    <>
      <NavLink
        to="/profile"
        className={(s) => cn(linkClass(s), extra)}
        title={taskCount ? `${taskCount} new task(s)` : 'My profile'}
      >
        {user.fullName} · {ROLE_LABELS[user.role]}
        <Badge count={taskCount} />
      </NavLink>
      <Button variant="outline" size="sm" onClick={onLogout}>
        <LogOut />
        Log out
      </Button>
    </>
  );

  const themeButton = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      onClick={toggle}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );

  return (
    <header className="border-b bg-background px-4 py-3 print:hidden">
      <div className="flex items-center gap-x-4 gap-y-2 md:flex-wrap">
        <strong className="font-semibold">Surgical D Ward</strong>
        <nav className="hidden flex-wrap gap-1 md:flex">{navLinks()}</nav>
        <span className="flex-1" />
        <div className="hidden items-center gap-4 md:flex">{account()}</div>
        {themeButton}

        {taskCount > 0 && (
          <Link to="/tasks" className="no-underline md:hidden" aria-label={`${taskCount} new task(s)`}>
            <Badge count={taskCount} />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open && (
        <div id="mobile-menu" className="mt-3 grid gap-1 border-t pt-3 md:hidden">
          <nav className="grid gap-1">{navLinks('w-full py-2')}</nav>
          <div className="mt-2 grid gap-2 border-t pt-3">{account('w-full py-2')}</div>
        </div>
      )}
    </header>
  );
}
