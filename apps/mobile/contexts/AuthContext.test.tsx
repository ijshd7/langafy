import { User as FirebaseUser } from 'firebase/auth';
import React, { useContext } from 'react';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/lib/firebase', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChange: jest.fn(),
  getAuthToken: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  apiClient: { post: jest.fn(), setTokenProvider: jest.fn() },
  initializeApiClient: jest.fn(),
}));

import * as firebase from '@/lib/firebase';
import { AuthContext, AuthProvider } from './AuthContext';

const mockSignIn = jest.mocked(firebase.signIn);
const mockSignUp = jest.mocked(firebase.signUp);
const mockSignOut = jest.mocked(firebase.signOut);
const mockOnAuthStateChange = jest.mocked(firebase.onAuthStateChange);

const fakeUser = { uid: 'test-uid', email: 'test@example.com' } as FirebaseUser;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: auth state subscription resolves to null (unauthenticated)
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback(null);
      return jest.fn();
    });
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('has loading=false and user=null after auth state resolves', () => {
    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    expect(result.current?.user).toBeNull();
    expect(result.current?.loading).toBe(false);
    expect(result.current?.error).toBeNull();
  });

  it('subscribes to Firebase auth state changes on mount', () => {
    renderHook(() => useContext(AuthContext), { wrapper });

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('returns unsubscribe function and calls it on unmount', () => {
    const unsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useContext(AuthContext), { wrapper });
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('updates user state when auth state changes to a user', () => {
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback(fakeUser);
      return jest.fn();
    });

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    expect(result.current?.user).toEqual(fakeUser);
    expect(result.current?.loading).toBe(false);
  });

  // ── signIn ─────────────────────────────────────────────────────────────────

  it('signIn success: sets user and clears loading', async () => {
    mockSignIn.mockResolvedValue(fakeUser);

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current?.signIn('test@example.com', 'password123');
    });

    expect(result.current?.user).toEqual(fakeUser);
    expect(result.current?.loading).toBe(false);
    expect(result.current?.error).toBeNull();
  });

  it('signIn failure: sets error and clears loading', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current?.signIn('test@example.com', 'wrong').catch(() => {});
    });

    expect(result.current?.user).toBeNull();
    expect(result.current?.loading).toBe(false);
    expect(result.current?.error).toBe('Invalid credentials');
  });

  // ── signUp ─────────────────────────────────────────────────────────────────

  it('signUp success: sets user and clears loading', async () => {
    mockSignUp.mockResolvedValue(fakeUser);

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current?.signUp('new@example.com', 'password123');
    });

    expect(result.current?.user).toEqual(fakeUser);
    expect(result.current?.loading).toBe(false);
  });

  it('signUp failure: sets error and re-throws', async () => {
    mockSignUp.mockRejectedValue(new Error('Email already in use'));

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current?.signUp('existing@example.com', 'pass').catch(() => {});
    });

    expect(result.current?.error).toBe('Email already in use');
  });

  // ── signOut ────────────────────────────────────────────────────────────────

  it('signOut success: clears user', async () => {
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback(fakeUser);
      return jest.fn();
    });
    mockSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current?.signOut();
    });

    expect(result.current?.user).toBeNull();
    expect(result.current?.loading).toBe(false);
  });

  it('signOut failure: sets error', async () => {
    mockSignOut.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current?.signOut().catch(() => {});
    });

    expect(result.current?.error).toBe('Network error');
  });

  // ── clearError ─────────────────────────────────────────────────────────────

  it('clearError: removes existing error', async () => {
    mockSignIn.mockRejectedValue(new Error('Bad credentials'));

    const { result } = renderHook(() => useContext(AuthContext), { wrapper });

    await act(async () => {
      await result.current?.signIn('x@x.com', 'wrong').catch(() => {});
    });

    expect(result.current?.error).toBe('Bad credentials');

    act(() => {
      result.current?.clearError();
    });

    expect(result.current?.error).toBeNull();
  });
});
