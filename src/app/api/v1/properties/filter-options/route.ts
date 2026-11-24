import { z } from "zod";

import { resolveLocale } from "@/core/http/accept-language";
import { handleApiRequest, parseInput } from "@/core/http/api-error";
import { successResponse } from "@/core/http/api-response";
import { propertyService } from "@/features/properties/property-composition";

const emptyQuerySchema = z.instanceof(URLSearchParams)
  .refine((params) => params.size === 0, "Query parameters are not accepted");

export function GET(request: Request): Promise<Response> {
  return handleApiRequest(async () => {
    parseInput(emptyQuerySchema, new URL(request.url).searchParams, "Invalid query parameters", "query");
    const locale = resolveLocale(request.headers.get("Accept-Language"));
    return successResponse(await propertyService.getFilterOptions(locale), locale);
  });
}
