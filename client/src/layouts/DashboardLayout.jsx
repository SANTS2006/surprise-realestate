import { useState } from 'react';
import { Outlet, useLocation, matchPath } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Topbar } from '../components/layout/Topbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PAGE_TITLES } from '../config/pageTitles.js';

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const pageTitle = PAGE_TITLES.find((p) => matchPath(p.path, location.pathname))?.title;
  useDocumentTitle(pageTitle);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-brand-50/50 to-accent-50/40 dark:from-slate-950 dark:via-brand-950/50 dark:to-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main id="main-content" tabIndex={-1} className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
