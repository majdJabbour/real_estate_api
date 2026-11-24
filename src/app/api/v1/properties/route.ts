import { resolveLocale } from "@/core/http/accept-language";
import { handleApiRequest, parseInput } from "@/core/http/api-error";
import { paginatedResponse } from "@/core/http/api-response";
import { propertyQuerySchema } from "@/features/properties/domain/property-query.schema";
import { propertyService } from "@/features/properties/property-composition";

export function GET(request: Request): Promise<Response> {
  return handleApiRequest(async () => {
    const query = parseInput(
      propertyQuerySchema,
      new URL(request.url).searchParams,
      "Invalid query parameters",
      "query",
    );
    const locale = resolveLocale(request.headers.get("Accept-Language"));
    return paginatedResponse(await propertyService.list(query, locale), locale);
  });
}
