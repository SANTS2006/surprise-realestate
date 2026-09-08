import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../layouts/AuthLayout.jsx';
import { Field } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { authApi } from '../../api/auth.js';
import { registerSchema } from '../../validations/auth.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState(null);
  // A tenant's own share link (e.g. /register?ref=ADA-7Q7JW) pre-fills the
  // field — still editable, and still fine if left blank or wrong (see
  // auth.service.js#registerOrganization, a bad code never blocks signup).
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { referralCode: searchParams.get('ref') ?? '' },
  });

  const onSubmit = async (body) => {
    setServerError(null);
    try {
      await authApi.register(body);
      navigate('/check-email', { state: { email: body.email }, replace: true });
    } catch (err) {
      setServerError(err.details?.map((d) => d.message).join(' ') || err.message);
    }
  };

  return (
    <AuthLayout
      title="Register"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Sign in
          </Link>
        </>
      }
    >
      {serverError && <Alert variant="error" className="mb-4">{serverError}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" placeholder="Enter first name" autoComplete="given-name" autoFocus glass error={errors.firstName?.message} {...register('firstName')} />
          <Field label="Last name" placeholder="Enter last name" autoComplete="family-name" glass error={errors.lastName?.message} {...register('lastName')} />
        </div>
        <Field label="Email address" type="email" placeholder="Enter your email" autoComplete="email" glass error={errors.email?.message} {...register('email')} />
        <Field
          label="Password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          glass
          hint="At least 12 characters, with uppercase, lowercase, and a number."
          error={errors.password?.message}
          {...register('password')}
        />
        <Field
          label="Referral code (optional)"
          placeholder="e.g. ADA-7Q7JW"
          glass
          hint="Were you referred by a current tenant? Enter their code here."
          error={errors.referralCode?.message}
          {...register('referralCode')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
