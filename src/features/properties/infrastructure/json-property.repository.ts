import fixture from "@/data/properties.normalized.json";
import type { PropertyQuery } from "@/features/properties/domain/property-query.schema";
import type {
  PropertyBounds,
  PropertyFilterAggregation,
  PropertyPage,
  PropertyRepository,
} from "@/features/properties/domain/property.repository";
import {
  getPropertySearchFields,
  normalizePropertySearchText,
} from "@/features/properties/domain/property-search";
import {
  propertyDatasetSchema,
  propertyTypeSchema,
  type PropertySummarySource,
  type ReadonlyProperty,
} from "@/features/properties/domain/property.schema";
import { buildPriceHistogram } from "@/features/properties/infrastructure/price-histogram";

function freezeRecord(value: unknown): void {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      freezeRecord(child);
    }
    Object.freeze(value);
  }
}

function prepareDataset(source: unknown) {
  // Zod returns new records, so freezing them leaves the injected source untouched.
  const properties = propertyDatasetSchema.parse(source);
  const byId = new Map<string, ReadonlyProperty>();
  const indexed = properties.map((property) => {
    freezeRecord(property);
    byId.set(property.id, property);
    return {
      property,
      searchFields: getPropertySearchFields(property),
      // Preserve sub-millisecond ordering while treating equivalent fractions as ties.
      createdAt: property.createdAt.slice(0, -1)
        .replace(/(\.\d*?)0+$/, "$1")
        .replace(/\.$/, ""),
    };
  });
  const filterAggregation = aggregateDatasetFilters(properties);
  freezeRecord(filterAggregation);
  return { byId, indexed, filterAggregation };
}

const bundledDataset = prepareDataset(fixture);

function matchesFilters(property: ReadonlyProperty, query: PropertyQuery): boolean {
  return (query.types === undefined || query.types.includes(property.type))
    && property.price >= (query.minPrice ?? 0)
    && property.price <= (query.maxPrice ?? Infinity)
    && property.area >= (query.minArea ?? 0)
    && property.area <= (query.maxArea ?? Infinity)
    && property.bedrooms >= (query.minBedrooms ?? 0)
    && property.bathrooms >= (query.minBathrooms ?? 0)
    && (query.featured === undefined || property.isFeatured === query.featured);
}

function compare(left: number | string, right: number | string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function getBounds(
  properties: Iterable<ReadonlyProperty>,
  field: "price" | "area" | "bedrooms" | "bathrooms",
): PropertyBounds {
  let min: number | null = null;
  let max: number | null = null;
  for (const property of properties) {
    const value = property[field];
    min = Math.min(min ?? value, value);
    max = Math.max(max ?? value, value);
  }
  return { min, max };
}

function aggregateDatasetFilters(properties: readonly ReadonlyProperty[]): PropertyFilterAggregation {
  const availableTypes = new Set(properties.map(({ type }) => type));
  const priceBounds = getBounds(properties, "price");
  return {
    types: propertyTypeSchema.options.filter((type) => availableTypes.has(type)),
    price: {
      ...priceBounds,
      histogram: buildPriceHistogram(properties.map(({ price }) => price), priceBounds),
    },
    area: getBounds(properties, "area"),
    bedrooms: getBounds(properties, "bedrooms"),
    bathrooms: getBounds(properties, "bathrooms"),
  };
}

export class JsonPropertyRepository implements PropertyRepository {
  private readonly dataset: ReturnType<typeof prepareDataset>;

  constructor(source?: unknown) {
    this.dataset = source === undefined ? bundledDataset : prepareDataset(source);
  }

  async list(query: PropertyQuery): Promise<PropertyPage> {
    const search = normalizePropertySearchText(query.search ?? "");
    const matches = this.dataset.indexed.filter(({ property, searchFields }) =>
      (!search || searchFields.some((field) => field.includes(search)))
      && matchesFilters(property, query),
    );
    const total = matches.length;
    const { sortBy, sortOrder, page, limit } = query;
    const offset = (page - 1) * limit;
    const direction = sortOrder === "asc" ? 1 : -1;

    matches.sort((left, right) => {
      const primary = sortBy === "createdAt"
        ? compare(left.createdAt, right.createdAt)
        : compare(left.property[sortBy], right.property[sortBy]);
      return primary * direction || compare(left.property.id, right.property.id);
    });

    return {
      properties: matches.slice(offset, offset + limit).map(({ property }) => property),
      total,
    };
  }

  async findById(id: string): Promise<ReadonlyProperty | null> {
    return this.dataset.byId.get(id) ?? null;
  }

  async findSummariesByIds(ids: readonly string[]): Promise<ReadonlyMap<string, PropertySummarySource>> {
    const summaries = new Map<string, PropertySummarySource>();
    for (const id of ids) {
      const property = this.dataset.byId.get(id);
      if (property) summaries.set(id, property);
    }
    return summaries;
  }

  async aggregateFilters(): Promise<PropertyFilterAggregation> {
    return this.dataset.filterAggregation;
  }
}
