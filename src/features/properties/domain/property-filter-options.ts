import type { PropertyBounds, PropertyFilterAggregation } from "@/features/properties/domain/property.repository";
import type {
  PropertyDetails,
  PropertySummary,
  PropertyType,
} from "@/features/properties/domain/property.schema";

export type PropertyFilterOptions = {
  price: PropertyFilterAggregation["price"] & Pick<PropertySummary, "currency" | "pricingPeriod">;
  area: PropertyBounds & { unit: PropertyDetails["areaUnit"] };
  bedrooms: PropertyBounds;
  bathrooms: PropertyBounds;
  types: { id: PropertyType; label: string }[];
};
