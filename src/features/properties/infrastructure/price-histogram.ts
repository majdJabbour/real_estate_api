import type {
  PriceHistogramBucket,
  PropertyBounds,
} from "@/features/properties/domain/property.repository";

const BUCKET_COUNT = 20;
const INTERPOLATION_DECIMAL_PLACES = 2;
const INTERPOLATION_SCALE = 10 ** INTERPOLATION_DECIMAL_PLACES;

function decimalParts(price: number) {
  const [coefficient, exponent = "0"] = price.toString().split("e");
  const [whole, fraction = ""] = coefficient.split(".");
  return {
    units: BigInt(whole + fraction),
    scale: fraction.length - Number(exponent),
  };
}

export function buildPriceHistogram(
  prices: readonly number[],
  { min, max }: PropertyBounds,
): readonly PriceHistogramBucket[] {
  if (min === null || max === null) return [];
  if (min === max) return [{ from: min, to: max, count: prices.length }];

  const low = decimalParts(min);
  const high = decimalParts(max);
  const scale = Math.max(low.scale, high.scale);
  const lowUnits = low.units * BigInt(10) ** BigInt(scale - low.scale);
  const highUnits = high.units * BigInt(10) ** BigInt(scale - high.scale);

  // Twenty divides one hundred, so interpolation stays exact until each edge becomes a JSON number.
  const start = lowUnits * BigInt(INTERPOLATION_SCALE);
  const step = (highUnits - lowUnits) * BigInt(INTERPOLATION_SCALE / BUCKET_COUNT);
  const edges = Array.from({ length: BUCKET_COUNT + 1 }, (_, index) =>
    Number(`${start + step * BigInt(index)}e${-(scale + INTERPOLATION_DECIMAL_PLACES)}`),
  );
  const buckets = edges.slice(0, -1).map((from, index) => ({ from, to: edges[index + 1], count: 0 }));

  for (const price of prices) {
    // Edges are shared, so the first strictly greater upper edge identifies the containing bucket.
    const index = buckets.findIndex(({ to }) => price < to);
    buckets[index === -1 ? BUCKET_COUNT - 1 : index].count++;
  }
  return buckets;
}
