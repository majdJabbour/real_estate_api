import { z } from "zod";

import { mutateFavorite } from "@/app/api/v1/favorites/mutate-favorite";
import { handleApiRequest, parseInput } from "@/core/http/api-error";
import { successResponse } from "@/core/http/api-response";
import { queryFromSearchParams } from "@/core/pagination";
import { authenticationService } from "@/features/authentication/authentication-composition";
import { favoritesService } from "@/features/favorites/favorites-composition";

export const runtime = "nodejs";

const emptyQuerySchema = queryFromSearchParams(z.strictObject({}));

export function GET(request: Request): Promise<Response> {
  return handleApiRequest(async () => {
    const { id } = await authenticationService.authenticate(request.headers.get("Authorization"));
    parseInput(emptyQuerySchema, new URL(request.url).searchParams, "Invalid query parameters", "query");
    return successResponse(await favoritesService.listIds(id));
  }, { privateResponse: true });
}

// Next.js gives this static segment precedence even for mutation methods.
export function PUT(request: Request): Promise<Response> {
  return mutateFavorite(request, () => "ids", "add");
}

export function DELETE(request: Request): Promise<Response> {
  return mutateFavorite(request, () => "ids", "remove");
}
