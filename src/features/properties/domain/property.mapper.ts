import type { PropertyFilterOptions } from "@/features/properties/domain/property-filter-options";
import type { PropertyFilterAggregation } from "@/features/properties/domain/property.repository";
import {
  PROPERTY_AREA_UNIT,
  PROPERTY_CURRENCY,
  PROPERTY_PRICING_PERIOD,
  type Locale,
  type LocalizedText,
  type PropertyDetails,
  type PropertySummary,
  type PropertySummarySource,
  type PropertyType,
  type ReadonlyProperty,
} from "@/features/properties/domain/property.schema";

const typeLabels: Record<PropertyType, Required<LocalizedText>> = {
  apartment: { en: "Apartment", ar: "شقة" },
  townhome: { en: "Townhome", ar: "منزل متلاصق" },
  house: { en: "House", ar: "منزل مستقل" },
  condo: { en: "Condo", ar: "شقة تمليك" },
  duplex: { en: "Duplex", ar: "دوبلكس" },
  studio: { en: "Studio", ar: "استوديو" },
};

function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en;
}

export function toPropertySummary(
  property: PropertySummarySource,
  locale: Locale = "en",
): PropertySummary {
  return {
    id: property.id,
    title: localize(property.title, locale),
    address: localize(property.address, locale),
    type: property.type,
    price: property.price,
    currency: property.currency,
    pricingPeriod: property.pricingPeriod,
    rating: property.rating,
    thumbnail: property.thumbnail,
    isFeatured: property.isFeatured,
  };
}

export function toPropertyDetails(property: ReadonlyProperty, locale: Locale = "en"): PropertyDetails {
  return {
    ...toPropertySummary(property, locale),
    description: localize(property.description, locale),
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    areaUnit: property.areaUnit,
    images: [...property.images],
    facilities: [...property.facilities],
    agent: { id: property.agent.id, name: property.agent.name, avatar: property.agent.avatar },
    location: { latitude: property.location.latitude, longitude: property.location.longitude },
    reviews: property.reviews.map((review) => ({
      id: review.id,
      reviewerName: review.reviewerName,
      rating: review.rating,
      comment: localize(review.comment, locale),
      date: review.date,
    })),
    createdAt: property.createdAt,
  };
}

export function toPropertyFilterOptions(
  aggregation: PropertyFilterAggregation,
  locale: Locale,
): PropertyFilterOptions {
  return {
    price: {
      ...aggregation.price,
      currency: PROPERTY_CURRENCY,
      pricingPeriod: PROPERTY_PRICING_PERIOD,
    },
    area: { ...aggregation.area, unit: PROPERTY_AREA_UNIT },
    bedrooms: aggregation.bedrooms,
    bathrooms: aggregation.bathrooms,
    types: aggregation.types.map((id) => ({ id, label: localize(typeLabels[id], locale) })),
  };
}
