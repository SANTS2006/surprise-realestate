import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../layouts/AuthLayout.jsx';
import { Field } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { authApi } from '../../api/auth.js';
import { registerSchema } from '../../validations/auth.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(registerSchema) });

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
      title="Create your organization"
      description="Set up Surprise Real Estate for your property management company. You'll be the first administrator."
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" placeholder="Ada" autoComplete="given-name" autoFocus glass error={errors.firstName?.message} {...register('firstName')} />
          <Field label="Last name" placeholder="Lovelace" autoComplete="family-name" glass error={errors.lastName?.message} {...register('lastName')} />
        </div>
        <Field label="Email address" type="email" placeholder="you@example.com" autoComplete="email" glass error={errors.email?.message} {...register('email')} />
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
        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
