import { NextRequest, NextResponse } from 'next/server';

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = ['/dashboard', '/levels', '/lessons', '/vocabulary', '/practice'];

/**
 * Auth routes that should redirect to dashboard if already authenticated
 */
const AUTH_ROUTES = ['/login', '/signup'];

/**
 * Middleware to enforce authentication on protected routes
 *
 * - Redirects unauthenticated users to /login when accessing protected routes
 * - Redirects authenticated users away from /login and /signup to /dashboard
 *
 * Note: We check for Firebase auth cookie which is set by browserLocalPersistence
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if user is authenticated by looking for Firebase auth token
  // Firebase stores auth state in a cookie when using browserLocalPersistence
  const hasAuthCookie =
    request.cookies.has('__Secure-firebase-auth-token') ||
    request.cookies.has('firebase-auth-token') ||
    request.cookies.has('auth-token');

  // Check if this is a protected route
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  // Check if this is an auth route
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // If trying to access protected route without auth, redirect to login
  if (isProtectedRoute && !hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If trying to access auth route while authenticated, redirect to dashboard
  if (isAuthRoute && hasAuthCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 * We exclude static assets, API routes, and other non-page routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)',
  ],
};
