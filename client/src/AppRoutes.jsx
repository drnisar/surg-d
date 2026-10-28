import { Navigate, Route, Routes } from 'react-router-dom';
import ArchivePage from './pages/ArchivePage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RosterPage from './pages/RosterPage.jsx';
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
  return (
    <Routes>
      <Route path="/" element={<TodayPage />} />
      <Route path="/ward" element={<WardPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/archive" element={<ArchivePage />} />
      <Route path="/roster" element={<RosterPage />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
