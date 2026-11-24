import { afterEach, describe, expect, it, vi } from "vitest";
import { cert, getApps, initializeApp, type App, type Credential } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

import { readFirebaseEnvironment } from "@/core/config/firebase-env";
import { getFirebaseApp } from "@/core/firebase/firebase-admin";
import { FirebaseTokenVerifier } from "@/features/authentication/infrastructure/firebase-token-verifier";

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/app", () => ({
  cert: vi.fn(),
  getApps: vi.fn(),
  initializeApp: vi.fn(),
}));
vi.mock("firebase-admin/auth", () => ({ getAuth: vi.fn() }));

const keyPlaceholder = "-----BEGIN PRIVATE KEY-----\nZmFrZQ==\n-----END PRIVATE KEY-----";
const testEnv = {
  FIREBASE_PROJECT_ID: "example-test-project",
  FIREBASE_CLIENT_EMAIL: "fixture@example.invalid",
  FIREBASE_PRIVATE_KEY: keyPlaceholder,
};
const claims: DecodedIdToken = {
  aud: "example-test-project",
  auth_time: 100,
  exp: 200,
  iat: 100,
  iss: "https://securetoken.google.com/example-test-project",
  sub: "verified-user",
  uid: "verified-user",
  firebase: { identities: {}, sign_in_provider: "google.com" },
};

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("Firebase environment", () => {
  it("requires all environment values and sanitizes the failure", () => {
    expect(() => readFirebaseEnvironment({})).toThrowError(expect.objectContaining({
      code: "SERVICE_UNAVAILABLE",
      message: "Authentication service unavailable",
    }));
  });

  it.each([
    { FIREBASE_PROJECT_ID: "INVALID PROJECT" },
    { FIREBASE_CLIENT_EMAIL: "invalid-address" },
    { FIREBASE_PRIVATE_KEY: "invalid-key-placeholder" },
  ])("rejects invalid configuration with a fixed message", (invalidEnv) => {
    expect(() => readFirebaseEnvironment({ ...testEnv, ...invalidEnv })).toThrowError(
      /^Authentication service unavailable$/,
    );
  });

  it.each([keyPlaceholder, keyPlaceholder.replaceAll("\n", "\\n"), keyPlaceholder.replaceAll("\n", "\r\n")])(
    "normalizes both actual and escaped PEM line endings",
    (value) => {
      expect(readFirebaseEnvironment({ ...testEnv, FIREBASE_PRIVATE_KEY: value })).toEqual({
        projectId: testEnv.FIREBASE_PROJECT_ID,
        clientEmail: testEnv.FIREBASE_CLIENT_EMAIL,
        privateKey: keyPlaceholder,
      });
    },
  );
});

describe("Firebase Admin initialization", () => {
  it("defers initialization until first verification and reuses the compatible app", async () => {
    for (const [name, value] of Object.entries(testEnv)) vi.stubEnv(name, value);
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
    const credential: Credential = { getAccessToken: vi.fn() };
    const app: App = {
      name: "real-estate-api-auth",
      options: { credential, projectId: testEnv.FIREBASE_PROJECT_ID },
    };
    vi.mocked(cert).mockReturnValue(credential);
    vi.mocked(getApps).mockReturnValueOnce([]).mockReturnValue([app]);
    vi.mocked(initializeApp).mockReturnValue(app);
    vi.mocked(getAuth).mockImplementation(() => { throw new Error("SDK unavailable"); });

    const verifier = new FirebaseTokenVerifier();
    expect(initializeApp).not.toHaveBeenCalled();
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(verifier.verify("fake.token.value")).rejects.toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        message: "Authentication service unavailable",
      });
    }
    expect(initializeApp).toHaveBeenCalledExactlyOnceWith(app.options, app.name);
    expect(getAuth).toHaveBeenNthCalledWith(1, app);
    expect(getAuth).toHaveBeenNthCalledWith(2, app);
  });

  it("does not reuse a named app with a different project", () => {
    for (const [name, value] of Object.entries(testEnv)) vi.stubEnv(name, value);
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
    const credential: Credential = { getAccessToken: vi.fn() };
    vi.mocked(cert).mockReturnValue(credential);
    vi.mocked(getApps).mockReturnValue([{
      name: "real-estate-api-auth", options: { projectId: "different-project", credential },
    }]);

    expect(() => getFirebaseApp()).toThrowError("Authentication service unavailable");
    expect(getAuth).not.toHaveBeenCalled();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it("fails closed when the Admin Auth emulator is configured", () => {
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    expect(() => getFirebaseApp()).toThrowError("Authentication service unavailable");
    expect(initializeApp).not.toHaveBeenCalled();
  });
});

describe("Firebase token verification", () => {
  it("checks for revocation and selects only verified profile fields", async () => {
    const verifyIdToken = vi.fn().mockResolvedValue({
      ...claims, email: "fixture@example.invalid", name: "Fixture", picture: "https://example.invalid/avatar",
      privateClaim: "internal test marker",
    });
    const verifier = new FirebaseTokenVerifier(() => ({ verifyIdToken }));

    await expect(verifier.verify("fake.token.value")).resolves.toEqual({
      id: "verified-user", email: "fixture@example.invalid", name: "Fixture",
      avatar: "https://example.invalid/avatar",
    });
    expect(verifyIdToken).toHaveBeenCalledExactlyOnceWith("fake.token.value", true);
  });

  it("returns null for missing, blank, or non-string optional claims", async () => {
    const verifyIdToken = vi.fn().mockResolvedValue({ ...claims, name: " ", picture: 42 });
    const verifier = new FirebaseTokenVerifier(() => ({ verifyIdToken }));
    await expect(verifier.verify("fake.token.value")).resolves.toEqual({
      id: "verified-user", email: null, name: null, avatar: null,
    });
  });

  it.each([
    { code: "auth/invalid-id-token" },
    { code: "auth/id-token-expired" },
    { code: "auth/id-token-revoked" },
    { code: "auth/user-disabled" },
    { code: "auth/user-not-found" },
    { code: "auth/argument-error", message: "Decoding Firebase ID token failed." },
    { code: "auth/argument-error", message: 'Firebase ID token has incorrect "aud" (audience) claim.' },
    { code: "auth/invalid-argument", message: "Firebase ID token has invalid signature." },
  ])("maps credential rejection %j to unauthorized", async (error) => {
    const verifier = new FirebaseTokenVerifier(() => ({
      verifyIdToken: vi.fn().mockRejectedValue(error),
    }));
    await expect(verifier.verify("fake.token.value")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each([
    { code: "auth/invalid-credential", message: "private infrastructure detail" },
    { code: "auth/insufficient-permission" },
    { code: "auth/internal-error" },
    { code: "auth/argument-error", message: "Error fetching public keys for Google certs" },
    { code: "auth/argument-error", message: "Error while making request: getaddrinfo ENOTFOUND" },
    new Error("Unexpected backend failure"),
  ])("keeps infrastructure failures distinct from credential rejection", async (error) => {
    const verifier = new FirebaseTokenVerifier(() => ({
      verifyIdToken: vi.fn().mockRejectedValue(error),
    }));
    await expect(verifier.verify("fake.token.value")).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "Authentication service unavailable",
    });
  });
});
