import type { ZodType } from "zod";

import { jsonResponse } from "@/core/http/api-response";

const errorStatuses = {
  VALIDATION_ERROR: 400,
  PROPERTY_NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

type ErrorCode = keyof typeof errorStatuses;
type FieldError = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly code: Exclude<ErrorCode, "INTERNAL_SERVER_ERROR">,
    message: string,
    readonly details?: readonly FieldError[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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

export async function handleApiRequest(operation: () => Promise<Response>): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) {
      const { code, message, details } = error;
      return jsonResponse({ success: false, error: { code, message, details } }, errorStatuses[code]);
    }

    // Exception objects can contain request data or other internal information.
    console.error("Unexpected API request failure");
    return jsonResponse({
      success: false,
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
    }, errorStatuses.INTERNAL_SERVER_ERROR);
  }
}
