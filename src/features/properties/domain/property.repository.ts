import type { PropertyQuery } from "@/features/properties/domain/property-query.schema";
import type {
  PropertySummarySource,
  PropertyType,
  ReadonlyProperty,
} from "@/features/properties/domain/property.schema";

export type PropertyPage = {
  readonly properties: readonly PropertySummarySource[];
  readonly total: number;
};

export type PropertyBounds = {
  readonly min: number | null;
  readonly max: number | null;
};

export type PropertyFilterAggregation = {
  readonly types: readonly PropertyType[];
  readonly price: PropertyBounds;
  readonly area: PropertyBounds;
  readonly bedrooms: PropertyBounds;
  readonly bathrooms: PropertyBounds;
};

export interface PropertyRepository {
  list(query: PropertyQuery): Promise<PropertyPage>;
  findById(id: string): Promise<ReadonlyProperty | null>;
  aggregateFilters(): Promise<PropertyFilterAggregation>;
}
