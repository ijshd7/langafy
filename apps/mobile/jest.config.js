/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@rn-primitives/.*|nativewind|lucide-react-native|@langafy/.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@langafy/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@langafy/shared-game-logic$':
      '<rootDir>/../../packages/shared-game-logic/src/index.ts',
    // expo/winter lazy getters require ESM-only packages; stub them all out
    '^expo/src/winter/ImportMetaRegistry$': '<rootDir>/__mocks__/empty.js',
    '^@ungap/structured-clone$': '<rootDir>/__mocks__/empty.js',
  },
};
