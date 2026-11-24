import { expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/auth/me/route";
import { AuthenticationService } from "@/features/authentication/application/authentication.service";
import type { TokenVerifier } from "@/features/authentication/domain/token-verifier";
import { FirebaseTokenVerifier } from "@/features/authentication/infrastructure/firebase-token-verifier";

const { verify } = vi.hoisted(() => ({ verify: vi.fn<TokenVerifier["verify"]>() }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/authentication/authentication-composition", async () => {
  const { AuthenticationService } = await import("@/features/authentication/application/authentication.service");
  return { authenticationService: new AuthenticationService({ verify }) };
});

function profile(authorization?: string) {
  return GET(new Request("http://localhost/api/v1/auth/me?id=untrusted", {
    headers: authorization === undefined ? undefined : { Authorization: authorization },
  }));
}

it.each([undefined, "Basic fake.token.value", "Bearer", "Bearer malformed", "Bearer one.two.",
  "Bearer one.two.three, Bearer four.five.six", "Bearer\tone.two.three"])(
  "returns a private 401 for missing or malformed authorization (%s)",
  async (header) => {
    verify.mockClear();
    const response = await profile(header);
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or missing Firebase ID token" },
    });
    expect(verify).not.toHaveBeenCalled();
  },
);

it("returns the verified identity once and uses private no-store caching", async () => {
  const identity = { id: "verified-user", name: null, email: "fixture@example.invalid", avatar: null };
  verify.mockClear().mockResolvedValueOnce(identity);
  const response = await profile("bEaReR  fake.token.value");
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ success: true, data: identity });
  expect(verify).toHaveBeenCalledExactlyOnceWith("fake.token.value");
});

it.each([
  ["auth/id-token-expired", 401, "UNAUTHORIZED", "Invalid or missing Firebase ID token"],
  ["auth/internal-error", 503, "SERVICE_UNAVAILABLE", "Authentication service unavailable"],
] as const)("maps %s to a sanitized private response", async (sdkCode, status, code, message) => {
  const verifier = new FirebaseTokenVerifier(() => ({
    verifyIdToken: vi.fn().mockRejectedValue({ code: sdkCode, message: "sensitive internal marker" }),
  }));
  const service = new AuthenticationService(verifier);
  verify.mockImplementationOnce((token) => service.authenticate(`Bearer ${token}`));

  const response = await profile("Bearer fake.token.value");
  expect(response.status).toBe(status);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ success: false, error: { code, message } });
});
