import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthLayout } from '../../layouts/AuthLayout.jsx';
import { Field } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { authApi } from '../../api/auth.js';
import { resetPasswordSchema } from '../../validations/auth.js';

// Handles both /reset-password (forgot-password flow) and /set-password
// (completing an invite) — both are the same backend action
// (POST /auth/reset-password consuming a single-use token), just different
// copy depending on which link the user actually clicked.
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const location = useLocation();
  const isInvite = location.pathname.startsWith('/set-password');
  const [serverError, setServerError] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async ({ newPassword }) => {
    setServerError(null);
    try {
      await authApi.resetPassword({ token, newPassword });
      navigate('/login', { replace: true, state: { justReset: true } });
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  if (!token) {
    return (
      <AuthLayout key="no-token" title={isInvite ? 'Set your password' : 'Reset your password'}>
        <Alert variant="error">This link is missing its token. Please use the link from your email.</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      key="form"
      title={isInvite ? 'Set your password' : 'Choose a new password'}
      description={isInvite ? "You've been invited to Surprise Real Estate — set a password to activate your account." : undefined}
      footer={<Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">Back to sign in</Link>}
    >
      {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Field
          label="New password"
          type="password"
          placeholder="Enter new password"
          autoComplete="new-password"
          autoFocus
          glass
          hint="At least 12 characters, with uppercase, lowercase, and a number."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Field
          label="Confirm password"
          type="password"
          placeholder="Re-enter new password"
          autoComplete="new-password"
          glass
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          {isInvite ? 'Activate account' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
