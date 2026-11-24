import { handleApiRequest } from "@/core/http/api-error";
import { successResponse } from "@/core/http/api-response";
import { authenticationService } from "@/features/authentication/authentication-composition";
import { favoritesService } from "@/features/favorites/favorites-composition";

export const runtime = "nodejs";

type Context = RouteContext<"/api/v1/favorites/[propertyId]">;

function updateFavorite(request: Request, { params }: Context, add: boolean): Promise<Response> {
  return handleApiRequest(async () => {
    const { id } = await authenticationService.authenticate(request.headers.get("Authorization"));
    const { propertyId } = await params;
    const result = add
      ? await favoritesService.add(id, propertyId)
      : await favoritesService.remove(id, propertyId);
    return successResponse(result);
  }, { privateResponse: true });
}

export function PUT(request: Request, context: Context): Promise<Response> {
  return updateFavorite(request, context, true);
}

export function DELETE(request: Request, context: Context): Promise<Response> {
  return updateFavorite(request, context, false);
}
