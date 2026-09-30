import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Field } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.jsx';
import { usePlatformAdmin } from '../../contexts/PlatformAdminContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function PlatformAdminLoginPage() {
  useDocumentTitle('Platform Admin');
  const { login } = usePlatformAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const redirectTo = location.state?.from ?? '/platform-admin';

  const onSubmit = async (body) => {
    setServerError(null);
    try {
      await login(body.email, body.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-brand-50/40 to-accent-50/30 dark:from-slate-950 dark:via-brand-950/40 dark:to-slate-900">
      <header className="flex items-center justify-end px-6 py-5">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 text-white">
                <ShieldCheck size={26} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Platform Admin</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">NTS Real Estate System</p>
              </div>
            </div>
            {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <Field
                label="Email address"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                autoFocus
                glass
                error={errors.email?.message}
                {...register('email')}
              />
              <Field
                label="Password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                glass
                error={errors.password?.message}
                {...register('password')}
              />
              <Button type="submit" loading={isSubmitting} className="w-full mt-2">
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
