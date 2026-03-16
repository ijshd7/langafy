/**
 * Firebase auth fixtures for E2E regression tests.
 *
 * Provides fake JWT generation and Firebase response factories
 * for mocking Firebase Auth in Playwright tests.
 */

export const FIREBASE_PROJECT_ID = 'e2e-test-project';

export interface TestUser {
  localId: string;
  email: string;
  displayName: string;
  password: string;
}

export const DEFAULT_USER: TestUser = {
  localId: 'regression-test-uid',
  email: 'testuser@example.com',
  displayName: 'Test User',
  password: 'password123',
};

export const NEW_USER: TestUser = {
  localId: 'regression-new-uid',
  email: 'newuser@example.com',
  displayName: 'New User',
  password: 'password123',
};

/**
 * Build a syntactically valid (but fake) Firebase JWT.
 *
 * The Firebase JS client SDK does NOT validate JWT signatures — it trusts
 * tokens that come from identitytoolkit.googleapis.com (which we mock).
 */
export function buildFakeFirebaseJwt(user: TestUser = DEFAULT_USER): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', kid: 'test-key' })
  ).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.localId,
      uid: user.localId,
      email: user.email,
      email_verified: true,
      name: user.displayName,
      aud: FIREBASE_PROJECT_ID,
      iss: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      iat: now,
      exp: now + 3600,
      auth_time: now,
      firebase: {
        identities: { email: [user.email] },
        sign_in_provider: 'password',
      },
    })
  ).toString('base64url');

  return `${header}.${payload}.regression-test-signature-not-validated`;
}

/** Firebase Identity Toolkit: signInWithPassword response */
export function buildSignInResponse(user: TestUser = DEFAULT_USER) {
  const jwt = buildFakeFirebaseJwt(user);
  return {
    kind: 'identitytoolkit#VerifyPasswordResponse',
    localId: user.localId,
    email: user.email,
    displayName: user.displayName,
    idToken: jwt,
    registered: true,
    refreshToken: 'fake-refresh-token',
    expiresIn: '3600',
  };
}

/** Firebase Identity Toolkit: createUserWithEmailAndPassword response */
export function buildSignUpResponse(user: TestUser = NEW_USER) {
  const jwt = buildFakeFirebaseJwt(user);
  return {
    kind: 'identitytoolkit#SignupNewUserResponse',
    localId: user.localId,
    email: user.email,
    displayName: user.displayName,
    idToken: jwt,
    refreshToken: 'fake-refresh-token',
    expiresIn: '3600',
  };
}

/** Firebase Identity Toolkit: accounts:lookup response */
export function buildAccountsLookupResponse(user: TestUser = DEFAULT_USER) {
  return {
    kind: 'identitytoolkit#GetAccountInfoResponse',
    users: [
      {
        localId: user.localId,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
        providerUserInfo: [
          {
            providerId: 'password',
            email: user.email,
            federatedId: user.email,
          },
        ],
        passwordUpdatedAt: 1_600_000_000_000,
        lastLoginAt: '1600000000000',
        createdAt: '1600000000000',
      },
    ],
  };
}

/** Firebase Secure Token API: token refresh response */
export function buildTokenRefreshResponse(user: TestUser = DEFAULT_USER) {
  const jwt = buildFakeFirebaseJwt(user);
  return {
    access_token: jwt,
    expires_in: '3600',
    token_type: 'Bearer',
    refresh_token: 'fake-refresh-token',
    id_token: jwt,
    user_id: user.localId,
    project_id: FIREBASE_PROJECT_ID,
  };
}
