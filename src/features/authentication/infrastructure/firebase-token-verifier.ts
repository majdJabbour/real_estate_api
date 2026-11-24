import "server-only";

import { getAuth as getAdminAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";

import { ApiError } from "@/core/errors/api-error";
import { getFirebaseApp } from "@/core/firebase/firebase-admin";
import type { AuthenticatedUser, TokenVerifier } from "@/features/authentication/domain/token-verifier";

const invalidCredentialCodes = new Set([
  "auth/invalid-id-token",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
]);

function isCredentialError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error) || typeof error.code !== "string") {
    return false;
  }
  if (invalidCredentialCodes.has(error.code)) return true;

  // Admin also uses argument errors for signing-key fetch failures. Match only
  // the installed SDK's credential rejection messages and never return them to clients.
  return (error.code === "auth/argument-error" || error.code === "auth/invalid-argument")
    && "message" in error
    && typeof error.message === "string"
    && /^(?:Decoding Firebase ID token failed\.|Firebase ID token has |verifyIdToken\(\) expects )/.test(error.message);
}

function optionalClaim(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export class FirebaseTokenVerifier implements TokenVerifier {
  constructor(private readonly getAuth: () => Pick<Auth, "verifyIdToken"> = () => getAdminAuth(getFirebaseApp())) {}

  async verify(token: string): Promise<AuthenticatedUser> {
    let claims: DecodedIdToken;
    try {
      claims = await this.getAuth().verifyIdToken(token, true);
    } catch (error) {
      if (isCredentialError(error)) {
        throw new ApiError("UNAUTHORIZED", "Invalid or missing Firebase ID token");
      }
      throw new ApiError("SERVICE_UNAVAILABLE", "Authentication service unavailable");
    }

    return {
      id: claims.uid,
      email: optionalClaim(claims.email),
      name: optionalClaim(claims.name),
      avatar: optionalClaim(claims.picture),
    };
  }
}
