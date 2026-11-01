import { useAuth } from './auth.jsx';
import { SignedInRoutes, SignedOutRoutes } from './AppRoutes.jsx';
import Layout from './Layout.jsx';
import { SettingsProvider } from './settings.jsx';
import { TaskBadgeProvider } from './taskBadge.jsx';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="page">Loading…</p>;
  if (!user) return <SignedOutRoutes />;
  // Keyed by user so switching user remounts every page with fresh state.
  return (
    <SettingsProvider key={user.id}>
      <TaskBadgeProvider>
        <Layout>
          <SignedInRoutes />
        </Layout>
      </TaskBadgeProvider>
    </SettingsProvider>
  );
}
