import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

// The bare, org-less "/" — every real destination in this app now belongs
// to a specific tenant (/:orgSlug/login) or the platform console
// (/platform-admin/login); this exists only so a cold visit, a bookmark to
// the root, or an expired session with no remembered org (see
// ProtectedRoute.jsx) has somewhere sane to land instead of a 404.
export default function LandingPage() {
  useDocumentTitle('NTS Real Estate System');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center dark:bg-slate-950">
      <Logo size={64} />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">NTS Real Estate System</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Sign in using your organization's own link, or manage tenant organizations from the platform console.
        </p>
      </div>
      <Link
        to="/platform-admin/login"
        className="flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
      >
        <ShieldCheck size={16} aria-hidden="true" />
        Platform admin console
      </Link>
    </div>
  );
}
