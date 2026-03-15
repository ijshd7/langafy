// expo/src/winter installs lazy getters for several globals that call require() on ESM-only
// packages — unsupported in Jest's CJS mode. Force-assign safe values here (setupFilesAfterEnv
// runs with isInsideTestCode=true) so the getters are replaced before module loading begins.

// __ExpoImportMetaRegistry getter calls require('./ImportMetaRegistry') which uses dynamic import()
if (typeof global.__ExpoImportMetaRegistry !== 'undefined') {
  global.__ExpoImportMetaRegistry = { url: null, resolve: () => null };
}

// structuredClone getter calls require('@ungap/structured-clone').default which is undefined
// when stubbed, causing "Object.defineProperty called on non-object". Assign directly (never
// read the getter) so the setter fires and replaces the lazy getter with a plain value.
global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

// Mock react-native-reanimated with the provided test mock
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Mock expo-haptics (native module unavailable in Jest)
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock expo-constants so API/firebase clients initialise without native config
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:5000/api',
        firebaseApiKey: 'test-api-key',
        firebaseAuthDomain: 'test.firebaseapp.com',
        firebaseProjectId: 'test-project',
        firebaseStorageBucket: 'test.appspot.com',
        firebaseMessagingSenderId: '123456',
        firebaseAppId: '1:123456:web:abc123',
      },
    },
  },
}));
