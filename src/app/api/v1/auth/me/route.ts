import { handleApiRequest } from "@/core/http/api-error";
import { successResponse } from "@/core/http/api-response";
import { authenticationService } from "@/features/authentication/authentication-composition";

export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return handleApiRequest(async () => {
    const user = await authenticationService.authenticate(request.headers.get("Authorization"));
    return successResponse(user);
  }, { privateResponse: true });
}
