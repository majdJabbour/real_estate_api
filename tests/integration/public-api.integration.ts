import { expect, inject, it } from "vitest";
import { z } from "zod";

import fixture from "@/data/properties.normalized.json";
import {
  propertyDetailsSchema,
  propertySummarySchema,
} from "@/features/properties/domain/property.schema";

const paginationSchema = z.strictObject({
  page: z.int().positive(),
  limit: z.int().positive(),
  total: z.int().nonnegative(),
  totalPages: z.int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});
const listingSchema = z.strictObject({
  success: z.literal(true),
  data: propertySummarySchema.array(),
  pagination: paginationSchema,
});
const detailsSchema = z.strictObject({
  success: z.literal(true),
  data: propertyDetailsSchema,
});
const bounds = z.strictObject({ min: z.number().nullable(), max: z.number().nullable() });
const filterOptionsSchema = z.strictObject({
  success: z.literal(true),
  data: z.strictObject({
    price: bounds.extend({
      currency: z.literal("USD"),
      pricingPeriod: z.literal("month"),
      histogram: z.strictObject({
        from: z.number(), to: z.number(), count: z.int().nonnegative(),
      }).array(),
    }),
    area: bounds.extend({ unit: z.literal("sqm") }),
    bedrooms: bounds,
    bathrooms: bounds,
    types: z.strictObject({ id: z.string(), label: z.string() }).array(),
  }),
});
const errorSchema = z.strictObject({
  success: z.literal(false),
  error: z.strictObject({
    code: z.enum(["VALIDATION_ERROR", "PROPERTY_NOT_FOUND"]),
    message: z.string().min(1),
    details: z.strictObject({ field: z.string().min(1), message: z.string().min(1) }).array().optional(),
  }),
});
const summaryFields = [
  "id", "title", "address", "type", "price", "currency", "pricingPeriod",
  "rating", "thumbnail", "isFeatured",
];
const detailFields = [
  ...summaryFields, "description", "bedrooms", "bathrooms", "area", "areaUnit",
  "images", "facilities", "agent", "location", "reviews", "createdAt",
];
const sample = fixture.find(({ id }) => id === "rental-001");
if (!sample) throw new Error("The HTTP search scenarios require rental-001.");

function request(path: string, language?: string, method = "GET") {
  return fetch(`${inject("publicApiOrigin")}/api/v1${path}`, {
    method,
    headers: language === undefined ? undefined : { "Accept-Language": language },
    redirect: "manual",
    signal: AbortSignal.timeout(5_000),
  });
}

async function getJson(path: string, status: number, language?: string, locale?: "en" | "ar") {
  const response = await request(path, language);
  const text = await response.text();
  expect(response.status, path).toBe(status);
  expect(response.headers.get("Content-Type")).toMatch(/^application\/json\b/i);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  if (locale) {
    expect(response.headers.get("Content-Language")).toBe(locale);
    const vary = response.headers.get("Vary")?.toLowerCase().split(",").map((value) => value.trim());
    expect(vary).toContain("accept-language");
  }
  const body: unknown = JSON.parse(text);
  return { body, text };
}

async function list(query = "", language?: string, locale: "en" | "ar" = "en") {
  const { body } = await getJson(`/properties${query ? `?${query}` : ""}`, 200, language, locale);
  const parsed = listingSchema.parse(body);
  for (const summary of parsed.data) {
    expect(Object.keys(summary).sort()).toEqual([...summaryFields].sort());
  }
  return parsed;
}

function ids(properties: readonly { id: string }[]) {
  return properties.map(({ id }) => id);
}

it("serves liveness and the default paginated summary contract", async () => {
  const health = await getJson("/health", 200, "ar");
  expect(health.body).toEqual({ success: true, data: { status: "ok" } });
  const page = await list();
  const newest = [...fixture].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));

  expect(ids(page.data)).toEqual(ids(newest.slice(0, 20)));
  expect(page.data[0].title).toBe(newest[0].title.en);
  expect(page.pagination).toEqual({
    page: 1, limit: 20, total: fixture.length, totalPages: Math.ceil(fixture.length / 20),
    hasNextPage: true, hasPreviousPage: false,
  });
});

