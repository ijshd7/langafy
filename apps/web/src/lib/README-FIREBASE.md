# Firebase Authentication Setup

## Overview

Firebase Authentication is integrated with the app to handle user sign-up, sign-in, and session management. The integration is designed to be minimal and performant using Zustand for state management.

## Architecture

```
Firebase Auth ─→ Zustand Store ─→ React Hooks ─→ Components
     ↓
API Client (Token Injection)
```

### Files

- **`src/lib/firebase.ts`** - Firebase initialization and auth functions
- **`src/stores/authStore.ts`** - Zustand store for auth state
- **`src/contexts/AuthContext.tsx`** - Provider component (wraps the store)
- **`src/hooks/useAuth.ts`** - Convenience hooks for accessing auth state

## Environment Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable Authentication > Email/Password provider

2. **Get Firebase Config**
   - In Firebase Console: Project Settings → Your apps → Web
   - Copy the config values

3. **Set Environment Variables**
   ```bash
   # .env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

## Usage

### In Components (Recommended)

```typescript
'use client'

import { useAuth, useIsAuthenticated, useCurrentUser } from '@/hooks/useAuth'

export function MyComponent() {
  const { user, loading, error, signIn, signOut } = useAuth()
  const isAuthenticated = useIsAuthenticated()
  const currentUser = useCurrentUser()

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {currentUser?.email}!</p>
          <button onClick={() => signOut()}>Sign Out</button>
        </div>
      ) : (
        <button onClick={() => signIn('user@example.com', 'password')}>
          Sign In
        </button>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
```

### Direct Store Access

For cases where you need to access the store directly:

```typescript
import { useAuthStore } from '@/stores/authStore';

const user = useAuthStore((state) => state.user);
const signIn = useAuthStore((state) => state.signIn);
```

### Available Hooks

- **`useAuth()`** - Returns entire auth state and actions
- **`useIsAuthenticated()`** - Returns boolean indicating auth status
- **`useCurrentUser()`** - Returns current Firebase user or null
- **`useAuthLoading()`** - Returns loading state

## Features

### Automatic Token Injection

The API client automatically injects Firebase tokens into all requests:

```typescript
// In your components, just use the API client:
const user = await apiClient.get<User>('/users/me');
// Authorization header is automatically added!
```

### Persistent Sessions

Firebase auth state is persisted to browser `localStorage`, so users remain logged in across browser sessions.

### Error Handling

Auth errors are captured and stored in the auth store:

```typescript
const { error } = useAuth();

try {
  await signIn('user@example.com', 'password');
} catch (err) {
  // Error is also stored in error state
  console.log(error); // Error message from store
}
```

## Sign In / Sign Up Flow

### Sign In

```typescript
const { signIn, loading, error } = useAuth();

const handleSignIn = async () => {
  try {
    const user = await signIn('user@example.com', 'password');
    console.log('Signed in:', user.uid);
    // User is automatically added to store
    // API token provider is automatically set up
    // Redirect to dashboard happens in middleware (Step 3.5)
  } catch (err) {
    console.log('Sign in failed:', error);
  }
};
```

### Sign Up

```typescript
const { signUp, loading, error } = useAuth();

const handleSignUp = async () => {
  try {
    const user = await signUp('newuser@example.com', 'password');
    console.log('Account created:', user.uid);
    // User is automatically added to store
  } catch (err) {
    console.log('Sign up failed:', error);
  }
};
```

### Sign Out

```typescript
const { signOut } = useAuth();

const handleSignOut = async () => {
  await signOut();
  // user is set to null in store
  // API client token provider is cleared
  // Redirect to login happens in middleware (Step 3.5)
};
```

## Next Steps (Step 3.4)

Step 3.4 will implement the auth pages (login and signup) using these hooks:

- `src/app/(auth)/login/page.tsx` - Email/password login form
- `src/app/(auth)/signup/page.tsx` - Email/password signup form

These pages will use the `useAuth()` hook to handle sign in/up and show loading/error states.

## Troubleshooting

### "Firebase configuration incomplete" warning

Make sure all `NEXT_PUBLIC_FIREBASE_*` environment variables are set in `.env`.

### Tokens not being sent to API

Check:

1. Firebase user is authenticated: `console.log(useAuth().user)`
2. API client token provider is set up (automatic in AuthProvider)
3. API is checking `Authorization` header

### Auth state not persisting across page reloads

Firebase should persist by default to `localStorage`. Check browser DevTools:

- Application → Local Storage
- Look for `firebase:authUser:...` entries

## Performance Considerations

- **Zustand** - Minimal re-renders, only components using specific state properties re-render
- **Selector hooks** - `useIsAuthenticated()` only re-renders on auth changes, not on other state updates
- **Token refresh** - Firebase automatically handles token refresh transparently
- **No Context Provider wrapper** - Direct store access, not heavy Context API

## Further Reading

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
