import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function Spinner({ size = 20, className, label = 'Loading…' }) {
  return (
    <span role="status" className={clsx('inline-flex items-center gap-2 text-slate-500 dark:text-slate-400', className)}>
      <Loader2 size={size} className="animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

// Full-region loading state — used for a page/section that's fetching its
// primary data, distinct from a button's inline spinner.
export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-400">
      <Loader2 size={28} className="animate-spin" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
