import { FieldValue, getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";
import { afterEach, expect, it, vi } from "vitest";

import { getFirebaseApp } from "@/core/firebase/firebase-admin";
import { favoritePropertyIdSchema } from "@/features/favorites/domain/favorite-property-id.schema";
import { FirestoreFavoritesRepository } from "@/features/favorites/infrastructure/firestore-favorites.repository";

vi.mock("server-only", () => ({}));
vi.mock("@/core/firebase/firebase-admin", () => ({ getFirebaseApp: vi.fn() }));
vi.mock("firebase-admin/firestore", async (original) => ({
  ...await original<typeof import("firebase-admin/firestore")>(),
  getFirestore: vi.fn(),
}));

const propertyId = favoritePropertyIdSchema.parse("rental-001");

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

function fakeFirestore() {
  const records = new Map<string, Map<string, Timestamp>>();
  let savedWrites = 0;
  const create = vi.fn<(uid: string, id: string, fields: unknown) => Promise<void>>(async (uid, id) => {
    const favorites = records.get(uid) ?? new Map<string, Timestamp>();
    if (favorites.has(id)) throw Object.assign(new Error("Already exists"), { code: 6 });
    favorites.set(id, new Timestamp(1_000, ++savedWrites));
    records.set(uid, favorites);
  });
  const remove = vi.fn(async (uid: string, id: string) => { records.get(uid)?.delete(id); });
  const project = vi.fn((uid: string, field: string): {
    get: () => Promise<{ docs: { id: string; get: () => unknown }[] }>;
  } => ({
    get: async () => ({
      docs: Array.from(records.get(uid) ?? [], ([id, time]) => ({
        id, get: () => {
          expect(field).toBe("createdAt");
          return time;
        },
      })),
    }),
  }));
  const collection = vi.fn((root: string) => ({
    doc: (uid: string) => ({
      collection: (name: string) => {
        expect([root, name]).toEqual(["users", "favorites"]);
        return {
          select: (field: string) => project(uid, field),
          doc: (id: string) => ({
            create: (fields: unknown) => create(uid, id, fields),
            delete: () => remove(uid, id),
          }),
        };
      },
    }),
  }));
  const database = { collection } as unknown as Firestore;
  return { database, create, remove, project, records };
}

it("initializes the default database only on use and shares the existing Admin app", async () => {
  vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");
  const fake = fakeFirestore();
  const app = { name: "shared-test-admin", options: {} };
  vi.mocked(getFirebaseApp).mockReturnValue(app);
  vi.mocked(getFirestore).mockReturnValue(fake.database);
  const repository = new FirestoreFavoritesRepository();

  expect(getFirebaseApp).not.toHaveBeenCalled();
  expect(getFirestore).not.toHaveBeenCalled();
  await expect(repository.list("owner")).resolves.toEqual([]);
  expect(getFirestore).toHaveBeenCalledExactlyOnceWith(app);
  expect(fake.project).toHaveBeenCalledExactlyOnceWith("owner", "createdAt");
});

it("creates one record for concurrent and repeated PUTs and preserves its original timestamp", async () => {
  const fake = fakeFirestore();
  const repository = new FirestoreFavoritesRepository(() => fake.database);

  await Promise.all([
    repository.add("owner", propertyId),
    repository.add("owner", propertyId),
    repository.add("owner", propertyId),
  ]);
  const original = fake.records.get("owner")?.get(propertyId);
  expect(original).toEqual(new Timestamp(1_000, 1));
  await repository.add("owner", propertyId);
  expect(fake.records.get("owner")?.get(propertyId)).toBe(original);
  expect(fake.create).toHaveBeenCalledTimes(4);
  expect(fake.create).toHaveBeenCalledWith("owner", propertyId, {
    propertyId, createdAt: FieldValue.serverTimestamp(),
  });
  await expect(repository.list("owner")).resolves.toEqual([propertyId]);
});

it("orders by full timestamp then ascending ID and isolates two users' deletes", async () => {
  const fake = fakeFirestore();
  fake.records.set("owner", new Map([
    ["rental-003", new Timestamp(100, 6)],
    ["rental-002", new Timestamp(100, 7)],
    ["rental-004", new Timestamp(101, 0)],
    ["rental-001", new Timestamp(100, 7)],
  ]));
  fake.records.set("other-user", new Map([["rental-001", new Timestamp(102, 0)]]));
  const repository = new FirestoreFavoritesRepository(() => fake.database);

  await expect(repository.list("owner")).resolves.toEqual([
    "rental-004", "rental-001", "rental-002", "rental-003",
  ]);
  await repository.remove("owner", propertyId);
  await repository.remove("owner", propertyId);
  await expect(repository.list("owner")).resolves.toEqual(["rental-004", "rental-002", "rental-003"]);
  await expect(repository.list("other-user")).resolves.toEqual(["rental-001"]);
  expect(fake.remove).toHaveBeenCalledTimes(2);
});

it.each(["bad/path", ".", "..", "__reserved__", "", "\ud800", "x".repeat(1501)])(
  "rejects unsafe verified user IDs before obtaining a database",
  async (uid) => {
    const provider = vi.fn();
    const repository = new FirestoreFavoritesRepository(provider);
    await expect(repository.add(uid, propertyId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(provider).not.toHaveBeenCalled();
  },
);

it("sanitizes configuration failures, RPC failures, and corrupt stored timestamps", async () => {
  vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");
  vi.mocked(getFirebaseApp).mockImplementation(() => { throw new Error("sensitive config marker"); });
  const failure = { code: "SERVICE_UNAVAILABLE", message: "Favorites service unavailable" };
  await expect(new FirestoreFavoritesRepository().list("owner")).rejects.toMatchObject(failure);
  expect(getFirestore).not.toHaveBeenCalled();

  const fake = fakeFirestore();
  fake.create.mockRejectedValueOnce({ code: 14, message: "internal document path" });
  fake.remove.mockRejectedValueOnce(new Error("internal document path"));
  fake.project.mockReturnValueOnce({
    get: async () => ({ docs: [{ id: propertyId, get: () => null }] }),
  });
  const repository = new FirestoreFavoritesRepository(() => fake.database);
  await expect(repository.add("owner", propertyId)).rejects.toMatchObject(failure);
  await expect(repository.remove("owner", propertyId)).rejects.toMatchObject(failure);
  await expect(repository.list("owner")).rejects.toMatchObject(failure);
});
