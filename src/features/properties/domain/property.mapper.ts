import type {
  Locale,
  LocalizedText,
  PropertyDetails,
  PropertySummary,
  PropertySummarySource,
  ReadonlyProperty,
} from "@/features/properties/domain/property.schema";

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
