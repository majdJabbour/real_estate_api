import { beforeEach, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/favorites/route";
import { DELETE, PUT } from "@/app/api/v1/favorites/[propertyId]/route";
import { DELETE as removeIds, GET as getIds, PUT as addIds } from "@/app/api/v1/favorites/ids/route";
import { ApiError } from "@/core/errors/api-error";
import type { TokenVerifier } from "@/features/authentication/domain/token-verifier";
import type { FavoritesRepository } from "@/features/favorites/domain/favorites.repository";
import { propertyRepository } from "@/features/properties/property-composition";

const { verify, list, listIds, add, remove } = vi.hoisted(() => ({
  verify: vi.fn<TokenVerifier["verify"]>(),
  list: vi.fn<FavoritesRepository["list"]>(),
  listIds: vi.fn<FavoritesRepository["listIds"]>(),
  add: vi.fn<FavoritesRepository["add"]>(),
  remove: vi.fn<FavoritesRepository["remove"]>(),
}));

vi.mock("@/features/authentication/authentication-composition", async () => {
  const { AuthenticationService } = await import("@/features/authentication/application/authentication.service");
  return { authenticationService: new AuthenticationService({ verify }) };
});
vi.mock("@/features/favorites/favorites-composition", async () => {
  const { FavoritesService } = await import("@/features/favorites/application/favorites.service");
  const { propertyRepository } = await import("@/features/properties/property-composition");
  return { favoritesService: new FavoritesService({ list, listIds, add, remove }, propertyRepository) };
});

const route = "http://localhost/api/v1/favorites";
const identity = { id: "verified-user", email: null, name: null, avatar: null };

beforeEach(() => {
  vi.resetAllMocks();
  verify.mockResolvedValue(identity);
  list.mockResolvedValue([]);
  listIds.mockResolvedValue([]);
});

function listing(query = "", locale = "en", authorization = "Bearer fake.token.value") {
  return GET(new Request(route + query, { headers: { Authorization: authorization, "Accept-Language": locale } }));
}

function change(handler: typeof PUT, propertyId: string, authorization = "Bearer fake.token.value") {
  return handler(new Request(route + "/ignored?id=untrusted-user", {
    method: handler === PUT ? "PUT" : "DELETE",
    headers: { Authorization: authorization },
  }), { params: Promise.resolve({ propertyId }) });
}

function expectPrivate(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
}

function idsRequest(query = "", authorization = "Bearer fake.token.value", method = "GET") {
  return new Request(route + "/ids" + query, {
    method,
    headers: { Authorization: authorization, "Accept-Language": "ar" },
  });
}

it("returns an empty non-localized private favorite ID array", async () => {
  const response = await getIds(idsRequest());
  expectPrivate(response, 200);
  expect(response.headers.get("Content-Language")).toBeNull();
  expect(response.headers.get("Vary")).toBeNull();
  expect(await response.json()).toEqual({ success: true, data: [] });
  expect(verify).toHaveBeenCalledExactlyOnceWith("fake.token.value");
  expect(listIds).toHaveBeenCalledExactlyOnceWith(identity.id);
});

it("scopes, sorts and deduplicates IDs without resolving summaries or details", async () => {
  const findById = vi.spyOn(propertyRepository, "findById");
  const summaries = vi.spyOn(propertyRepository, "findSummariesByIds");
  const otherUser = { ...identity, id: "other-user" };
  verify.mockImplementation(async (token) => token === "other.token.value" ? otherUser : identity);
  listIds.mockImplementation(async (uid) => uid === identity.id
    ? ["rental-005", "removed-listing", "rental-001", "rental-005"]
    : ["rental-003"]);

  try {
    const [first, second] = await Promise.all([
      getIds(idsRequest()),
      getIds(idsRequest("", "Bearer other.token.value")),
    ]);
    expectPrivate(first, 200);
    expectPrivate(second, 200);
    expect(await first.json()).toEqual({ success: true, data: ["removed-listing", "rental-001", "rental-005"] });
    expect(await second.json()).toEqual({ success: true, data: ["rental-003"] });
    expect(listIds.mock.calls).toEqual([[identity.id], [otherUser.id]]);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(list).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
    expect(summaries).not.toHaveBeenCalled();
  } finally {
    findById.mockRestore();
    summaries.mockRestore();
  }
});

it("rejects unauthenticated, invalid-token and query override requests before reading IDs", async () => {
  const missing = await getIds(new Request(route + "/ids"));
  expectPrivate(missing, 401);
  expect((await missing.json()).error.code).toBe("UNAUTHORIZED");
  verify.mockRejectedValueOnce(new ApiError("UNAUTHORIZED", "Invalid or missing Firebase ID token"));
  const invalid = await getIds(idsRequest());
  expectPrivate(invalid, 401);
  expect(invalid.headers.get("WWW-Authenticate")).toBe("Bearer");
  expect((await invalid.json()).error.code).toBe("UNAUTHORIZED");
  const query = await getIds(idsRequest("?uid=other-user"));
  expectPrivate(query, 400);
  expect(await query.json()).toEqual({
    success: false,
    error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details: [
      { field: "query", message: "Unknown query parameter" },
    ] },
  });
  expect(listIds).not.toHaveBeenCalled();
});

