import { describe, expect, it, vi } from "vitest";

import { GET as getHealth } from "@/app/api/v1/health/route";
import { GET as getProperty } from "@/app/api/v1/properties/[id]/route";
import { GET as getProperties } from "@/app/api/v1/properties/route";
import {
  propertyDetailsSchema,
  propertySummarySchema,
} from "@/features/properties/domain/property.schema";
import { propertyService } from "@/features/properties/property-composition";

const api = "http://localhost:3000/api/v1";

function list(query = "", language?: string) {
  return getProperties(new Request(`${api}/properties?${query}`, {
    headers: language === undefined ? undefined : { "Accept-Language": language },
  }));
}

function details(id: string, language?: string) {
  return getProperty(new Request(`${api}/properties/${encodeURIComponent(id)}`, {
    headers: language === undefined ? undefined : { "Accept-Language": language },
  }), { params: Promise.resolve({ id }) });
}

function expectNoStoreJson(response: Response) {
  expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
}

function expectLocalized(response: Response, locale: string) {
  expectNoStoreJson(response);
  expect(response.headers.get("Content-Language")).toBe(locale);
  expect(response.headers.get("Vary")).toBe("Accept-Language");
}

describe("GET /api/v1/health", () => {
  it("returns the liveness response with no infrastructure metadata", async () => {
    const response = getHealth();
    expect(response.status).toBe(200);
    expectNoStoreJson(response);
    expect(response.headers.get("Content-Language")).toBeNull();
    expect(response.headers.get("Vary")).toBeNull();
    expect(await response.json()).toEqual({ success: true, data: { status: "ok" } });
  });
});

describe("GET /api/v1/properties", () => {
  it("uses default pagination and returns summary DTOs only", async () => {
    const response = await list();
    expect(response.status).toBe(200);
    expectLocalized(response, "en");

    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["data", "pagination", "success"]);
    expect(body.success).toBe(true);
    expect(body.pagination).toEqual({
      page: 1, limit: 20, total: 30, totalPages: 2,
      hasNextPage: true, hasPreviousPage: false,
    });
    expect(propertySummarySchema.array().parse(body.data)).toHaveLength(20);
  });

  it("combines types with numeric and featured filters and paginates the matches", async () => {
    const response = await list(
      "types=apartment,condo&minBedrooms=2&maxPrice=3000&featured=false&sortBy=price&sortOrder=asc&limit=2&page=2",
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(propertySummarySchema.array().parse(body.data).map(({ id }) => id))
      .toEqual(["rental-004", "rental-019"]);
    expect(body.pagination).toEqual({
      page: 2, limit: 2, total: 4, totalPages: 2,
      hasNextPage: false, hasPreviousPage: true,
    });
  });

  it("returns an empty page with correct metadata for a search with no matches", async () => {
    const response = await list("search=never-listed&page=7&limit=5", "ar");
    expect(response.status).toBe(200);
    expectLocalized(response, "ar");
    expect(await response.json()).toEqual({
      success: true,
      data: [],
      pagination: {
        page: 7, limit: 5, total: 0, totalPages: 0,
        hasNextPage: false, hasPreviousPage: false,
      },
    });
  });

  it.each([
    ["minPrice=3000&maxPrice=1000", "minPrice", "Must be less than or equal to maxPrice"],
    ["page=1&page=2", "page", "Query parameter must occur only once"],
    ["private-input=secret-token", "query", "Unknown query parameter"],
    ["private-input=1&private-input=2", "query", "Unknown query parameter"],
  ])("returns safe structured validation details for %s", async (query, field, message) => {
    const response = await list(query, "ar");
    expect(response.status).toBe(400);
    expectNoStoreJson(response);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: expect.arrayContaining([{ field, message }]),
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/private-input|secret-token/);
  });

  it("rejects invalid booleans and preserves multiple field issues", async () => {
    const response = await list("featured=yes&limit=0");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual([
      { field: "featured", message: expect.any(String) },
      { field: "limit", message: expect.any(String) },
    ]);
  });

  it("searches across locales independently of the selected response language", async () => {
    const arabic = await list("search=Sunlit", "fr, ar-SY;q=0.8, en;q=0.6");
    const english = await list(new URLSearchParams({ search: "شقة مشمسة" }).toString(), "en-GB");
    expect(arabic.status).toBe(200);
    expect(english.status).toBe(200);
    expectLocalized(arabic, "ar");
    expectLocalized(english, "en");

    const englishProperties = propertySummarySchema.array().parse((await english.json()).data);
    const arabicProperties = propertySummarySchema.array().parse((await arabic.json()).data);
    expect(englishProperties.map(({ id, title }) => ({ id, title })))
      .toEqual([{ id: "rental-001", title: "Sunlit Courtyard Apartment" }]);
    expect(arabicProperties).toEqual([{
      ...englishProperties[0],
      title: "شقة مشمسة تطل على فناء",
      address: "لينكولن سكوير، شيكاغو، إلينوي",
    }]);
  });

  it("sanitizes unexpected exceptions in the response and server log", async () => {
    const service = vi.spyOn(propertyService, "list")
      .mockRejectedValueOnce(new Error("service-secret /private/path"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await list("search=private-search", "ar");
      expect(response.status).toBe(500);
      expectNoStoreJson(response);
      expect(await response.json()).toEqual({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
      });
      expect(log).toHaveBeenCalledExactlyOnceWith("Unexpected API request failure");
    } finally {
      service.mockRestore();
      log.mockRestore();
    }
  });
});

