import { z } from "zod";

export const propertyIdSchema = z.string()
  .min(1, "Property ID is required")
  .max(128, "Property ID must be at most 128 characters")
  .refine(
    (value) => /^[A-Za-z0-9._~-]*$/.test(value) && value !== "." && value !== "..",
    "Property ID must be a safe URL path segment",
  );