it("finds the same property with English and Arabic search regardless of response locale", async () => {
  const [arabic, english] = await Promise.all([
    list("search=+SUNLIT+", "fr-CA, ar-SY;q=0.8, en-US;q=0.4", "ar"),
    list(new URLSearchParams({ search: "شُقَّة مُشْمِسَة" }).toString(), "en-GB"),
  ]);
  expect(ids(arabic.data)).toEqual([sample.id]);
  expect(ids(english.data)).toEqual([sample.id]);
  expect(english.data[0].title).toBe(sample.title.en);
  expect(arabic.data[0]).toEqual({
    ...english.data[0], title: sample.title.ar, address: sample.address.ar,
  });
});

it("applies inclusive price and area ranges, room minimums, multiple types and featured=false", async () => {
  const page = await list(
    "types=apartment,condo&minPrice=1625&maxPrice=2540&minArea=80&maxArea=112"
      + "&minBedrooms=2&minBathrooms=1&featured=false&sortBy=price&sortOrder=asc",
  );
  const expected = fixture.filter((property) =>
    ["apartment", "condo"].includes(property.type)
    && property.price >= 1625 && property.price <= 2540
    && property.area >= 80 && property.area <= 112
    && property.bedrooms >= 2 && property.bathrooms >= 1 && !property.isFeatured,
  ).sort((a, b) => a.price - b.price);

  expect(expected.map(({ type }) => type)).toEqual(expect.arrayContaining(["apartment", "condo"]));
  expect(expected.map(({ area }) => area)).toEqual(expect.arrayContaining([80, 112]));
  expect(page.data.map(({ price }) => price)).toEqual(expect.arrayContaining([1625, 2540]));
  expect(ids(page.data)).toEqual(ids(expected));
  expect(page.pagination.total).toBe(expected.length);
});

it("combines search and featured filters, then resets to default results", async () => {
  const expected = fixture.filter((property) =>
    property.type === "condo" && property.title.en.includes("Condo")
    && property.isFeatured && property.bathrooms >= 2,
  );
  const filtered = await list("search=condo&types=condo&featured=true&minBathrooms=2&page=1");
  expect(expected.length).toBeGreaterThan(0);
  expect(ids(filtered.data).sort()).toEqual(ids(expected).sort());
  expect(filtered.pagination.total).toBe(expected.length);
  expect(filtered.data.every(({ isFeatured }) => isFeatured)).toBe(true);

  const empty = await list("search=__no_property_matches__&page=4&limit=3");
  expect(empty.data).toEqual([]);
  expect(empty.pagination).toEqual({
    page: 4, limit: 3, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false,
  });
  expect(await list("search=+%09+")).toEqual(await list());
});

it.each(["asc", "desc"])("paginates the filtered dataset with stable %s rating order", async (order) => {
  const direction = order === "asc" ? 1 : -1;
  const expected = fixture.filter(({ type }) => type === "apartment" || type === "condo")
    .sort((a, b) => direction * (a.rating - b.rating) || a.id.localeCompare(b.id));
  const limit = 3;
  const totalPages = Math.ceil(expected.length / limit);
  const query = `types=apartment,condo&sortBy=rating&sortOrder=${order}&limit=${limit}`;
  const pages = await Promise.all(Array.from({ length: totalPages + 1 }, (_, index) =>
    list(`${query}&page=${index + 1}`),
  ));

  for (const [index, page] of pages.entries()) {
    expect(page.pagination).toEqual({
      page: index + 1, limit, total: expected.length, totalPages,
      hasNextPage: index + 1 < totalPages, hasPreviousPage: index > 0,
    });
    expect(ids(page.data)).toEqual(ids(expected.slice(index * limit, (index + 1) * limit)));
  }
  const actualIds = pages.flatMap(({ data }) => ids(data));
  expect(new Set(actualIds).size).toBe(expected.length);

  const newFilter = await list(`types=studio&page=1&sortBy=rating&sortOrder=${order}&limit=${limit}`);
  const studios = fixture.filter(({ type }) => type === "studio")
    .sort((a, b) => direction * (a.rating - b.rating) || a.id.localeCompare(b.id));
  expect(ids(newFilter.data)).toEqual(ids(studios.slice(0, limit)));
  expect(newFilter.pagination.total).toBe(studios.length);
});

