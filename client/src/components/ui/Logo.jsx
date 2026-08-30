import { useState } from 'react';
import { Building2 } from 'lucide-react';
import clsx from 'clsx';

// Renders /public/logo.png (the Surprise Solution Group mark) at any size,
// falling back to the Building2 icon badge if the file isn't there yet or
// fails to load — so the app never shows a broken-image icon and upgrades
// automatically the moment the real asset is added, no code change needed.
export function Logo({ size = 36, className }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={clsx('flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-600 text-white', className)}
        style={{ width: size, height: size }}
      >
        <Building2 size={Math.round(size * 0.55)} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="Surprise Real Estate"
      width={size}
      height={size}
      className={clsx('shrink-0 rounded-lg object-contain', className)}
      onError={() => setErrored(true)}
    />
  );
}
