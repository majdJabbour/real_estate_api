import { handleApiRequest } from "@/core/http/api-error";
import { successResponse } from "@/core/http/api-response";
import { authenticationService } from "@/features/authentication/authentication-composition";
import { favoritesService } from "@/features/favorites/favorites-composition";

export function mutateFavorite(
  request: Request,
  resolvePropertyId: () => string | Promise<string>,
  operation: "add" | "remove",
): Promise<Response> {
  return handleApiRequest(async () => {
    const { id } = await authenticationService.authenticate(request.headers.get("Authorization"));
    const propertyId = await resolvePropertyId();
    return successResponse(await favoritesService[operation](id, propertyId));
  }, { privateResponse: true });
}