it("serves contract-shaped details in both languages with unsupported language fallback", async () => {
  const path = `/properties/${sample.id}`;
  const [arabic, english] = await Promise.all([
    getJson(path, 200, "ar-SY", "ar"),
    getJson(path, 200, "de, fr-CA", "en"),
  ]);
  for (const [locale, response] of [["en", english], ["ar", arabic]] as const) {
    const { data } = detailsSchema.parse(response.body);
    expect(Object.keys(data).sort()).toEqual([...detailFields].sort());
    expect(data).toEqual({
      ...sample,
      title: sample.title[locale],
      address: sample.address[locale],
      description: sample.description[locale],
      reviews: sample.reviews.map((review) => ({ ...review, comment: review.comment[locale] })),
    });
  }
});

it("returns localized global bounds and assigns each fixture price to exactly one bucket", async () => {
  const path = "/properties/filter-options";
  const [english, arabic] = await Promise.all([
    getJson(path, 200, "en", "en"), getJson(path, 200, "ar", "ar"),
  ]);
  const { data } = filterOptionsSchema.parse(english.body);
  const ar = filterOptionsSchema.parse(arabic.body).data;

  const range = (field: "price" | "area" | "bedrooms" | "bathrooms") => {
    const values = fixture.map((property) => property[field]);
    return { min: Math.min(...values), max: Math.max(...values) };
  };
  expect(data.price).toMatchObject(range("price"));
  expect(data.area).toMatchObject(range("area"));
  expect(data.bedrooms).toEqual(range("bedrooms"));
  expect(data.bathrooms).toEqual(range("bathrooms"));
  expect(data.types.map(({ id }) => id))
    .toEqual(["apartment", "townhome", "house", "condo", "duplex", "studio"]);
  expect(new Set(data.types.map(({ id }) => id))).toEqual(new Set(fixture.map(({ type }) => type)));
  expect(data.types[0].label).toBe("Apartment");
  expect(ar).toEqual({
    ...data,
    types: data.types.map(({ id }, index) => ({
      id, label: ["شقة", "منزل متلاصق", "منزل مستقل", "شقة تمليك", "دوبلكس", "استوديو"][index],
    })),
  });

  const buckets = data.price.histogram;
  const { min, max } = range("price");
  expect(buckets).toHaveLength(20);
  expect(buckets[0].from).toBe(min);
  expect(buckets.at(-1)?.to).toBe(max);
  const counts = buckets.map(() => 0);
  for (const { price } of fixture) {
    const matches = buckets.flatMap(({ from, to }, index) =>
      price >= from && (index === 19 ? price <= to : price < to) ? [index] : [],
    );
    expect(matches, `bucket membership for ${price}`).toHaveLength(1);
    counts[matches[0]]++;
  }
  expect(buckets.map(({ count }) => count)).toEqual(counts);
  expect(counts.reduce((total, count) => total + count, 0)).toBe(fixture.length);
  expect(counts.at(-1)).toBeGreaterThan(0);
  for (const [index, bucket] of buckets.entries()) {
    expect(bucket.to).toBeGreaterThan(bucket.from);
    expect(bucket.to - bucket.from).toBeCloseTo((max - min) / 20);
    if (index > 0) expect(bucket.from).toBe(buckets[index - 1].to);
  }
});

