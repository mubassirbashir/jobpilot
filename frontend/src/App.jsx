import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store.js';
import Sidebar from './components/Sidebar.jsx';
import { NotificationStack, Spinner } from './components/UI.jsx';

// Pages
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AgentPage from './pages/AgentPage.jsx';
import JobsPage from './pages/JobsPage.jsx';
import LinkedInPage from './pages/LinkedInPage.jsx';
import CVPage from './pages/CVPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import InterviewPage from './pages/InterviewPage.jsx';

function PrivateLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-60 flex-1 p-8 relative z-10 min-h-screen">
        <Routes>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/agent"        element={<AgentPage />} />
          <Route path="/jobs"         element={<JobsPage />} />
          <Route path="/applications" element={<JobsPage filter="applied" />} />
          <Route path="/matches"      element={<JobsPage filter="discovered" />} />
          <Route path="/linkedin"     element={<LinkedInPage />} />
          <Route path="/cv"           element={<CVPage />} />
          <Route path="/cover-letters" element={<CVPage tab="covers" />} />
          <Route path="/interview"    element={<InterviewPage />} />
          <Route path="/analytics"    element={<Dashboard tab="analytics" />} />
          <Route path="/settings"     element={<SettingsPage />} />
          <Route path="*"             element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AuthGuard() {
  const { user, token, authLoading, loadUser } = useStore();

  useEffect(() => { if (token && !user) loadUser(); }, [token]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl">🚀</div>
          <Spinner size="lg" />
          <div className="text-muted text-sm">Loading JobPilot AI…</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login"    element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <Login register /> : <Navigate to="/dashboard" replace />} />
      <Route path="/*"        element={user  ? <PrivateLayout /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  const { notifications } = useStore();
  return (
    <BrowserRouter>
      <AuthGuard />
      <NotificationStack notifications={notifications} />
    </BrowserRouter>
  );
}
