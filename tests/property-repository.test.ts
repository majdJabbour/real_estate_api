import { describe, expect, it } from "vitest";

import rawProperties from "@/data/properties.normalized.json";
import { propertyQuerySchema } from "@/features/properties/domain/property-query.schema";
import { JsonPropertyRepository } from "@/features/properties/infrastructure/json-property.repository";

const sample = {
  ...rawProperties[0],
  title: { en: "Maple Walk" },
  address: { en: "North Park" },
  description: { en: "Updated home" },
};
const alpha = {
  ...sample,
  id: "alpha",
  type: "apartment",
  title: { en: "Sunlit Loft", ar: "شُقَّة أَنِيقَة" },
  address: { en: "Juniper Lane", ar: "شارع النَّخِيل" },
  description: { en: "Tall windows beside a courtyard", ar: "نوافذ واسعة قرب الساحة" },
  price: 1000, area: 55, bedrooms: 1, bathrooms: 1, rating: 4.5,
  isFeatured: false, createdAt: "2025-01-10T09:00:00Z",
};
const bravo = {
  ...sample, id: "bravo", type: "condo", title: { en: "Terrace Condo" },
  price: 1400, area: 70, bedrooms: 2, bathrooms: 2, rating: 4.5,
  isFeatured: true, createdAt: "2025-01-10T09:00:00.00010Z",
};
const charlie = {
  ...sample, id: "charlie", type: "house",
  price: 1400, area: 90, bedrooms: 3, bathrooms: 2, rating: 4.8,
  isFeatured: false, createdAt: "2025-01-10T09:00:00.0002Z",
};
const delta = {
  ...sample, id: "delta", type: "apartment", title: { en: "Terrace Flat" },
  price: 1800, area: 90, bedrooms: 2, bathrooms: 1, rating: 4.1,
  isFeatured: true, createdAt: "2025-01-10T09:00:00.000Z",
};
const echo = {
  ...sample, id: "echo", type: "studio",
  price: 800, area: 31, bedrooms: 0, bathrooms: 0, rating: 4.1,
  isFeatured: false, createdAt: "2025-01-09T10:00:00Z",
};
const repository = new JsonPropertyRepository([delta, charlie, echo, bravo, alpha]);

function parse(query = "") {
  return propertyQuerySchema.parse(new URLSearchParams(query));
}

async function ids(query: string) {
  const { properties } = await repository.list(parse(query));
  return properties.map(({ id }) => id);
}

describe("JSON property repository search", () => {
  it.each([
    "  SUNLIT   lof  ",
    "juniper LA",
    "TALL windows",
    "شقة اـنيقة",
    "النَّخيل",
    "وَاسِعَة قرب",
  ])("matches %s within the English or Arabic title, address, or description", async (search) => {
    expect(await ids(new URLSearchParams({ search }).toString())).toEqual(["alpha"]);
  });

  it("matches within a field and preserves substring semantics", async () => {
    expect(await ids("search=lit")).toEqual(["alpha"]);
    expect(await ids("search=loft+juniper")).toEqual([]);
    expect(await ids("search=sunlit+lift")).toEqual([]);
    expect(await ids("search=Maya+Kattan")).toEqual([]);
  });

  it("treats empty, whitespace-only, and fully normalized-away search alike", async () => {
    expect(await ids("search=+%09")).toEqual(await ids(""));
    expect(await ids(new URLSearchParams({ search: "ـَ" }).toString())).toEqual(await ids(""));
  });
});

describe("JSON property repository filtering", () => {
  it.each([
    ["types=apartment", ["alpha", "delta"]],
    ["types=condo,studio", ["echo", "bravo"]],
    ["minPrice=1400&maxPrice=1400", ["bravo", "charlie"]],
    ["minArea=70&maxArea=90", ["bravo", "charlie", "delta"]],
    ["minArea=90&maxArea=90", ["charlie", "delta"]],
    ["minBedrooms=2&minBathrooms=2", ["bravo", "charlie"]],
    ["minBedrooms=0&minBathrooms=0", ["echo", "alpha", "bravo", "charlie", "delta"]],
    ["featured=true", ["bravo", "delta"]],
    ["featured=false", ["echo", "alpha", "charlie"]],
    [
      "search=terrace&types=condo,house&minPrice=1400&maxPrice=1400&minArea=70" +
      "&maxArea=90&minBedrooms=2&minBathrooms=2&featured=true",
      ["bravo"],
    ],
    ["types=studio&featured=true", []],
  ])("applies %s", async (query, expected) => {
    expect(await ids(query + "&sortBy=price&sortOrder=asc")).toEqual(expected);
  });
});

