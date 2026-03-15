import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * ESLint flat config for the React Native / Expo mobile app.
 *
 * Adapted from the web config with React Native-specific adjustments:
 *  - No `browser` globals (RN has no DOM: window, document, etc.)
 *  - No `jsx-a11y` (web accessibility plugin; RN uses native a11y APIs)
 *  - `react/react-in-jsx-scope` disabled (new JSX transform used by Expo)
 *  - `react/prop-types` disabled (TypeScript handles prop validation)
 */
const eslintConfig = tseslint.config(
  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript strict rules
  ...tseslint.configs.strict,

  // React rules
  {
    plugins: {
      react: reactPlugin,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      // Not needed with Expo's new JSX transform
      "react/react-in-jsx-scope": "off",
      // TypeScript enforces prop types
      "react/prop-types": "off",
    },
  },

  // React Hooks rules
  {
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // Import ordering (mirrors web config)
  {
    plugins: { import: importPlugin },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
        node: true,
      },
    },
    rules: {
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },

  // Allow _-prefixed variables to be intentionally unused
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Global environment — Node.js (no browser/DOM globals in React Native)
  {
    languageOptions: {
      globals: {
        ...globals.node,
        // React Native / Expo globals
        __DEV__: "readonly",
      },
    },
  },

  // Files to ignore
  {
    ignores: [
      ".expo/**",
      "node_modules/**",
      "dist/**",
      "android/**",
      "ios/**",
      "babel.config.js",
      "metro.config.js",
      "tailwind.config.js",
    ],
  },
);

export default eslintConfig;
