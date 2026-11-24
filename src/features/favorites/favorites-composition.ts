import "server-only";

import { FavoritesService } from "@/features/favorites/application/favorites.service";
import { FirestoreFavoritesRepository } from "@/features/favorites/infrastructure/firestore-favorites.repository";
import { propertyRepository } from "@/features/properties/property-composition";

export const favoritesService = new FavoritesService(new FirestoreFavoritesRepository(), propertyRepository);
