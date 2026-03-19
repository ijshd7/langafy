'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth, useAuthLoading, useCurrentUser } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const user = useCurrentUser();
  const authLoading = useAuthLoading();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Already authenticated — send to dashboard (after all hooks)
  if (!authLoading && user) {
    router.replace('/dashboard');
    return null;
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Sign in with Firebase
      // AuthContext handles syncing the user with the backend API
      await signIn(data.email, data.password);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed. Please try again.';
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
          <p className="mt-2 text-base text-slate-400">
            Learn languages through conversation and games
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
          aria-label="Sign in">
          <div className="space-y-5 overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-700/40 p-8 shadow-lg backdrop-blur-sm">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
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
                className={`block w-full rounded-lg border bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.email
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-slate-600/50 hover:border-slate-500/50 focus:border-cyan-500 focus:ring-cyan-500/30'
                }`}
              />
              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`block w-full rounded-lg border bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.password
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-slate-600/50 hover:border-slate-500/50 focus:border-cyan-500 focus:ring-cyan-500/30'
                }`}
              />
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="flex items-center gap-1 text-sm text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Error Alert */}
            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-red-800/50 bg-red-950/50 p-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" aria-hidden="true" />
                <p className="text-sm font-medium text-red-200">{submitError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-cyan-600 hover:to-emerald-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-40">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        {/* Signup Link */}
        <p className="text-center text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-medium text-cyan-400 transition-colors hover:text-cyan-300">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
