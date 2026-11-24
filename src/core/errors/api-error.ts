export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PROPERTY_NOT_FOUND"
  | "SERVICE_UNAVAILABLE";

type FieldError = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: readonly FieldError[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
