import { resolveLocale } from "@/core/http/accept-language";
import { ApiError, handleApiRequest, parseInput } from "@/core/http/api-error";
import { successResponse } from "@/core/http/api-response";
import { propertyIdSchema } from "@/features/properties/domain/property-id.schema";
import { propertyService } from "@/features/properties/property-composition";

export function GET(
  request: Request,
  { params }: RouteContext<"/api/v1/properties/[id]">,
): Promise<Response> {
  return handleApiRequest(async () => {
    const id = parseInput(propertyIdSchema, (await params).id, "Invalid property ID", "id");
    const locale = resolveLocale(request.headers.get("Accept-Language"));
    const property = await propertyService.findById(id, locale);
    if (property === null) {
      throw new ApiError("PROPERTY_NOT_FOUND", "Property not found");
    }
    return successResponse(property, locale);
  });
}
