import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';

/**
 * Firebase configuration from environment variables
 * These should be public (safe to expose in client-side code)
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate that Firebase config is provided
const validateFirebaseConfig = () => {
  // Only validate on client (typeof window !== 'undefined')
  if (typeof window === 'undefined') return;

  const required = ['apiKey', 'authDomain', 'projectId'] as const;
  const missing = required.filter((key) => !firebaseConfig[key]);

  if (missing.length > 0) {
    console.warn(
      `Firebase configuration incomplete. Missing: ${missing.join(', ')}. ` +
        'Make sure to set NEXT_PUBLIC_FIREBASE_* environment variables.'
    );
  }
};

// Lazy initialize Firebase app (only on client)
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

const initializeFirebase = () => {
  if (app !== null) return app;

  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be initialized in the browser');
  }

  app = initializeApp(firebaseConfig);
  validateFirebaseConfig();
  authInstance = getAuth(app);

  // Set persistence to LOCAL so users stay logged in across browser sessions
  setPersistence(authInstance, browserLocalPersistence).catch((error) => {
    console.error('Failed to set Firebase persistence:', error);
  });

  return app;
};

// Get Firebase Auth instance (lazy initializes if needed)
export const getAuthInstance = (): Auth => {
  if (authInstance === null) {
    initializeFirebase();
  }
  return authInstance!;
};

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
  const auth = getAuthInstance();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<User> {
  const auth = getAuthInstance();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const auth = getAuthInstance();
  await firebaseSignOut(auth);
}

/**
 * Get ID token for API requests
 * Automatically handles token refresh
 */
export async function getAuthToken(): Promise<string | null> {
  const auth = getAuthInstance();
  return auth.currentUser?.getIdToken() ?? null;
}

/**
 * Subscribe to authentication state changes
 * Returns unsubscribe function
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, callback);
}
