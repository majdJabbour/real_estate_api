import type { ReadonlyProperty } from "@/features/properties/domain/property.schema";

export function normalizePropertySearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(?=\p{Script_Extensions=Arabic})\p{Mark}/gu, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .trim()
    .replace(/\s+/gu, " ");
}

export function getPropertySearchFields(
  { title, address, description }: ReadonlyProperty,
): readonly string[] {
  return [title, address, description].flatMap(({ en, ar }) =>
    ar === undefined
      ? [normalizePropertySearchText(en)]
      : [normalizePropertySearchText(en), normalizePropertySearchText(ar)],
  );
}
