import { z } from "zod";

import { propertyTypeSchema } from "@/features/properties/domain/property.schema";

const unsignedInteger = z.string().regex(/^\d+$/, "Expected an unsigned integer").transform(Number);
const unsignedDecimal = z.string()
  .regex(/^\d+(?:\.\d+)?$/, "Expected an unsigned decimal")
  .transform(Number)
  .pipe(z.number().nonnegative());

const propertyQueryFields = z.strictObject({
  search: z.string()
    .trim()
    .refine((value) => [...value].length <= 120, "Search must be at most 120 characters")
    .transform((value) => value || undefined)
    .optional(),
  types: z.string()
    .transform((value) => value.split(","))
    .pipe(z.array(propertyTypeSchema))
    .transform((types) => [...new Set(types)])
    .optional(),
  minPrice: unsignedDecimal.optional(),
  maxPrice: unsignedDecimal.optional(),
  minBedrooms: unsignedInteger.pipe(z.int().nonnegative()).optional(),
  minBathrooms: unsignedInteger.pipe(z.int().nonnegative()).optional(),
  minArea: unsignedDecimal.optional(),
  maxArea: unsignedDecimal.optional(),
  featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  sortBy: z.enum(["createdAt", "price", "rating", "area"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: unsignedInteger.pipe(z.int().min(1).max(1_000_000)).default(1),
  limit: unsignedInteger.pipe(z.int().min(1).max(100)).default(20),
}).superRefine(({ minPrice, maxPrice, minArea, maxArea }, context) => {
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    context.addIssue({
      code: "custom",
      path: ["minPrice"],
      message: "Must be less than or equal to maxPrice",
    });
  }
  if (minArea !== undefined && maxArea !== undefined && minArea > maxArea) {
    context.addIssue({
      code: "custom",
      path: ["minArea"],
      message: "Must be less than or equal to maxArea",
    });
  }
});

export const propertyQuerySchema = z.instanceof(URLSearchParams)
  .transform((params, context) => {
    const fields = new Map<string, string>();
    for (const [key, value] of params) {
      if (!Object.hasOwn(propertyQueryFields.shape, key)) {
        context.addIssue({
          code: "custom",
          path: ["query"],
          message: "Unknown query parameter",
        });
        continue;
      }
      if (fields.has(key)) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Query parameter must occur only once",
        });
      }
      fields.set(key, value);
    }
    return Object.fromEntries(fields);
  })
  .pipe(propertyQueryFields);

export type PropertyQuery = z.infer<typeof propertyQuerySchema>;