it.each([
  ["/properties?internal-secret-marker=value", 400, "query"],
  ["/properties?page=1&page=2", 400, "page"],
  ["/properties?types=castle", 400, "types"],
  ["/properties?featured=TRUE", 400, "featured"],
  ["/properties?minPrice=1e2", 400, "minPrice"],
  ["/properties?minPrice=3000&maxPrice=1000", 400, "minPrice"],
  ["/properties?minArea=90&maxArea=10", 400, "minArea"],
  ["/properties?page=0", 400, "page"],
  ["/properties?limit=101", 400, "limit"],
  [`/properties?search=${"x".repeat(121)}`, 400, "search"],
  ["/properties/rental%2F001", 400, "id"],
  ["/properties/filter-options?page=1", 400, "query"],
  ["/properties/nonexistent-listing", 404, undefined],
] as const)("returns a safe application error for %s", async (path, status, field) => {
  const { body, text } = await getJson(path, status, "ar");
  const { error } = errorSchema.parse(body);
  expect(error.code).toBe(status === 400 ? "VALIDATION_ERROR" : "PROPERTY_NOT_FOUND");
  if (field) {
    expect(error.details).toEqual(expect.arrayContaining([expect.objectContaining({ field })]));
  } else {
    expect(error.details).toBeUndefined();
  }
  expect(text).not.toMatch(/internal-secret-marker|\/Users\/|\/home\/|node_modules|process\.env|stack trace/i);
});

it.each([
  ["GET", "/favorites"],
  ["PUT", "/favorites/rental-001"],
  ["DELETE", "/favorites/rental-001"],
] as const)("protects %s %s without Firestore credentials", async (method, path) => {
  const response = await request(path, undefined, method);
  expect(response.status).toBe(401);
  expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    success: false,
    error: { code: "UNAUTHORIZED", message: "Invalid or missing Firebase ID token" },
  });
});

it("distinguishes a framework-generated 405 from application JSON errors", async () => {
  const response = await request("/health", undefined, "POST");
  expect(response.status).toBe(405);
  expect(await response.text()).toBe("");
});

it.each([
  [undefined, 401, "UNAUTHORIZED"],
  ["Bearer invalid", 401, "UNAUTHORIZED"],
  ["Bearer fake.token.value", 503, "SERVICE_UNAVAILABLE"],
] as const)("isolates the credential-free server from Firebase configuration (%s)", async (header, status, code) => {
  const response = await fetch(`${inject("publicApiOrigin")}/api/v1/auth/me`, {
    headers: header === undefined ? undefined : { Authorization: header },
    signal: AbortSignal.timeout(5_000),
  });
  expect(response.status).toBe(status);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("WWW-Authenticate")).toBe(status === 401 ? "Bearer" : null);
  expect(await response.json()).toEqual({
    success: false,
    error: {
      code,
      message: status === 401 ? "Invalid or missing Firebase ID token" : "Authentication service unavailable",
    },
  });
});

it("isolates languages and filters across 12 concurrent requests", async () => {
  const cases = [
    { query: "search=sunlit", language: "ar", id: sample.id, title: sample.title.ar },
    { query: "types=studio&minPrice=975&maxPrice=975", language: "en", id: "rental-030",
      title: "Whittier Compact Studio" },
  ] as const;
  const started = performance.now();
  const responses = await Promise.all(Array.from({ length: 12 }, async (_, index) => {
    const scenario = cases[index % cases.length];
    const result = await list(scenario.query, scenario.language, scenario.language);
    expect(ids(result.data)).toEqual([scenario.id]);
    expect(result.data[0].title).toBe(scenario.title);
    expect(result.pagination.total).toBe(1);
    return result;
  }));

  for (const [index, result] of responses.entries()) {
    expect(result).toEqual(responses[index % cases.length]);
  }
  expect(await list(cases[0].query, cases[0].language, "ar")).toEqual(responses[0]);
  console.info(`12 concurrent loopback requests and one follow-up passed in ${Math.round(performance.now() - started)} ms.`);
});

it("records uncompressed JSON payload sizes and checks fixture image URL consistency", async () => {
  const urls = new Set(fixture.flatMap(({ images }) => images));
  for (const value of urls) {
    const url = new URL(value);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("images.pexels.com");
    expect(url.username + url.password).toBe("");
  }
  const paths = ["/properties", `/properties/${sample.id}`, "/properties/filter-options"];
  const sizes = await Promise.all(paths.map(async (path) => {
    const { text } = await getJson(path, 200, "en", "en");
    return `${path} ${Buffer.byteLength(text)} B`;
  }));
  console.info(`Uncompressed JSON (English): ${sizes.join(", ")}. ${urls.size} unique HTTPS image URLs.`);
});
