import type { Pagination } from "@/core/pagination";
import type { Locale } from "@/features/properties/domain/property.schema";

export function jsonResponse<T>(body: T, status: number, locale?: Locale): Response {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (locale !== undefined) {
    headers.set("Content-Language", locale);
    headers.set("Vary", "Accept-Language");
  }
  return Response.json(body, { status, headers });
}

export function successResponse<T>(data: T, locale?: Locale): Response {
  return jsonResponse({ success: true, data }, 200, locale);
}

export function paginatedResponse<T>(
  { data, pagination }: { data: readonly T[]; pagination: Pagination },
  locale?: Locale,
): Response {
  return jsonResponse({ success: true, data, pagination }, 200, locale);
}
