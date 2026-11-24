import { describe, expect, it, vi } from "vitest";

import rawProperties from "@/data/properties.normalized.json";
import { PropertyService } from "@/features/properties/application/property.service";
import { propertyQuerySchema } from "@/features/properties/domain/property-query.schema";
import type { PropertyRepository } from "@/features/properties/domain/property.repository";
import { propertySchema } from "@/features/properties/domain/property.schema";
import { JsonPropertyRepository } from "@/features/properties/infrastructure/json-property.repository";

const property = propertySchema.parse(rawProperties[0]);

function parse(query = "") {
  return propertyQuerySchema.parse(new URLSearchParams(query));
}

describe("property service", () => {
  it("delegates validated queries to a substitute repository and maps its result", async () => {
    const summarySource = {
      id: property.id,
      title: property.title,
      address: property.address,
      type: property.type,
      price: property.price,
      currency: property.currency,
      pricingPeriod: property.pricingPeriod,
      rating: property.rating,
      thumbnail: property.thumbnail,
      isFeatured: property.isFeatured,
    };
    const list = vi.fn<PropertyRepository["list"]>().mockResolvedValue({
      properties: [summarySource],
      total: 3,
    });
    const repository: PropertyRepository = {
      list,
      findById: vi.fn<PropertyRepository["findById"]>().mockResolvedValue(property),
      findSummariesByIds: vi.fn<PropertyRepository["findSummariesByIds"]>(),
      aggregateFilters: vi.fn<PropertyRepository["aggregateFilters"]>(),
    };
    const service = new PropertyService(repository);
    const query = parse("search=Sunlit&limit=2&page=2");
    const result = await service.list(query, "ar");

    expect(list).toHaveBeenCalledExactlyOnceWith(query);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: property.id, title: property.title.ar });
    expect(result.data[0]).not.toHaveProperty("description");
    expect(result.pagination).toEqual({
      page: 2, limit: 2, total: 3, totalPages: 2, hasNextPage: false, hasPreviousPage: true,
    });

    await expect(service.findById(property.id, "ar")).resolves.toMatchObject({
      id: property.id,
      title: property.title.ar,
      description: property.description.ar,
    });
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(property.id);
  });

  it("searches both languages independently of the requested DTO language", async () => {
    const service = new PropertyService(new JsonPropertyRepository([property]));
    const arabic = await service.list(parse("search=sunlit"), "ar");
    const englishSearch = new URLSearchParams({ search: "شقة مشمسة" });
    const english = await service.list(propertyQuerySchema.parse(englishSearch));

    expect(arabic.data.map(({ title }) => title)).toEqual([property.title.ar]);
    expect(english.data.map(({ title }) => title)).toEqual([property.title.en]);
    await expect(service.findById(property.id)).resolves.toMatchObject({ title: property.title.en });
    await expect(service.findById("missing")).resolves.toBeNull();
  });

  it.each([
    { page: 1, total: 3, ids: ["rental-001", "rental-002"], next: true, previous: false },
    { page: 2, total: 3, ids: ["rental-003"], next: false, previous: true },
    { page: 3, total: 3, ids: [], next: false, previous: true },
    { page: 7, total: 0, ids: [], next: false, previous: false },
  ])("preserves pagination metadata for page $page with $total matches", async (expected) => {
    const service = new PropertyService(new JsonPropertyRepository(rawProperties.slice(0, 3)));
    const params = new URLSearchParams({
      page: String(expected.page),
      limit: "2",
      sortBy: "createdAt",
      sortOrder: "asc",
    });
    if (expected.total === 0) {
      params.set("search", "no listing matches this");
    }
    const result = await service.list(propertyQuerySchema.parse(params));

    expect(result.data.map(({ id }) => id)).toEqual(expected.ids);
    expect(result.pagination).toEqual({
      page: expected.page,
      limit: 2,
      total: expected.total,
      totalPages: expected.total === 0 ? 0 : 2,
      hasNextPage: expected.next,
      hasPreviousPage: expected.previous,
    });
  });
});