it("preserves sanitized unavailable and unexpected error responses for IDs", async () => {
  listIds.mockRejectedValueOnce(new ApiError("SERVICE_UNAVAILABLE", "Favorites service unavailable"));
  const unavailable = await getIds(idsRequest());
  expectPrivate(unavailable, 503);
  expect(await unavailable.json()).toEqual({
    success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Favorites service unavailable" },
  });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    listIds.mockRejectedValueOnce(new Error("private document path"));
    const unexpected = await getIds(idsRequest());
    expectPrivate(unexpected, 500);
    expect(await unexpected.json()).toEqual({
      success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
    });
    expect(log).toHaveBeenCalledExactlyOnceWith("Unexpected API request failure");
  } finally {
    log.mockRestore();
  }
});

it("retains PUT and DELETE semantics when the property ID is ids", async () => {
  const put = await addIds(idsRequest("", undefined, "PUT"));
  expectPrivate(put, 404);
  expect((await put.json()).error.code).toBe("PROPERTY_NOT_FOUND");
  const deleted = await removeIds(idsRequest("", undefined, "DELETE"));
  expectPrivate(deleted, 200);
  expect(await deleted.json()).toEqual({ success: true, data: { propertyId: "ids", isFavorite: false } });
  expect(remove).toHaveBeenCalledExactlyOnceWith(identity.id, "ids");
  expect(listIds).not.toHaveBeenCalled();
});

it("returns an empty private list with default pagination", async () => {
  const response = await listing();
  expectPrivate(response, 200);
  expect(await response.json()).toEqual({
    success: true, data: [], pagination: {
      page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false,
    },
  });
  expect(list).toHaveBeenCalledExactlyOnceWith(identity.id);
});

it("batch joins ordered references, excludes orphans before pagination, and localizes summaries", async () => {
  const references = ["removed-1", "rental-001", "removed-2", "rental-002"];
  list.mockResolvedValue(references);
  const batch = vi.spyOn(propertyRepository, "findSummariesByIds");
  try {
    const response = await listing("?page=2&limit=1", "ar-SY");
    const english = await listing("?page=2&limit=1");
    expectPrivate(response, 200);
    expect(response.headers.get("Content-Language")).toBe("ar");
    expect(response.headers.get("Vary")).toBe("Accept-Language");
    expect(english.headers.get("Content-Language")).toBe("en");
    const ar = await response.json();
    const en = await english.json();
    expect(ar.pagination).toEqual({
      page: 2, limit: 1, total: 2, totalPages: 2, hasNextPage: false, hasPreviousPage: true,
    });
    expect(ar.data).toEqual([{
      ...en.data[0], title: expect.stringMatching(/\p{Script=Arabic}/u), address: expect.stringMatching(/\p{Script=Arabic}/u),
    }]);
    expect(ar.data[0].id).toBe("rental-002");
    expect(ar.data[0]).not.toHaveProperty("description");
    expect(ar.data[0]).not.toHaveProperty("createdAt");
    expect(batch).toHaveBeenCalledTimes(2);
    expect(batch).toHaveBeenCalledWith(references);
  } finally {
    batch.mockRestore();
  }
});

it.each(["?page=0", "?limit=101", "?page=1&page=2", "?uid=untrusted-user"])(
  "rejects invalid or unknown listing query parameters",
  async (query) => {
    const response = await listing(query);
    expectPrivate(response, 400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(list).not.toHaveBeenCalled();
  },
);

it("uses the verified UID for PUT, verifying the token once", async () => {
  const response = await change(PUT, "rental-001");
  expectPrivate(response, 200);
  expect(await response.json()).toEqual({ success: true, data: { propertyId: "rental-001", isFavorite: true } });
  expect(verify).toHaveBeenCalledExactlyOnceWith("fake.token.value");
  expect(add).toHaveBeenCalledExactlyOnceWith(identity.id, "rental-001");
});

it.each([["path/segment", 400], ["__reserved__", 400], ["missing", 404]] as const)(
  "does not write a favorite for an invalid or missing property",
  async (id, status) => {
    const response = await change(PUT, id);
    expectPrivate(response, status);
    expect((await response.json()).error.code).toBe(status === 400 ? "VALIDATION_ERROR" : "PROPERTY_NOT_FOUND");
    expect(add).not.toHaveBeenCalled();
  },
);

it("allows repeated DELETE for orphaned references", async () => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await change(DELETE, "removed");
    expectPrivate(response, 200);
    expect(await response.json()).toEqual({ success: true, data: { propertyId: "removed", isFavorite: false } });
  }
  expect(remove.mock.calls).toEqual([[identity.id, "removed"], [identity.id, "removed"]]);
});

it("returns 401 for missing and invalid credentials before any storage access", async () => {
  const missing = await GET(new Request(route));
  verify.mockRejectedValueOnce(new ApiError("UNAUTHORIZED", "Invalid or missing Firebase ID token"));
  const invalid = await change(DELETE, "rental-001");
  for (const response of [missing, invalid]) {
    expectPrivate(response, 401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  }
  expect(list).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

it("keeps unavailable and unexpected errors private and sanitized", async () => {
  list.mockRejectedValueOnce(new ApiError("SERVICE_UNAVAILABLE", "Favorites service unavailable"));
  const unavailable = await listing();
  expectPrivate(unavailable, 503);
  expect(await unavailable.json()).toEqual({
    success: false, error: { code: "SERVICE_UNAVAILABLE", message: "Favorites service unavailable" },
  });

  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    list.mockRejectedValueOnce(new Error("private internal marker"));
    const unexpected = await listing();
    expectPrivate(unexpected, 500);
    expect(await unexpected.json()).toEqual({
      success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
    });
    expect(log).toHaveBeenCalledExactlyOnceWith("Unexpected API request failure");
  } finally {
    log.mockRestore();
  }
});
