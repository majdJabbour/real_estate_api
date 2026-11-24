import { resolveLocale } from "@/core/http/accept-language";
import { handleApiRequest, parseInput } from "@/core/http/api-error";
import { paginatedResponse } from "@/core/http/api-response";
import { pageQuerySchema } from "@/core/pagination";
import { authenticationService } from "@/features/authentication/authentication-composition";
import { favoritesService } from "@/features/favorites/favorites-composition";

export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return handleApiRequest(async () => {
    const user = await authenticationService.authenticate(request.headers.get("Authorization"));
    const query = parseInput(
      pageQuerySchema, new URL(request.url).searchParams, "Invalid query parameters", "query",
    );
    const locale = resolveLocale(request.headers.get("Accept-Language"));
    return paginatedResponse(await favoritesService.list(user.id, query, locale), locale);
  }, { privateResponse: true });
}
