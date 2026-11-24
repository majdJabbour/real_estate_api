import type { ZodType } from "zod";

import { ApiError, type ApiErrorCode } from "@/core/errors/api-error";
import { jsonResponse } from "@/core/http/api-response";

export { ApiError };

const errorStatuses = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  PROPERTY_NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const satisfies Record<ApiErrorCode | "INTERNAL_SERVER_ERROR", number>;

export function parseInput<T>(
  schema: ZodType<T>,
  input: unknown,
  message: string,
  defaultField: string,
): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;

  const details = parsed.error.issues.map((issue) => ({
    field: String(issue.path[0] ?? defaultField),
    message: issue.message,
  }));
  throw new ApiError("VALIDATION_ERROR", message, details);
}

export async function handleApiRequest(
  operation: () => Promise<Response>,
  { privateResponse = false }: { privateResponse?: boolean } = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await operation();
  } catch (error) {
    if (error instanceof ApiError) {
      const { code, message, details } = error;
      response = jsonResponse({ success: false, error: { code, message, details } }, errorStatuses[code]);
      if (code === "UNAUTHORIZED") response.headers.set("WWW-Authenticate", "Bearer");
    } else {
      // Exception objects can contain request data or other internal information.
      console.error("Unexpected API request failure");
      response = jsonResponse({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
      }, errorStatuses.INTERNAL_SERVER_ERROR);
    }
  }
  if (privateResponse) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
