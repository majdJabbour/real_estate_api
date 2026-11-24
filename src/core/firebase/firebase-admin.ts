import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { readFirebaseEnvironment } from "@/core/config/firebase-env";
import { ApiError } from "@/core/errors/api-error";

const APP_NAME = "real-estate-api-auth";

export function getFirebaseAuth() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new ApiError("SERVICE_UNAVAILABLE", "Authentication service unavailable");
  }

  const serviceAccount = readFirebaseEnvironment();
  const { projectId } = serviceAccount;
  const credential = cert(serviceAccount);
  const existing = getApps().find(({ name }) => name === APP_NAME);

  if (existing && (existing.options.projectId !== projectId || existing.options.credential !== credential)) {
    throw new ApiError("SERVICE_UNAVAILABLE", "Authentication service unavailable");
  }

  return getAuth(existing ?? initializeApp({ projectId, credential }, APP_NAME));
}
