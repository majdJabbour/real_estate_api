import { expect, it } from "vitest";

import { resolveLocale } from "@/core/http/accept-language";

it.each([
  [null, "en"],
  ["", "en"],
  ["en-US", "en"],
  ["AR-sy", "ar"],
  ["ar", "ar"],
  ["fr-CA, de", "en"],
  ["fr, ar;q=0.4, en;q=0.3", "ar"],
  ["ar;q=0.2, en;q=0.9", "en"],
  ["ar;q=0.6, en;q=0.6", "ar"],
  ["en;q=0.6, ar;q=0.6", "en"],
  ["ar;q=0, en;q=0.8", "en"],
  ["ar;q=0", "en"],
  ["ar;q=bogus", "en"],
  ["ar;q=1.001, en;q=0.2", "en"],
  ["ar;q=0.9999, en;q=0.1", "en"],
  ["ar;q=.9, en;q=0.1", "en"],
  ["ar-?, en;q=0.2", "en"],
  ["ar;q=0.2;q=1, en;q=0.1", "en"],
  ["ar ; Q=0.850, en;q=0.8", "ar"],
  ["ar;q=1., en;q=0.9", "ar"],
  ["*", "en"],
  ["*;q=1, ar;q=0.2", "ar"],
])("resolves Accept-Language %j to %s", (value, locale) => {
  expect(resolveLocale(value)).toBe(locale);
});
