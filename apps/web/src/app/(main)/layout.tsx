'use client';

import { BookOpen, LogOut, MessageCircle, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useCurrentUser, useAuth, useAuthLoading } from '@/hooks/useAuth';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/vocabulary', label: 'Vocabulary', icon: BookOpen },
  { href: '/practice/conversation', label: 'Practice', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const authLoading = useAuthLoading();
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Redirect unauthenticated users to login
  if (!authLoading && !user) {
    router.replace('/login');
    return null;
  }

  // Show nothing while Firebase resolves auth state
  if (authLoading) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-slate-100 transition-colors hover:text-cyan-400">
            Langafy
          </Link>

          {/* Nav links — hidden on small screens */}
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User + sign out */}
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-slate-400 sm:inline">
                {user.displayName || user.email?.split('@')[0]}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
              aria-label="Sign out">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
