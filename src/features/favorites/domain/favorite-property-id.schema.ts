import { z } from "zod";

import { propertyIdSchema } from "@/features/properties/domain/property-id.schema";

export function isReservedFirestoreId(id: string): boolean {
  return id.length >= 4 && id.startsWith("__") && id.endsWith("__");
}

export const favoritePropertyIdSchema = propertyIdSchema
  .refine((id) => !isReservedFirestoreId(id), "Property ID is reserved by Firestore")
  .brand<"FavoritePropertyId">();

export type FavoritePropertyId = z.infer<typeof favoritePropertyIdSchema>;
