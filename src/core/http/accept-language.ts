import { localeSchema, type Locale } from "@/features/properties/domain/property.schema";

const languageRange = /^(\*|[a-z]{1,8}(?:-[a-z0-9]{1,8})*)(?:\s*;\s*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i;

export function resolveLocale(header: string | null): Locale {
  let locale: Locale = "en";
  let bestWeight = 0;

  for (const preference of header?.split(",") ?? []) {
    const match = languageRange.exec(preference.trim());
    if (!match) continue;

    const primary = match[1].toLowerCase().split("-")[0];
    const supported = localeSchema.safeParse(primary);
    const weight = Number(match[2] ?? "1");
    if (supported.success && weight > bestWeight) {
      locale = supported.data;
      bestWeight = weight;
    }
  }
  return locale;
}
