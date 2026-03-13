# API Client Utilities

## Overview

The API client provides type-safe communication with the backend API, with automatic Firebase token injection and comprehensive error handling.

## Files

- **`api.ts`** - Main API client with generic fetch methods
- **`utils.ts`** - Utility functions (existing, includes `cn()` for class merging)

## Usage

### Direct API Client

For simple requests or when you don't need loading/error state management:

```typescript
import { apiClient, ApiError } from '@/lib/api'
import { User, Language } from '@langafy/shared-types'

// GET request
const user = await apiClient.get<User>('/users/me')

// POST request with data
const syncedUser = await apiClient.post<User>('/auth/sync', { email: 'user@example.com' })

// PUT request
const updated = await apiClient.put<User>('/users/me', { displayName: 'New Name' })

// DELETE request
await apiClient.delete<void>('/users/me')

// With query parameters
const languages = await apiClient.get<Language[]>('/languages', {
  params: { active: true }
})

// Error handling
try {
  await apiClient.get('/non-existent')
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.statusCode, error.code, error.message)
  }
}
```

### Hooks (Recommended for Components)

For component usage with automatic loading and error state:

```typescript
'use client'

import { useApi, useMutate } from '@/hooks/useApi'
import { User } from '@langafy/shared-types'

// Auto-fetch on mount
export function MyComponent() {
  const { data: user, loading, error } = useApi<User>('/users/me')

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{user?.displayName}</div>
}

// Manual execution (e.g., for form submissions)
export function LoginForm() {
  const { execute, loading, error } = useMutate<User>('/auth/sync', 'POST')

  const handleSubmit = async (email: string) => {
    try {
      const user = await execute({ email })
      console.log('Logged in:', user)
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleSubmit(e.currentTarget.email.value)
    }}>
      <input name="email" type="email" />
      <button disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <p className="text-red-500">{error.message}</p>}
    </form>
  )
}
```

## Firebase Token Integration

The API client is configured to automatically inject Firebase authentication tokens. This is set up in Step 3.3 (Firebase integration).

Once Firebase is configured, tokens are automatically attached to all requests:

```typescript
// Set up token provider (done in Step 3.3)
apiClient.setTokenProvider(async () => {
  const auth = getAuth()
  return auth.currentUser?.getIdToken()
})

// Now all requests automatically include: Authorization: Bearer {token}
```

## Error Handling

The `ApiError` class provides structured error information:

```typescript
import { ApiError } from '@/lib/api'

try {
  await apiClient.post('/exercises/submit', { answer: 'test' })
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        // Handle validation error
        break
      case 'UNAUTHORIZED':
        // Handle auth error - redirect to login
        break
      case 'NOT_FOUND':
        // Handle 404
        break
      default:
        // Handle generic error
    }
  }
}
```

## Environment Configuration

Set `NEXT_PUBLIC_API_URL` in `.env.local` to point to your API:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

If not set, defaults to `http://localhost:5000/api`.

## Type Safety

All requests are fully typed using TypeScript generics and shared types from `@langafy/shared-types`:

```typescript
// Response is typed as User
const user: User = await apiClient.get<User>('/users/me')

// Response is typed as User[]
const users: User[] = await apiClient.get<User[]>('/users')

// Response is typed as Language[]
const languages: Language[] = await apiClient.get<Language[]>('/languages')
```

## Best Practices

1. **Use hooks for components** - Hooks handle loading states, error states, and cleanup
2. **Use direct client for services/utilities** - When building helper functions or API integrations
3. **Always handle errors** - Either catch in try/catch or handle via hook's error state
4. **Type your responses** - Use generic types for full TypeScript support
5. **Query parameters** - Pass params object for cleaner code than URL manipulation

## Next Steps

- Step 3.3: Firebase Authentication integration (sets up token injection)
- Step 3.4: Auth pages (login/signup using these utilities)
