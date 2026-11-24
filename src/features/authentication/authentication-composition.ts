import "server-only";

import { AuthenticationService } from "@/features/authentication/application/authentication.service";
import { FirebaseTokenVerifier } from "@/features/authentication/infrastructure/firebase-token-verifier";

export const authenticationService = new AuthenticationService(new FirebaseTokenVerifier());
