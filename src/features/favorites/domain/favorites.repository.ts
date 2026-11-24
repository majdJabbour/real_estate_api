import type { FavoritePropertyId } from "@/features/favorites/domain/favorite-property-id.schema";

export interface FavoritesRepository {
  /** IDs ordered by favorite creation time descending, then property ID ascending. */
  list(uid: string): Promise<readonly string[]>;
  add(uid: string, propertyId: FavoritePropertyId): Promise<void>;
  remove(uid: string, propertyId: FavoritePropertyId): Promise<void>;
}
