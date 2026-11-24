import { describe, expect, it } from "vitest";

import { propertyQuerySchema } from "@/features/properties/domain/property-query.schema";
import { normalizePropertySearchText } from "@/features/properties/domain/property-search";

function parse(query: string) {
  return propertyQuerySchema.parse(new URLSearchParams(query));
}

describe("property query validation", () => {
  it("defaults to the first page of newest listings", () => {
    expect(parse("")).toStrictEqual({
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      limit: 20,
    });
  });

  it("parses and deduplicates all supported filters without changing type order", () => {
    expect(parse(
      "search=+Lake+View+&types=condo,apartment,condo&minPrice=0000&maxPrice=1899.25" +
      "&minArea=38.5&maxArea=100&minBedrooms=0&minBathrooms=2&featured=false" +
      "&sortBy=rating&sortOrder=asc&page=1000000&limit=100",
    )).toStrictEqual({
      search: "Lake View",
      types: ["condo", "apartment"],
      minPrice: 0,
      maxPrice: 1899.25,
      minArea: 38.5,
      maxArea: 100,
      minBedrooms: 0,
      minBathrooms: 2,
      featured: false,
      sortBy: "rating",
      sortOrder: "asc",
      page: 1_000_000,
      limit: 100,
    });
  });

  it("accepts true and the inclusive boundaries", () => {
    expect(parse("featured=true&page=1&limit=1&minPrice=0&maxPrice=0&minArea=55&maxArea=55"))
      .toMatchObject({ featured: true, page: 1, limit: 1, maxPrice: 0, maxArea: 55 });
  });

  it.each(["", "search=", "search=+%09+"])("treats %s as absent search", (query) => {
    expect(parse(query).search).toBeUndefined();
  });

  it("counts Unicode code points after trimming", () => {
    const search = "🏠".repeat(120);
    expect(parse(new URLSearchParams({ search: ` ${search} ` }).toString()).search).toBe(search);
    expect(propertyQuerySchema.safeParse(new URLSearchParams({ search: search + "a" })).success)
      .toBe(false);
  });

  it.each([
    ["empty numeric input", "minPrice="],
    ["whitespace-only numeric input", "maxArea=++"],
    ["trailing numeric whitespace", "minPrice=1%20"],
    ["leading plus", "minPrice=%2B2"],
    ["negative price", "maxPrice=-1"],
    ["exponent", "minArea=1e3"],
    ["hexadecimal", "maxArea=0x20"],
    ["missing whole-part digits", "minPrice=.5"],
    ["missing fractional digits", "minArea=3."],
    ["number with units", "maxPrice=10USD"],
    ["nonfinite decimal", `maxPrice=${"9".repeat(310)}`],
    ["fractional bedroom minimum", "minBedrooms=1.2"],
    ["negative bathroom minimum", "minBathrooms=-1"],
    ["unsafe room integer", "minBathrooms=9007199254740993"],
    ["fractional page", "page=1.0"],
    ["page below minimum", "page=0"],
    ["page above maximum", "page=1000001"],
    ["limit below minimum", "limit=0"],
    ["limit above maximum", "limit=101"],
    ["uppercase boolean", "featured=False"],
    ["numeric boolean", "featured=1"],
    ["empty boolean", "featured="],
    ["padded boolean", "featured=true%20"],
    ["unknown type", "types=apartment,villa"],
    ["empty type list", "types="],
    ["empty CSV slot", "types=apartment,,house"],
    ["leading CSV separator", "types=,studio"],
    ["whitespace in type list", "types=condo,%20studio"],
    ["unsupported sort field", "sortBy=bedrooms"],
    ["unsupported sort order", "sortOrder=DESC"],
    ["unknown key", "locale=ar"],
    ["unknown prototype key", "__proto__=studio"],
  ])("rejects %s", (_label, query) => {
    expect(propertyQuerySchema.safeParse(new URLSearchParams(query)).success).toBe(false);
  });

  it.each([
    ["types", "types=apartment&types=studio"],
    ["page", "page=1&%70age=1"],
    ["featured", "featured=false&featured=true"],
    ["search", "search=&search="],
  ])("reports duplicate %s", (field, query) => {
    expect(propertyQuerySchema.safeParse(new URLSearchParams(query))).toMatchObject({
      success: false,
      error: { issues: [{ path: [field], message: "Query parameter must occur only once" }] },
    });
  });

  it("reports both reversed ranges on their minimum fields", () => {
    expect(propertyQuerySchema.safeParse(new URLSearchParams(
      "minPrice=200&maxPrice=100&minArea=80&maxArea=40",
    ))).toMatchObject({
      success: false,
      error: { issues: [{ path: ["minPrice"] }, { path: ["minArea"] }] },
    });
  });
});

describe("property search normalization", () => {
  it("normalizes Unicode compatibility forms, case, and whitespace", () => {
    expect(normalizePropertySearchText(" \tＳＵＮＬＩＴ\u00a0\n LoFt ")).toBe("sunlit loft");
  });

  it("removes Arabic marks and tatweel and normalizes common alef variants", () => {
    expect(normalizePropertySearchText("أَ إِ آ ٱ شُــقَّة")).toBe("ا ا ا ا شقة");
    expect(normalizePropertySearchText("ا\u0654مَان")).toBe("امان");
  });

  it("preserves non-Arabic accents and punctuation", () => {
    expect(normalizePropertySearchText("  CAFE\u0301,  Loft ")).toBe("café, loft");
  });
});
