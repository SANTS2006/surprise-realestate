import { Building2, ShieldCheck, TrendingUp } from 'lucide-react';
import { Logo } from '../components/ui/Logo.jsx';
import { ThemeToggle } from '../components/ui/ThemeToggle.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const HIGHLIGHTS = [
  { icon: Building2, text: 'Manage properties, leases & tenants in one place' },
  { icon: TrendingUp, text: 'Real-time financial and occupancy insights' },
  { icon: ShieldCheck, text: 'Bank-grade security with role-based access' },
];

// Shared shell for every unauthenticated screen (login, register, verify
// email, forgot/reset password) — a modern, minimal split layout: a branded
// panel on large screens, a soft gradient backdrop behind a glass form card
// on every screen size. `key` on the root (passed by each page via the
// route) restarts the entrance animation on every navigation between auth
// screens, which is what reads as a transition between them.
export function AuthLayout({ title, description, children, footer }) {
  useDocumentTitle(title);

  return (
    <div className="custom-scrollbar flex h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-brand-50/40 to-accent-50/30 dark:from-slate-950 dark:via-brand-950/40 dark:to-slate-900">
      {/* Brand panel — desktop only */}
      <div className="relative hidden w-[42%] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-accent-700 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent-400 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-brand-300 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <Logo size={44} />
          <div>
            <p className="text-lg font-semibold leading-none">Surprise Real Estate</p>
            <p className="mt-1 text-sm text-white/70">Property Management System</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight">
            Run your entire portfolio from one command center.
          </h2>
          <div className="mt-8 flex flex-col gap-4">
            {HIGHLIGHTS.map((h) => (
              <div key={h.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                  <h.icon size={18} aria-hidden="true" />
                </span>
                <p className="text-sm text-white/85">{h.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Surprise Solution Group. All rights reserved.</p>
      </div>

      {/* Form panel — decorative blurred blobs echo the brand panel, kept
          subtle so the gradient reads as background, not noise. */}
      <div className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30 dark:opacity-20">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-300 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-300 blur-3xl" />
        </div>

        <header className="relative flex items-center justify-end px-6 py-5">
          <ThemeToggle />
        </header>

        <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="animate-auth-in w-full max-w-md">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-brand-900/5 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60 dark:shadow-black/20 sm:p-8">
              <div className="mb-6 flex justify-center">
                <Logo size={72} />
              </div>
              <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
              {description && <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">{description}</p>}
              <div className="mt-6">{children}</div>
              {footer && <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
