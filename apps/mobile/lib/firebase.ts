import Constants from 'expo-constants';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

/**
 * Firebase configuration from environment variables
 * These should be public (safe to expose in client-side code)
 */
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
};

/**
 * Validate that Firebase config is provided
 */
const validateFirebaseConfig = () => {
  const required = ['apiKey', 'authDomain', 'projectId'] as const;
  const missing = required.filter((key) => !firebaseConfig[key]);

  if (missing.length > 0) {
    console.warn(
      `Firebase configuration incomplete. Missing: ${missing.join(', ')}. ` +
        'Make sure to set Firebase config in app.json extra section.'
    );
  }
};

// Lazy initialize Firebase app
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

const initializeFirebase = () => {
  if (app !== null) return app;

  app = initializeApp(firebaseConfig);
  validateFirebaseConfig();
  authInstance = getAuth(app);

  return app;
};

/**
 * Get Firebase Auth instance (lazy initializes if needed)
 */
export const getAuthInstance = (): Auth => {
  if (authInstance === null) {
    initializeFirebase();
  }
  // initializeFirebase() assigns authInstance — non-null assertion is safe here
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
