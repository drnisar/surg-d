import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { ROLE_LABELS } from '@surg-d/shared';
import { useAuth } from './auth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import RosterPage from './pages/RosterPage.jsx';
import TodayPage from './pages/TodayPage.jsx';

function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <strong>Surgical D Ward</strong>
        <nav className="nav">
          <NavLink to="/" end>
            Today
          </NavLink>
          <NavLink to="/roster">Duty roster</NavLink>
          <NavLink to="/employees">Staff</NavLink>
        </nav>
        <span className="spacer" />
        <span className="muted">
          {user.fullName} · {ROLE_LABELS[user.role]}
        </span>
        <button className="btn ghost" onClick={logout}>
          Log out
        </button>
      </header>
      <main className="container">{children}</main>
    </>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="container">Loading…</p>;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/roster" element={<RosterPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
