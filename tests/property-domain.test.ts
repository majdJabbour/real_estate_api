import { describe, expect, it } from "vitest";

import rawProperties from "@/data/properties.normalized.json";
import {
  toPropertyDetails,
  toPropertySummary,
} from "@/features/properties/domain/property.mapper";
import {
  propertyDatasetSchema,
  propertyDetailsSchema,
  propertySchema,
  propertySummarySchema,
} from "@/features/properties/domain/property.schema";

const sample = rawProperties[0];
const firstReview = sample.reviews[0];

describe("property schema", () => {
  it("parses a bilingual record with a nullable avatar", () => {
    expect(propertySchema.parse(sample)).toStrictEqual(sample);
  });

  it("accepts fractional positive areas and prices and inclusive numeric boundaries", () => {
    const property = {
      ...sample,
      price: 950.5,
      area: 27.5,
      bedrooms: 0,
      bathrooms: 0,
      rating: 0,
      location: { latitude: -90, longitude: 180 },
      agent: { ...sample.agent, avatar: "https://example.com/avatar.jpg" },
      reviews: [{ ...firstReview, rating: 5 }],
    };
    expect(propertySchema.parse(property)).toStrictEqual(property);
  });

  it.each([
    ["empty ID", { id: "" }],
    ["legacy property type", { type: "townhouse" }],
    ["zero price", { price: 0 }],
    ["negative price", { price: -1 }],
    ["infinite price", { price: Infinity }],
    ["string price", { price: "1850" }],
    ["zero area", { area: 0 }],
    ["NaN area", { area: NaN }],
    ["negative area", { area: -10 }],
    ["negative bedrooms", { bedrooms: -1 }],
    ["fractional bathrooms", { bathrooms: 1.5 }],
    ["out-of-range listing rating", { rating: 5.1 }],
    ["out-of-range review rating", { reviews: [{ ...firstReview, rating: -0.1 }] }],
    ["out-of-range latitude", { location: { ...sample.location, latitude: 90.1 } }],
    ["out-of-range longitude", { location: { ...sample.location, longitude: -181 } }],
    ["different currency", { currency: "EUR" }],
    ["different period", { pricingPeriod: "year" }],
    ["different area unit", { areaUnit: "sqft" }],
    ["date without a time", { createdAt: "2025-02-03" }],
    ["impossible calendar date", { createdAt: "2025-02-30T16:00:00Z" }],
    ["review timestamp with a non-UTC offset", {
      reviews: [{ ...firstReview, date: "2025-03-03T12:00:00-04:00" }],
    }],
    ["non-HTTPS image", { images: ["http://example.com/home.jpg"] }],
    ["malformed thumbnail URL", { thumbnail: "https://" }],
    ["invalid avatar URL", { agent: { ...sample.agent, avatar: "javascript:alert(1)" } }],
    ["missing avatar field", { agent: { id: sample.agent.id, name: sample.agent.name } }],
    ["missing English fallback", { title: { ar: "شقة" } }],
    ["blank English fallback", { title: { en: "   ", ar: "شقة" } }],
    ["human-readable facility label", { facilities: ["In-unit laundry"] }],
  ])("rejects %s", (_label, changes) => {
    expect(propertySchema.safeParse({ ...sample, ...changes }).success).toBe(false);
  });

  it("identifies a thumbnail that is outside the gallery", () => {
    expect(propertySchema.safeParse({ ...sample, thumbnail: "https://example.com/other.jpg" }))
      .toMatchObject({ success: false, error: { issues: [{ path: ["thumbnail"] }] } });
  });

  it("identifies the repeated review ID within a listing", () => {
    expect(propertySchema.safeParse({ ...sample, reviews: [firstReview, firstReview] }))
      .toMatchObject({ success: false, error: { issues: [{ path: ["reviews", 1, "id"] }] } });
  });
});

