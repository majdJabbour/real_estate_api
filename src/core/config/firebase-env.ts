import "server-only";

import { z } from "zod";

import { ApiError } from "@/core/errors/api-error";

const firebaseEnvironmentSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().trim().regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/),
  FIREBASE_CLIENT_EMAIL: z.string().trim().pipe(z.email()),
  FIREBASE_PRIVATE_KEY: z.string()
    .transform((key) => key.replace(/\\r\\n|\\n|\r\n/g, "\n").trim())
    .refine((key) => /^-----BEGIN PRIVATE KEY-----\n(?:[A-Za-z0-9+/=]+\n)+-----END PRIVATE KEY-----$/.test(key)),
});

export function readFirebaseEnvironment(env: NodeJS.Dict<string> = process.env) {
  const result = firebaseEnvironmentSchema.safeParse(env);
  if (!result.success) {
    throw new ApiError("SERVICE_UNAVAILABLE", "Authentication service unavailable");
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = result.data;
  return {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY,
  };
}
