'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth, useAuthLoading, useCurrentUser } from '@/hooks/useAuth';

const signupSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name must be 100 characters or fewer')
      .transform((v) => v.trim()),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name must be 100 characters or fewer')
      .transform((v) => v.trim()),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const user = useCurrentUser();
  const authLoading = useAuthLoading();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Already authenticated — send to dashboard (after all hooks)
  if (!authLoading && user) {
    router.replace('/dashboard');
    return null;
  }

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Sign up with Firebase
      // AuthContext handles syncing the user with the backend API
      await signUp(data.email, data.password, data.firstName, data.lastName);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign up failed. Please try again.';
      setSubmitError(errorMessage);
      setFocus('email');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">Langafy</h1>
          <p className="mt-2 text-base text-slate-400">Create your account to start learning</p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
          aria-label="Sign up">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 shadow-lg">
            {/* Name Fields Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* First Name Field */}
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-200">
                  First name
                </label>
                <input
                  {...register('firstName')}
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="John"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                  className={`block w-full rounded-md border bg-slate-700 px-4 py-2 text-white placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                    errors.firstName
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.firstName && (
                  <p
                    id="firstName-error"
                    role="alert"
                    className="flex items-center gap-1 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              {/* Last Name Field */}
              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-200">
                  Last name
                </label>
                <input
                  {...register('lastName')}
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Doe"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                  className={`block w-full rounded-md border bg-slate-700 px-4 py-2 text-white placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                    errors.lastName
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {errors.lastName && (
                  <p
                    id="lastName-error"
                    role="alert"
                    className="flex items-center gap-1 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                Email address
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`block w-full rounded-md border bg-slate-700 px-4 py-2 text-white placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`block w-full rounded-md border bg-slate-700 px-4 py-2 text-white placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.password
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200">
                Confirm password
              </label>
              <input
                {...register('confirmPassword')}
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={isSubmitting}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                className={`block w-full rounded-md border bg-slate-700 px-4 py-2 text-white placeholder-slate-500 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.confirmPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.confirmPassword && (
                <p
                  id="confirm-password-error"
                  role="alert"
                  className="flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Error Alert */}
            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-md border border-red-800 bg-red-950 p-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-red-200">{submitError}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating account...
                </span>
              ) : (
                'Sign up'
              )}
            </button>
          </div>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-blue-400 transition-colors hover:text-blue-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
