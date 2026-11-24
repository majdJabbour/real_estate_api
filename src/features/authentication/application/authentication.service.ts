import { ApiError } from "@/core/errors/api-error";
import type { AuthenticatedUser, TokenVerifier } from "@/features/authentication/domain/token-verifier";

export class AuthenticationService {
  constructor(private readonly verifier: TokenVerifier) {}

  async authenticate(authorization: string | null): Promise<AuthenticatedUser> {
    // Verify the credential shape here. The SDK verifies every claim and the signature.
    const match = authorization?.match(/^Bearer +([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i);
    if (!match) throw new ApiError("UNAUTHORIZED", "Invalid or missing Firebase ID token");
    return this.verifier.verify(match[1]);
  }
}
