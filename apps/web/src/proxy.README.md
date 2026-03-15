# Authentication Proxy

## Overview

The proxy in `src/proxy.ts` enforces authentication on protected routes and redirects authenticated users away from login/signup pages.

## How It Works

### 1. Authentication Detection

The proxy checks for an `auth-token` cookie to determine if a user is authenticated:

```typescript
const hasAuthCookie = request.cookies.has('auth-token');
```

This cookie is:

- **Set**: When user signs in or signs up (via `authStore.ts`)
- **Set**: When Firebase restores auth state (e.g., on page refresh)
- **Cleared**: When user signs out

### 2. Route Protection

**Protected Routes** (require authentication):

- `/dashboard` - Main dashboard
- `/levels` - Level browsing
- `/lessons` - Lesson pages
- `/vocabulary` - Vocabulary bank
- `/practice` - Practice area

If an unauthenticated user tries to access these routes, they are redirected to `/login`.

**Public Routes** (no authentication required):

- `/login` - Login page
- `/signup` - Signup page
- `/` - Landing page (if any)

### 3. Authenticated User Redirects

If an authenticated user tries to access `/login` or `/signup`, they are automatically redirected to `/dashboard`.

## Cookie Management

### Setting Auth Cookie

When user authenticates, `authStore.ts` calls `setAuthCookie()`:

```typescript
function setAuthCookie() {
  const expiresDate = new Date();
  expiresDate.setDate(expiresDate.getDate() + 7);
  document.cookie = `auth-token=authenticated; path=/; expires=${expiresDate.toUTCString()}; SameSite=Lax`;
}
```

- **Expiration**: 7 days
- **Path**: Root (`/`)
- **SameSite**: Lax (for security)

### Clearing Auth Cookie

When user signs out, `authStore.ts` calls `clearAuthCookie()`:

```typescript
function clearAuthCookie() {
  document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
}
```

## Integration Points

1. **`authStore.ts`**:
   - `signIn()` - Sets cookie after successful login
   - `signUp()` - Sets cookie after successful signup
   - `signOut()` - Clears cookie before sign out
   - `initializeAuth()` - Sets/clears cookie when Firebase auth state changes

2. **`proxy.ts`**:
   - Checks for auth cookie on every request
   - Redirects accordingly

## Flow Example

### Login Flow

1. User visits `/login` (not authenticated)
2. User enters credentials and submits
3. `useAuth().signIn()` is called
4. Firebase authenticates user
5. `setAuthCookie()` is called (sets `auth-token` cookie)
6. User is redirected to `/dashboard`
7. Proxy allows access (cookie present)

### Protected Route Access

1. User visits `/dashboard` (authenticated)
2. Proxy checks for `auth-token` cookie
3. Cookie found → request proceeds
4. Dashboard page is rendered

### Logout Flow

1. User clicks sign out
2. `useAuth().signOut()` is called
3. Firebase signs out user
4. `clearAuthCookie()` is called (removes cookie)
5. User is redirected to `/login`

## Testing

To test the proxy:

1. **Login**: Sign in and verify redirects to `/dashboard`
2. **Protected Route**: Try accessing `/dashboard` without logging in → redirects to `/login`
3. **Auth Route**: While logged in, visit `/login` → redirects to `/dashboard`
4. **Logout**: Sign out and verify `auth-token` cookie is removed
5. **Page Refresh**: Log in, refresh page, verify session persists (via Firebase + cookie)

## Security Notes

- Cookies use `SameSite=Lax` to prevent CSRF attacks
- The `auth-token` cookie is just a flag for the proxy
- Actual authentication is validated by Firebase (token verification happens client-side and on the API)
- The proxy acts as a first-pass guard; API routes require proper Firebase JWT tokens
