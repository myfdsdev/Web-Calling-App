import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { useAuthStore } from './stores/authStore.js';
import { FullPageLoader } from './components/common/FullPageLoader.jsx';

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const AgentsPage = lazy(() => import('./pages/AgentsPage.jsx'));
const LeadsPage = lazy(() => import('./pages/LeadsPage.jsx'));
const CreateAgentPage = lazy(() => import('./pages/CreateAgentPage.jsx'));
const AgentDetailsPage = lazy(() => import('./pages/AgentDetailsPage.jsx'));
const EditAgentPage = lazy(() => import('./pages/EditAgentPage.jsx'));
const CustomizeAgentPage = lazy(() => import('./pages/CustomizeAgentPage.jsx'));
const TestAgentPage = lazy(() => import('./pages/TestAgentPage.jsx'));
const PublicAgentPage = lazy(() => import('./pages/PublicAgentPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const SignupPage = lazy(() => import('./pages/SignupPage.jsx'));

function ProtectedLayout() {
  const { status } = useAuthStore();
  const location = useLocation();
  if (status === 'loading' || status === 'idle') return <FullPageLoader />;
  if (status === 'anon') return <Navigate to="/login" state={{ from: location }} replace />;
  return (
    <div className="min-h-full">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <main>
          <Suspense fallback={<FullPageLoader inline />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function PublicOnly({ children }) {
  const { status } = useAuthStore();
  if (status === 'loading' || status === 'idle') return <FullPageLoader />;
  if (status === 'authed') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { hydrate, hydrated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onExpired = () => {
      useAuthStore.getState().logout();
      navigate('/login');
    };
    window.addEventListener('vox:session-expired', onExpired);
    return () => window.removeEventListener('vox:session-expired', onExpired);
  }, [navigate]);

  if (!hydrated) return <FullPageLoader />;

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnly>
                <SignupPage />
              </PublicOnly>
            }
          />

          {/* Public, unauthenticated shareable agent page */}
          <Route path="/a/:publicId" element={<PublicAgentPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/agents/create" element={<CreateAgentPage />} />
            <Route path="/agents/:agentId" element={<AgentDetailsPage />} />
            <Route path="/agents/:agentId/edit" element={<EditAgentPage />} />
            <Route path="/agents/:agentId/customize" element={<CustomizeAgentPage />} />
            <Route path="/agents/:agentId/test" element={<TestAgentPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
