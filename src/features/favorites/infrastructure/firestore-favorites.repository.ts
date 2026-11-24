import "server-only";

import { FieldValue, getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

import { ApiError } from "@/core/errors/api-error";
import { getFirebaseApp } from "@/core/firebase/firebase-admin";
import {
  isReservedFirestoreId,
  type FavoritePropertyId,
} from "@/features/favorites/domain/favorite-property-id.schema";
import type { FavoritesRepository } from "@/features/favorites/domain/favorites.repository";

const ALREADY_EXISTS = 6;

function unavailable() {
  return new ApiError("SERVICE_UNAVAILABLE", "Favorites service unavailable");
}

function getDefaultDatabase(): Firestore {
  if (process.env.FIRESTORE_EMULATOR_HOST) throw unavailable();
  return getFirestore(getFirebaseApp());
}

export class FirestoreFavoritesRepository implements FavoritesRepository {
  constructor(private readonly getDatabase: () => Pick<Firestore, "collection"> = getDefaultDatabase) {}

  async list(uid: string): Promise<readonly string[]> {
    return this.run(async () => {
      const { docs } = await this.collection(uid).select("createdAt").get();
      const favorites = docs.map((doc) => {
        const time: unknown = doc.get("createdAt");
        if (!(time instanceof Timestamp)) throw unavailable();
        return { id: doc.id, time };
      });
      return favorites.sort((a, b) =>
        b.time.seconds - a.time.seconds ||
        b.time.nanoseconds - a.time.nanoseconds ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      ).map(({ id }) => id);
    });
  }

  async add(uid: string, propertyId: FavoritePropertyId): Promise<void> {
    return this.run(async () => {
      const doc = this.collection(uid).doc(propertyId);
      try {
        await doc.create({ propertyId, createdAt: FieldValue.serverTimestamp() });
      } catch (error) {
        // Firestore create is atomic. An existing document already satisfies PUT.
        if (typeof error !== "object" || error === null
          || !("code" in error) || error.code !== ALREADY_EXISTS) throw error;
      }
    });
  }

  async remove(uid: string, propertyId: FavoritePropertyId): Promise<void> {
    await this.run(() => this.collection(uid).doc(propertyId).delete());
  }

  private collection(uid: string) {
    if (!uid || !uid.isWellFormed() || Buffer.byteLength(uid) > 1500
      || uid.includes("/") || uid === "." || uid === ".." || isReservedFirestoreId(uid)) {
      throw new ApiError("FORBIDDEN", "User cannot access favorites");
    }
    return this.getDatabase().collection("users").doc(uid).collection("favorites");
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ApiError && error.code === "FORBIDDEN") throw error;
      throw unavailable();
    }
  }
}
