import { User as FirebaseUser } from 'firebase/auth';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  getAuthToken: vi.fn(),
}));

import * as firebase from '@/lib/firebase';

import { useAuthStore, initializeAuth } from './authStore';

const mockSignIn = vi.mocked(firebase.signIn);
const mockSignUp = vi.mocked(firebase.signUp);
const mockSignOut = vi.mocked(firebase.signOut);
const mockOnAuthStateChange = vi.mocked(firebase.onAuthStateChange);

const fakeUser = { uid: 'test-uid', email: 'test@example.com' } as FirebaseUser;

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state before each test
    useAuthStore.setState({ user: null, loading: true, error: null });
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('has the correct initial state', () => {
    const { user, loading, error } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(loading).toBe(true);
    expect(error).toBeNull();
  });

  // ── signIn ─────────────────────────────────────────────────────────────────

  it('signIn success: sets user and clears loading', async () => {
    mockSignIn.mockResolvedValue(fakeUser);

    await useAuthStore.getState().signIn('test@example.com', 'password123');

    const { user, loading, error } = useAuthStore.getState();
    expect(user).toEqual(fakeUser);
    expect(loading).toBe(false);
    expect(error).toBeNull();
  });

  it('signIn failure: sets error message and clears loading', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'));

    await expect(
      useAuthStore.getState().signIn('test@example.com', 'wrong')
    ).rejects.toThrow('Invalid credentials');

    const { user, loading, error } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(loading).toBe(false);
    expect(error).toBe('Invalid credentials');
  });

  // ── signUp ─────────────────────────────────────────────────────────────────

  it('signUp success: sets user and clears loading', async () => {
    mockSignUp.mockResolvedValue(fakeUser);

    await useAuthStore.getState().signUp('new@example.com', 'password123');

    const { user, loading } = useAuthStore.getState();
    expect(user).toEqual(fakeUser);
    expect(loading).toBe(false);
  });

  it('signUp failure: sets error and re-throws', async () => {
    mockSignUp.mockRejectedValue(new Error('Email already in use'));

    await expect(
      useAuthStore.getState().signUp('existing@example.com', 'pass')
    ).rejects.toThrow('Email already in use');

    expect(useAuthStore.getState().error).toBe('Email already in use');
  });

  // ── signOut ────────────────────────────────────────────────────────────────

  it('signOut success: sets user to null', async () => {
    useAuthStore.setState({ user: fakeUser, loading: false });
    mockSignOut.mockResolvedValue(undefined);

    await useAuthStore.getState().signOut();

    const { user, loading } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(loading).toBe(false);
  });

  it('signOut failure: sets error and re-throws', async () => {
    useAuthStore.setState({ user: fakeUser, loading: false });
    mockSignOut.mockRejectedValue(new Error('Network error'));

    await expect(useAuthStore.getState().signOut()).rejects.toThrow('Network error');

    expect(useAuthStore.getState().error).toBe('Network error');
  });

  // ── clearError ─────────────────────────────────────────────────────────────

  it('clearError: removes existing error', () => {
    useAuthStore.setState({ error: 'some error' });

    useAuthStore.getState().clearError();

    expect(useAuthStore.getState().error).toBeNull();
  });

  // ── initializeAuth ─────────────────────────────────────────────────────────

  it('initializeAuth: subscribes to Firebase auth state changes', () => {
    mockOnAuthStateChange.mockReturnValue(vi.fn());

    initializeAuth();

    expect(mockOnAuthStateChange).toHaveBeenCalledOnce();
  });

  it('initializeAuth: updates store when auth state changes to a user', () => {
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback(fakeUser);
      return vi.fn();
    });

    initializeAuth();

    const { user, loading } = useAuthStore.getState();
    expect(user).toEqual(fakeUser);
    expect(loading).toBe(false);
  });

  it('initializeAuth: clears user when auth state changes to null', () => {
    useAuthStore.setState({ user: fakeUser, loading: false });
    mockOnAuthStateChange.mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });

    initializeAuth();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('initializeAuth: returns the unsubscribe function', () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChange.mockReturnValue(unsubscribe);

    const result = initializeAuth();

    expect(result).toBe(unsubscribe);
  });
});