describe("JSON property repository sorting and pagination", () => {
  it.each([
    ["", ["charlie", "bravo", "alpha", "delta", "echo"]],
    ["sortBy=createdAt&sortOrder=asc", ["echo", "alpha", "delta", "bravo", "charlie"]],
    ["sortBy=price&sortOrder=asc", ["echo", "alpha", "bravo", "charlie", "delta"]],
    ["sortBy=price&sortOrder=desc", ["delta", "bravo", "charlie", "alpha", "echo"]],
    ["sortBy=rating&sortOrder=desc", ["charlie", "alpha", "bravo", "delta", "echo"]],
    ["sortBy=area&sortOrder=asc", ["echo", "alpha", "bravo", "charlie", "delta"]],
  ])("sorts %s with ascending IDs as the tie-breaker", async (query, expected) => {
    expect(await ids(query)).toEqual(expected);
  });

  it.each([
    [1, ["alpha", "bravo"]],
    [2, ["charlie"]],
    [3, []],
  ])("counts all matches and returns the correct slice for page %i", async (page, expected) => {
    const result = await repository.list(parse(
      `types=apartment,condo,house&maxPrice=1400&sortBy=price&sortOrder=asc&limit=2&page=${page}`,
    ));
    expect(result.total).toBe(3);
    expect(result.properties.map(({ id }) => id)).toEqual(expected);
  });

  it("returns zero totals for empty datasets and empty matches", async () => {
    await expect(new JsonPropertyRepository([]).list(parse("page=1000000")))
      .resolves.toEqual({ properties: [], total: 0 });
    await expect(repository.list(parse("search=never-listed")))
      .resolves.toEqual({ properties: [], total: 0 });
  });
});

describe("JSON property repository integrity", () => {
  it("uses the bundled dataset and looks up an exact ID", async () => {
    const bundled = new JsonPropertyRepository();
    await expect(bundled.findById("rental-001")).resolves.toEqual(rawProperties[0]);
    await expect(bundled.findById("RENTAL-001")).resolves.toBeNull();
    await expect(bundled.list(parse())).resolves.toMatchObject({ total: 30 });
  });

  it("rejects invalid or duplicate injected data", () => {
    expect(() => new JsonPropertyRepository([alpha, alpha])).toThrow("Duplicate property ID");
    expect(() => new JsonPropertyRepository([{ ...alpha, price: 0 }])).toThrow();
  });

  it("preserves source order and content and reuses frozen records across reads", async () => {
    const source = structuredClone([bravo, alpha]);
    const before = structuredClone(source);
    const injected = new JsonPropertyRepository(source);
    const result = await injected.list(parse("sortBy=price&sortOrder=asc"));
    const property = await injected.findById("alpha");

    expect(result.properties[0]).toBe(property);
    expect(result.properties.map(({ id }) => id)).toEqual(["alpha", "bravo"]);
    if (property === null) throw new Error("Expected alpha in the injected dataset");
    expect(Reflect.set(property, "price", 1)).toBe(false);
    expect(Reflect.set(property.title, "en", "Edited")).toBe(false);
    expect(Reflect.set(property.reviews[0].comment, "en", "Edited")).toBe(false);
    expect(Object.isFrozen(property.images)).toBe(true);
    expect(source).toEqual(before);
    expect(Object.isFrozen(source[1].title)).toBe(false);
    source[1].price = 1;
    expect(property.price).toBe(1000);
  });

  it("aggregates global bounds and present types in enum order", async () => {
    await repository.list(parse("featured=true&limit=1"));
    await expect(repository.aggregateFilters()).resolves.toEqual({
      types: ["apartment", "house", "condo", "studio"],
      price: { min: 800, max: 1800, histogram: expect.any(Array) },
      area: { min: 31, max: 90 },
      bedrooms: { min: 0, max: 3 },
      bathrooms: { min: 0, max: 2 },
    });
  });

  it("aggregates null bounds for an empty dataset", async () => {
    await expect(new JsonPropertyRepository([]).aggregateFilters()).resolves.toEqual({
      types: [],
      price: { min: null, max: null, histogram: [] },
      area: { min: null, max: null },
      bedrooms: { min: null, max: null },
      bathrooms: { min: null, max: null },
    });
  });

  it("reuses a frozen aggregation without changing the source records", async () => {
    const source = structuredClone([bravo, alpha]);
    const original = structuredClone(source);
    const injected = new JsonPropertyRepository(source);
    const filters = await injected.aggregateFilters();

    expect(source).toEqual(original);
    expect(Object.isFrozen(source[0])).toBe(false);
    expect(Reflect.set(filters.area, "min", 1)).toBe(false);
    expect(Reflect.set(filters.types, "0", "studio")).toBe(false);
    expect(Reflect.set(filters.price.histogram, "0", null)).toBe(false);
    expect(Reflect.set(filters.price.histogram[0], "count", 999)).toBe(false);
    expect(await injected.aggregateFilters()).toBe(filters);
    expect(filters.price.histogram.reduce((total, bucket) => total + bucket.count, 0)).toBe(2);
  });
});
