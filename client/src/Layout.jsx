import { ROLE_LABELS } from '@surg-d/shared';
import { useAuth } from './auth.jsx';
import { useTaskBadge } from './taskBadge.jsx';
import Navbar from './components/Navbar.jsx';
import { Button } from '@/components/ui/button';

// Signed-in page frame: impersonation banner, navbar and the page itself.
export default function Layout({ children }) {
  const { user, logout, stopImpersonating } = useAuth();
  const { count } = useTaskBadge();
  return (
    <>
      {user.impersonatedBy && (
        <div
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 print:hidden"
          role="status"
        >
          <span>
            Testing as <strong>{user.fullName}</strong> ({ROLE_LABELS[user.role]}). Signed in as{' '}
            {user.impersonatedBy.fullName ?? 'admin'}.
          </span>
          <Button size="sm" className="bg-amber-900 text-white hover:bg-amber-900/90" onClick={stopImpersonating}>
            Return to admin
          </Button>
        </div>
      )}
      <Navbar user={user} taskCount={count} onLogout={logout} />
      <main className="page">{children}</main>
    </>
  );
}
