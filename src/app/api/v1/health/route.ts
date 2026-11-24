import { successResponse } from "@/core/http/api-response";

export function GET(): Response {
  return successResponse({ status: "ok" });
}
