import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, getLastOrgSlug } from '../../contexts/AuthContext.jsx';
import { LoadingState } from '../ui/Spinner.jsx';

// UX-only gate: it decides whether to *render* a route, never whether an
// action is *allowed* — every request it triggers is still independently
// authorized server-side (see navigation.js's identical caveat).
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // The dashboard routes carry no org slug of their own (the session
    // already knows the organization) — fall back to whichever tenant's
    // login this browser last used, or the neutral landing page if none
    // is remembered (e.g. a fresh browser, or storage disabled).
    const lastOrgSlug = getLastOrgSlug();
    return <Navigate to={lastOrgSlug ? `/${lastOrgSlug}/login` : '/'} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
