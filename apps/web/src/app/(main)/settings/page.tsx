'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Loader2, Mail, Settings, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const profileSchema = z.object({
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
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileData {
  id: number;
  email: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [email, setEmail] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  const firstName = watch('firstName');
  const lastName = watch('lastName');

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiClient.get<ProfileData>('/auth/profile');
      setEmail(data.email);
      reset({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await apiClient.put<ProfileData>('/auth/profile', {
        firstName: data.firstName,
        lastName: data.lastName,
      });
      // Update the navbar immediately
      useAuthStore.getState().setProfileName(data.firstName);
      // Reset form dirty state so the button reflects saved state
      reset(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Failed to update profile. Please try again.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  // Build initials for the avatar
  const initials =
    firstName || lastName
      ? `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}`
      : (email?.[0]?.toUpperCase() ?? '?');

  if (loading) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />
          <span className="ml-3 text-slate-400">Loading profile...</span>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-cyan-500/10 p-2">
          <Settings className="h-6 w-6 text-cyan-400" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="text-sm text-slate-400">Manage your account and profile</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-8 space-y-6"
        aria-label="Update profile">
        {/* Profile Card */}
        <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-700/40 shadow-lg backdrop-blur-sm">
          {/* Card Header with avatar */}
          <div className="border-b border-slate-700/50 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 text-lg font-bold text-white shadow-lg ring-2 ring-cyan-400/20">
                {initials}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-100">Profile</h2>
                <p className="text-sm text-slate-400">Your personal information</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            {/* Email (read-only) */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-400">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Email address
              </label>
              <p className="text-sm text-slate-200">{email}</p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-300">
                  <User className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  First name
                </label>
                <input
                  {...register('firstName')}
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  disabled={saving}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                  className={`block w-full rounded-lg border bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                    errors.firstName
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-slate-600/50 hover:border-slate-500/50 focus:border-cyan-500 focus:ring-cyan-500/30'
                  }`}
                />
                {errors.firstName && (
                  <p
                    id="firstName-error"
                    role="alert"
                    className="mt-1.5 flex items-center gap-1 text-sm text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-300">
                  <User className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  Last name
                </label>
                <input
                  {...register('lastName')}
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  disabled={saving}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                  className={`block w-full rounded-lg border bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                    errors.lastName
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-slate-600/50 hover:border-slate-500/50 focus:border-cyan-500 focus:ring-cyan-500/30'
                  }`}
                />
                {errors.lastName && (
                  <p
                    id="lastName-error"
                    role="alert"
                    className="mt-1.5 flex items-center gap-1 text-sm text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Alerts */}
            {saveError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-red-800/50 bg-red-950/50 p-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
                <p className="text-sm font-medium text-red-200">{saveError}</p>
              </div>
            )}

            {saveSuccess && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-950/50 p-3">
                <Check className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                <p className="text-sm font-medium text-emerald-200">
                  Profile updated successfully.
                </p>
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="flex items-center justify-end border-t border-slate-700/50 bg-slate-800/30 px-6 py-4">
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-cyan-600 hover:to-emerald-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