describe("normalized property fixture", () => {
  it("validates all 30 listings and has exactly five of each approved type", () => {
    const properties = propertyDatasetSchema.parse(rawProperties);
    const counts = new Map<string, number>();
    for (const { type } of properties) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    expect(properties).toHaveLength(30);
    expect(Object.fromEntries(counts)).toEqual({
      apartment: 5,
      townhome: 5,
      house: 5,
      condo: 5,
      duplex: 5,
      studio: 5,
    });
  });

  it("provides both languages and consistent nested data for each listing", () => {
    const properties = propertyDatasetSchema.parse(rawProperties);
    const reviewIds = new Set<string>();

    for (const property of properties) {
      for (const text of [property.title, property.address, property.description]) {
        expect(text.en).toMatch(/[a-z]/i);
        expect(text.ar).toMatch(/\p{Script=Arabic}/u);
      }
      expect(property.images[0]).toBe(property.thumbnail);
      expect(new Set(property.images).size).toBe(property.images.length);
      expect(new Set(property.facilities).size).toBe(property.facilities.length);
      for (const review of property.reviews) {
        expect(review.comment.en).toMatch(/[a-z]/i);
        expect(review.comment.ar).toMatch(/\p{Script=Arabic}/u);
        expect(Date.parse(review.date)).toBeGreaterThanOrEqual(Date.parse(property.createdAt));
        expect(reviewIds.has(review.id)).toBe(false);
        reviewIds.add(review.id);
      }
    }
    expect(properties.some(({ isFeatured }) => isFeatured)).toBe(true);
    expect(properties.some(({ isFeatured }) => !isFeatured)).toBe(true);
    expect(properties.some(({ bedrooms }) => bedrooms === 0)).toBe(true);
  });

  it("identifies duplicate property IDs across records", () => {
    expect(propertyDatasetSchema.safeParse([sample, { ...sample, price: 2100 }]))
      .toMatchObject({ success: false, error: { issues: [{ path: [1, "id"] }] } });
  });

  it.each([{ name: "Different agent" }, { avatar: "https://example.com/new-avatar.jpg" }])(
    "rejects conflicting details for the same agent ID with %o",
    (changes) => {
      const second = { ...sample, id: "rental-other", agent: { ...sample.agent, ...changes } };

      expect(propertyDatasetSchema.safeParse([sample, second]))
        .toMatchObject({ success: false, error: { issues: [{ path: [1, "agent"] }] } });
    },
  );
});

describe("property DTO mappers", () => {
  const property = propertySchema.parse(sample);

  it("maps the default English summary using only the card fields", () => {
    const summary = toPropertySummary(property);

    expect(summary).toStrictEqual({
      id: "rental-001",
      title: "Sunlit Courtyard Apartment",
      address: "Lincoln Square, Chicago, IL",
      type: "apartment",
      price: 1850,
      currency: "USD",
      pricingPeriod: "month",
      rating: 4.7,
      thumbnail: sample.thumbnail,
      isFeatured: true,
    });
    expect(propertySummarySchema.parse(summary)).toStrictEqual(summary);
  });

  it("maps the Arabic summary without changing stable fields", () => {
    expect(toPropertySummary(property, "ar")).toStrictEqual({
      ...toPropertySummary(property, "en"),
      title: "شقة مشمسة تطل على فناء",
      address: "لينكولن سكوير، شيكاغو، إلينوي",
    });
  });

  it.each(["en", "ar"] as const)("maps the complete %s details DTO", (locale) => {
    const details = toPropertyDetails(property, locale);

    expect(details).toStrictEqual({
      ...toPropertySummary(property, locale),
      description: sample.description[locale],
      bedrooms: 1,
      bathrooms: 1,
      area: 71,
      areaUnit: "sqm",
      images: sample.images,
      facilities: sample.facilities,
      agent: sample.agent,
      location: sample.location,
      reviews: sample.reviews.map(({ comment, ...review }) => ({
        ...review,
        comment: comment[locale],
      })),
      createdAt: sample.createdAt,
    });
    expect(propertyDetailsSchema.parse(details)).toStrictEqual(details);
    expect(propertySummarySchema.safeParse(details).success).toBe(false);
    expect(propertyDetailsSchema.safeParse(property).success).toBe(false);
    expect(toPropertyDetails(property)).toStrictEqual(toPropertyDetails(property, "en"));
  });

  it("falls back to English per field while preserving available Arabic translations", () => {
    const partial = propertySchema.parse({
      ...sample,
      title: { en: sample.title.en },
      description: { en: sample.description.en },
      reviews: [{ ...firstReview, comment: { en: firstReview.comment.en } }, sample.reviews[1]],
    });
    const details = toPropertyDetails(partial, "ar");

    expect(toPropertySummary(partial, "ar").title).toBe(sample.title.en);
    expect(details.title).toBe(sample.title.en);
    expect(details.address).toBe(sample.address.ar);
    expect(details.description).toBe(sample.description.en);
    expect(details.reviews.map(({ comment }) => comment))
      .toEqual([firstReview.comment.en, sample.reviews[1].comment.ar]);
  });

  it("keeps the source unchanged when a caller edits mapped details", () => {
    const source = propertySchema.parse(sample);
    const details = toPropertyDetails(source);
    details.images.pop();
    details.facilities.pop();
    details.agent.name = "Edited agent";
    details.location.latitude = 0;
    details.reviews[0].reviewerName = "Edited reviewer";

    expect(source).toStrictEqual(sample);
  });
});
