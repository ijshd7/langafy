'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient, ApiError } from '@/lib/api';

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
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

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
      setSaveSuccess(true);
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Failed to update profile. Please try again.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />
          <span className="ml-2 text-slate-400">Loading profile...</span>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
      <p className="mt-1 text-sm text-slate-400">Manage your profile information</p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-8 space-y-6"
        aria-label="Update profile">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-100">Profile</h2>

          {/* Email (read-only) */}
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-slate-400">Email address</label>
            <p className="text-sm text-slate-300">{email}</p>
          </div>

          {/* Name Fields */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-200">
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

            {/* Last Name */}
            <div className="space-y-2">
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-200">
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

          {/* Error Alert */}
          {saveError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-md border border-red-800 bg-red-950 p-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
              <p className="text-sm font-medium text-red-200">{saveError}</p>
            </div>
          )}

          {/* Success Alert */}
          {saveSuccess && (
            <div
              role="status"
              className="mt-4 flex items-center gap-2 rounded-md border border-green-800 bg-green-950 p-3">
              <Check className="h-5 w-5 text-green-400" aria-hidden="true" />
              <p className="text-sm font-medium text-green-200">Profile updated successfully.</p>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </span>
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
