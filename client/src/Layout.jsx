import { ROLE_LABELS } from '@surg-d/shared';
import { useAuth } from './auth.jsx';
import { useTaskBadge } from './taskBadge.jsx';
import Navbar from './components/Navbar.jsx';

// Signed-in page frame: impersonation banner, navbar and the page itself.
export default function Layout({ children }) {
  const { user, logout, stopImpersonating } = useAuth();
  const { count } = useTaskBadge();
  return (
    <>
      {user.impersonatedBy && (
        <div className="impersonation-banner" role="status">
          Testing as <strong>{user.fullName}</strong> ({ROLE_LABELS[user.role]}). Signed in as{' '}
          {user.impersonatedBy.fullName ?? 'admin'}.
          <button className="btn" onClick={stopImpersonating}>
            Return to admin
          </button>
        </div>
      )}
      <Navbar user={user} taskCount={count} onLogout={logout} />
      <main className="page">{children}</main>
    </>
  );
}
