import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck, LogOut, LayoutDashboard, Building2, Users, UserCog } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../components/ui/Button.jsx';
import { ThemeToggle } from '../components/ui/ThemeToggle.jsx';
import { usePlatformAdmin } from '../contexts/PlatformAdminContext.jsx';
import { useBranding } from '../contexts/BrandingContext.jsx';

const NAV = [
  { to: '/platform-admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/platform-admin/organizations', label: 'Organizations', icon: Building2 },
  { to: '/platform-admin/administrators', label: 'Administrators', icon: Users },
  { to: '/platform-admin/account', label: 'My account', icon: UserCog },
];

// Shell for every signed-in platform admin page: header, section tabs, and
// the page itself. Pins the platform identity so a tenant's branding can
// never show through while it is mounted.
export default function PlatformAdminLayout() {
  const { enterPlatformMode, leavePlatformMode } = useBranding();
  useEffect(() => {
    enterPlatformMode();
    return leavePlatformMode;
  }, [enterPlatformMode, leavePlatformMode]);
  const { admin, logout } = usePlatformAdmin();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-600 text-white">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">NTS Real Estate System</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Platform Admin</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">{admin?.email}</span>
          <ThemeToggle />
          <Button variant="secondary" size="sm" onClick={logout} className="whitespace-nowrap">
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>

      <nav aria-label="Platform admin sections" className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="shrink-0">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => clsx(
                  'flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
