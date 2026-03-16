import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config that reads environment variables and injects them into
 * Constants.expoConfig.extra so they are accessible at runtime via:
 *   Constants.expoConfig?.extra?.apiUrl
 *
 * Copy .env.example to .env.local and fill in values before running.
 * Expo automatically loads .env.local in the CLI — no dotenv setup needed.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000',
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  },
});