describe("GET /api/v1/properties/:id", () => {
  it("maps complete localized details and preserves stable fields", async () => {
    const arabic = await details("rental-001", "ar-SY");
    const english = await details("rental-001", "fr-CA");
    expect(arabic.status).toBe(200);
    expect(english.status).toBe(200);
    expectLocalized(arabic, "ar");
    expectLocalized(english, "en");

    const arabicBody = await arabic.json();
    const englishBody = await english.json();
    expect(Object.keys(arabicBody).sort()).toEqual(["data", "success"]);
    expect(arabicBody.success).toBe(true);
    expect(englishBody.success).toBe(true);
    const arabicProperty = propertyDetailsSchema.parse(arabicBody.data);
    const englishProperty = propertyDetailsSchema.parse(englishBody.data);
    expect(englishProperty).toMatchObject({
      id: "rental-001",
      title: "Sunlit Courtyard Apartment",
      type: "apartment",
      price: 1850,
      agent: { id: "agent-chicago", avatar: null },
    });
    expect(arabicProperty.description).toMatch(/\p{Script=Arabic}/u);
    expect(arabicProperty.reviews[0].comment).toMatch(/\p{Script=Arabic}/u);
    expect(arabicProperty.reviews[0].reviewerName).toBe(englishProperty.reviews[0].reviewerName);
    expect(arabicProperty).toEqual({
      ...englishProperty,
      title: "شقة مشمسة تطل على فناء",
      address: "لينكولن سكوير، شيكاغو، إلينوي",
      description: arabicProperty.description,
      reviews: englishProperty.reviews.map((review, index) => ({
        ...review,
        comment: arabicProperty.reviews[index].comment,
      })),
    });
  });

  it.each(["unknown-property", "listing._~-x", "x".repeat(128)])(
    "returns a 404 for valid but unknown ID %j",
    async (id) => {
      const response = await details(id, "ar");
      expect(response.status).toBe(404);
      expectNoStoreJson(response);
      expect(await response.json()).toEqual({
        success: false, error: { code: "PROPERTY_NOT_FOUND", message: "Property not found" },
      });
    },
  );

  it.each(["", ".", "..", "with space", "part/part", "part\\part", "x".repeat(129)])(
    "returns a 400 for invalid ID %j",
    async (id) => {
      const response = await details(id);
      expect(response.status).toBe(400);
      expectNoStoreJson(response);
      expect(await response.json()).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid property ID",
          details: [{ field: "id", message: expect.any(String) }],
        },
      });
    },
  );
});
