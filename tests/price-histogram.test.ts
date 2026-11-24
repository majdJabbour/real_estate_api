import { expect, it } from "vitest";

import { buildPriceHistogram } from "@/features/properties/infrastructure/price-histogram";

it("returns no buckets for empty data", () => {
  expect(buildPriceHistogram([], { min: null, max: null })).toEqual([]);
});

it.each([1, 4])("returns one bucket for %i records with an identical price", (count) => {
  expect(buildPriceHistogram(Array<number>(count).fill(1500.25), { min: 1500.25, max: 1500.25 }))
    .toEqual([{ from: 1500.25, to: 1500.25, count }]);
});

it("covers the range with contiguous ordered buckets and counts edge prices exactly once", () => {
  const prices = [300, 100, 110, 109.99, 110, 290, 300, 299.99];
  const bounds = { min: 100, max: 300 };
  const buckets = buildPriceHistogram(prices, bounds);

  expect(buckets).toEqual(Array.from({ length: 20 }, (_, index) => ({
    from: 100 + index * 10,
    to: 110 + index * 10,
    count: index === 0 ? 2 : index === 1 ? 2 : index === 19 ? 4 : 0,
  })));
  expect(buildPriceHistogram([...prices].reverse(), bounds)).toEqual(buckets);
  expect(prices).toEqual([300, 100, 110, 109.99, 110, 290, 300, 299.99]);
  expect(buckets.reduce((total, { count }) => total + count, 0)).toBe(prices.length);
});

it("puts exact decimal boundary prices in the bucket that starts at that price", () => {
  const prices = [0.1, 0.12999999999999998, 0.13, 0.14, 0.29, 0.3];
  const buckets = buildPriceHistogram(prices, { min: 0.1, max: 0.3 });

  expect(buckets[2]).toEqual({ from: 0.12, to: 0.13, count: 1 });
  expect(buckets[3]).toEqual({ from: 0.13, to: 0.14, count: 1 });
  expect(buckets[4]).toEqual({ from: 0.14, to: 0.15, count: 1 });
  expect(buckets[19]).toEqual({ from: 0.29, to: 0.3, count: 2 });
  expect(buckets.reduce((total, { count }) => total + count, 0)).toBe(prices.length);
});

it("handles exponent notation with finite edges", () => {
  const min = 1e-8;
  const max = 4e-8;
  const boundary = 1.15e-8;
  const buckets = buildPriceHistogram([min, boundary, max], { min, max });

  expect(buckets[0]).toEqual({ from: min, to: boundary, count: 1 });
  expect(buckets[1]).toEqual({ from: boundary, to: 1.3e-8, count: 1 });
  expect(buckets[19]).toEqual({ from: 3.85e-8, to: max, count: 1 });
});

it("counts every record when some numeric edges round to the same value", () => {
  const max = 1 + Number.EPSILON;
  const buckets = buildPriceHistogram([1, max], { min: 1, max });

  expect(buckets).toHaveLength(20);
  expect(buckets[0].from).toBe(1);
  expect(buckets[19]).toEqual({ from: max, to: max, count: 1 });
  expect(buckets.slice(0, -1).filter(({ from, to }) => from < to))
    .toEqual([{ from: 1, to: max, count: 1 }]);
  expect(buckets.reduce((total, { count }) => total + count, 0)).toBe(2);
});
