import { Navigate, Route, Routes } from 'react-router-dom';
import { ROLES } from '@surg-d/shared';
import { useAuth } from './auth.jsx';
import { useSettings } from './settings.jsx';
import ArchivePage from './pages/ArchivePage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import PatientNotesPage from './pages/PatientNotesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RosterPage from './pages/RosterPage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import TodayPage from './pages/TodayPage.jsx';
import WardPage from './pages/WardPage.jsx';

export function SignedOutRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export function SignedInRoutes() {
  const { user } = useAuth();
  const { settings } = useSettings();
  return (
    <Routes>
      <Route path="/" element={<TodayPage />} />
      <Route path="/ward" element={<WardPage />} />
      <Route path="/patients/:mr" element={<PatientNotesPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      {settings.archive.enabled && <Route path="/archive" element={<ArchivePage />} />}
      <Route path="/roster" element={<RosterPage />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      {user.role === ROLES.ADMIN && <Route path="/setup" element={<SetupPage />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
