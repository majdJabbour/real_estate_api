import { mutateFavorite } from "@/app/api/v1/favorites/mutate-favorite";

export const runtime = "nodejs";

type Context = RouteContext<"/api/v1/favorites/[propertyId]">;

export function PUT(request: Request, { params }: Context): Promise<Response> {
  return mutateFavorite(request, async () => (await params).propertyId, "add");
}

export function DELETE(request: Request, { params }: Context): Promise<Response> {
  return mutateFavorite(request, async () => (await params).propertyId, "remove");
}
