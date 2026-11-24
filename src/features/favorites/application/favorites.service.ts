import { ApiError } from "@/core/errors/api-error";
import { getPagination, type PaginationQuery } from "@/core/pagination";
import { favoritePropertyIdSchema } from "@/features/favorites/domain/favorite-property-id.schema";
import type { FavoritesRepository } from "@/features/favorites/domain/favorites.repository";
import { toPropertySummary } from "@/features/properties/domain/property.mapper";
import type { PropertyRepository } from "@/features/properties/domain/property.repository";
import type { Locale } from "@/features/properties/domain/property.schema";

function validatePropertyId(input: string) {
  const result = favoritePropertyIdSchema.safeParse(input);
  if (!result.success) {
    throw new ApiError("VALIDATION_ERROR", "Invalid property ID", result.error.issues.map(({ message }) => ({
      field: "propertyId",
      message,
    })));
  }
  return result.data;
}

export class FavoritesService {
  constructor(
    private readonly favorites: FavoritesRepository,
    private readonly properties: Pick<PropertyRepository, "findById" | "findSummariesByIds">,
  ) {}

  async list(uid: string, query: PaginationQuery, locale: Locale = "en") {
    const ids = await this.favorites.list(uid);
    const summaries = ids.length ? await this.properties.findSummariesByIds(ids) : undefined;
    const available = ids.flatMap((id) => {
      const property = summaries?.get(id);
      return property ? [property] : [];
    });
    const offset = (query.page - 1) * query.limit;
    return {
      data: available.slice(offset, offset + query.limit).map((property) => toPropertySummary(property, locale)),
      pagination: getPagination(query, available.length),
    };
  }

  async add(uid: string, input: string) {
    const propertyId = validatePropertyId(input);
    if (await this.properties.findById(propertyId) === null) {
      throw new ApiError("PROPERTY_NOT_FOUND", "Property not found");
    }
    await this.favorites.add(uid, propertyId);
    return { propertyId, isFavorite: true };
  }

  async listIds(uid: string): Promise<string[]> {
    return [...new Set(await this.favorites.listIds(uid))].sort();
  }

  async remove(uid: string, input: string) {
    const propertyId = validatePropertyId(input);
    await this.favorites.remove(uid, propertyId);
    return { propertyId, isFavorite: false };
  }
}
