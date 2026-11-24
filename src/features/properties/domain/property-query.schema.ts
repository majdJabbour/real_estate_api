import { z } from "zod";

import { paginationFields, queryFromSearchParams, unsignedInteger } from "@/core/pagination";
import { propertyTypeSchema } from "@/features/properties/domain/property.schema";

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
  ...paginationFields,
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

export const propertyQuerySchema = queryFromSearchParams(propertyQueryFields);

export type PropertyQuery = z.infer<typeof propertyQuerySchema>;
