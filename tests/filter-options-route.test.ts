import { expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/properties/filter-options/route";
import { PropertyService } from "@/features/properties/application/property.service";
import { JsonPropertyRepository } from "@/features/properties/infrastructure/json-property.repository";
import { propertyService } from "@/features/properties/property-composition";

const url = "http://localhost:3000/api/v1/properties/filter-options";
const ids = ["apartment", "townhome", "house", "condo", "duplex", "studio"];

it.each([
  ["en", ["Apartment", "Townhome", "House", "Condo", "Duplex", "Studio"]],
  ["ar", ["شقة", "منزل متلاصق", "منزل مستقل", "شقة تمليك", "دوبلكس", "استوديو"]],
])("returns global bounds and type labels in %s", async (locale, labels) => {
  const response = await GET(new Request(url, { headers: { "Accept-Language": locale } }));
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Content-Language")).toBe(locale);
  expect(response.headers.get("Vary")).toBe("Accept-Language");

  const body = await response.json();
  const counts = [2, 1, 2, 2, 0, 2, 0, 4, 3, 4, 1, 2, 2, 1, 1, 1, 1, 0, 0, 1];
  const histogram = counts.map((count, index) => ({
    from: 975 + 163.75 * index,
    to: 975 + 163.75 * (index + 1),
    count,
  }));
  expect(body).toEqual({
    success: true,
    data: {
      price: { min: 975, max: 4250, currency: "USD", pricingPeriod: "month", histogram },
      area: { min: 26, max: 238, unit: "sqm" },
      bedrooms: { min: 0, max: 5 },
      bathrooms: { min: 1, max: 4 },
      types: ids.map((id, index) => ({ id, label: labels[index] })),
    },
  });
});

it("maintains contract units and returns null bounds for an empty repository", async () => {
  const service = new PropertyService(new JsonPropertyRepository([]));
  await expect(service.getFilterOptions()).resolves.toEqual({
    price: { min: null, max: null, currency: "USD", pricingPeriod: "month", histogram: [] },
    area: { min: null, max: null, unit: "sqm" },
    bedrooms: { min: null, max: null },
    bathrooms: { min: null, max: null },
    types: [],
  });
});

it("rejects query parameters with a structured 400 response", async () => {
  const response = await GET(new Request(url + "?types=apartment"));
  expect(response.status).toBe(400);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid query parameters",
      details: [{ field: "query", message: "Query parameters are not accepted" }],
    },
  });
});

it("sanitizes an unexpected repository failure", async () => {
  const repository = new JsonPropertyRepository();
  vi.spyOn(repository, "aggregateFilters").mockRejectedValueOnce(new Error("private-path"));
  const service = vi.spyOn(propertyService, "getFilterOptions")
    .mockImplementationOnce((locale) => new PropertyService(repository).getFilterOptions(locale));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    const response = await GET(new Request(url));
    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
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
