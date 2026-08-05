import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { OnboardingApiKeys } from './components/settings/OnboardingApiKeys.jsx';
import { CreateWorkspaceGate } from './components/workspace/CreateWorkspaceGate.jsx';
import { AccessDeniedGate } from './components/workspace/AccessDeniedGate.jsx';
import { useAuthStore } from './stores/authStore.js';
import { useWorkspaceStore } from './stores/workspaceStore.js';
import { FullPageLoader } from './components/common/FullPageLoader.jsx';

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const AgentsPage = lazy(() => import('./pages/AgentsPage.jsx'));
const LeadsPage = lazy(() => import('./pages/LeadsPage.jsx'));
const TeamPage = lazy(() => import('./pages/TeamPage.jsx'));
const BillingPage = lazy(() => import('./pages/BillingPage.jsx'));
const CreateAgentPage = lazy(() => import('./pages/CreateAgentPage.jsx'));
const AgentDetailsPage = lazy(() => import('./pages/AgentDetailsPage.jsx'));
const EditAgentPage = lazy(() => import('./pages/EditAgentPage.jsx'));
const CustomizeAgentPage = lazy(() => import('./pages/CustomizeAgentPage.jsx'));
const TestAgentPage = lazy(() => import('./pages/TestAgentPage.jsx'));
const PublicAgentPage = lazy(() => import('./pages/PublicAgentPage.jsx'));
const InviteAcceptPage = lazy(() => import('./pages/InviteAcceptPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const SignupPage = lazy(() => import('./pages/SignupPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'));
const RegisterAdminPage = lazy(() => import('./pages/RegisterAdminPage.jsx'));

function ProtectedLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const wsLoaded = useWorkspaceStore((s) => s.loaded);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const loadWorkspaces = useWorkspaceStore((s) => s.load);
  const location = useLocation();

  // Resolve the user's workspaces before rendering, so every request carries a
  // valid x-workspace-id header (data is scoped by it).
  useEffect(() => {
    if (status === 'authed' && !wsLoaded) loadWorkspaces();
  }, [status, wsLoaded, loadWorkspaces]);

  if (status === 'loading' || status === 'idle') return <FullPageLoader />;
  if (status === 'anon') return <Navigate to="/login" state={{ from: location }} replace />;
  if (!wsLoaded) return <FullPageLoader />;

  const isAdmin = user?.plan === 'admin';
  // Invited into someone else's workspace = a workspace where you're not the owner.
  const isInvited = workspaces.some((w) => w.role !== 'owner');
  // A fresh admin must create their (single) workspace before the app unlocks.
  if (isAdmin && workspaces.length === 0) return <CreateWorkspaceGate />;
  // A plain user who isn't an admin and hasn't been invited can't use this paid app.
  if (!isAdmin && !isInvited) return <AccessDeniedGate />;
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
      <OnboardingApiKeys />
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
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Clear workspace state whenever we become signed-out, so the next sign-in
  // (possibly a different account) re-resolves its own workspaces.
  useEffect(() => {
    if (status === 'anon') useWorkspaceStore.getState().reset();
  }, [status]);

  useEffect(() => {
    const onExpired = () => {
      useAuthStore.getState().logout();
      useWorkspaceStore.getState().reset();
      navigate('/login');
    };
    // Active workspace vanished (removed/deleted) — fall back to the personal one.
    const onWorkspaceInvalid = () => {
      const ws = useWorkspaceStore.getState();
      ws.reset();
      ws.load();
      navigate('/dashboard');
    };
    window.addEventListener('ringwebai:session-expired', onExpired);
    window.addEventListener('ringwebai:workspace-invalid', onWorkspaceInvalid);
    return () => {
      window.removeEventListener('ringwebai:session-expired', onExpired);
      window.removeEventListener('ringwebai:workspace-invalid', onWorkspaceInvalid);
    };
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
          <Route
            path="/register-admin"
            element={
              <PublicOnly>
                <RegisterAdminPage />
              </PublicOnly>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnly>
                <ForgotPasswordPage />
              </PublicOnly>
            }
          />
          {/* Password reset — standalone so a reset link opens regardless of
              whatever stale session might still be in local storage. */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Public, unauthenticated shareable agent page */}
          <Route path="/a/:publicId" element={<PublicAgentPage />} />

          {/* Team invitation landing (works signed-in or out) */}
          <Route path="/invite/:token" element={<InviteAcceptPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/billing" element={<BillingPage />} />
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
