import { z } from "zod";

export const localeSchema = z.enum(["en", "ar"]);
export type Locale = z.infer<typeof localeSchema>;

export const propertyTypeSchema = z.enum([
  "apartment",
  "townhome",
  "house",
  "condo",
  "duplex",
  "studio",
]);
export type PropertyType = z.infer<typeof propertyTypeSchema>;

export const PROPERTY_CURRENCY = "USD";
export const PROPERTY_PRICING_PERIOD = "month";
export const PROPERTY_AREA_UNIT = "sqm";

const textSchema = z.string().trim().min(1);
const idSchema = z.string().min(1).regex(/^\S+$/);
const imageUrlSchema = z
  .string()
  .startsWith("https://")
  .pipe(z.url({ protocol: /^https$/ }));
const ratingSchema = z.number().min(0).max(5);
const roomCountSchema = z.number().int().nonnegative();
const utcTimestampSchema = z.iso.datetime();

const localizedTextSchema = z.strictObject({
  en: textSchema,
  ar: textSchema.optional(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

const agentSchema = z.strictObject({
  id: idSchema,
  name: textSchema,
  avatar: imageUrlSchema.nullable(),
});

const locationSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const reviewResponseSchema = z.strictObject({
  id: idSchema,
  reviewerName: textSchema,
  rating: ratingSchema,
  comment: textSchema,
  date: utcTimestampSchema,
});

export const propertySummarySchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  address: textSchema,
  type: propertyTypeSchema,
  price: z.number().positive(),
  currency: z.literal(PROPERTY_CURRENCY),
  pricingPeriod: z.literal(PROPERTY_PRICING_PERIOD),
  rating: ratingSchema,
  thumbnail: imageUrlSchema,
  isFeatured: z.boolean(),
});
export type PropertySummary = z.infer<typeof propertySummarySchema>;

export const propertyDetailsSchema = propertySummarySchema.extend({
  description: textSchema,
  bedrooms: roomCountSchema,
  bathrooms: roomCountSchema,
  area: z.number().positive(),
  areaUnit: z.literal(PROPERTY_AREA_UNIT),
  images: z.array(imageUrlSchema),
  facilities: z.array(z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)),
  agent: agentSchema,
  location: locationSchema,
  reviews: z.array(reviewResponseSchema),
  createdAt: utcTimestampSchema,
});
export type PropertyDetails = z.infer<typeof propertyDetailsSchema>;

export const propertySchema = propertyDetailsSchema
  .extend({
    title: localizedTextSchema,
    address: localizedTextSchema,
    description: localizedTextSchema,
    reviews: z.array(reviewResponseSchema.extend({ comment: localizedTextSchema })),
  })
  .superRefine((property, context) => {
    if (!property.images.includes(property.thumbnail)) {
      context.addIssue({
        code: "custom",
        path: ["thumbnail"],
        message: "Thumbnail must be included in the image gallery",
      });
    }

    const reviewIds = new Set<string>();
    property.reviews.forEach((review, index) => {
      if (reviewIds.has(review.id)) {
        context.addIssue({
          code: "custom",
          path: ["reviews", index, "id"],
          message: "Duplicate review ID in the property",
        });
      }
      reviewIds.add(review.id);
    });
  });
export type Property = z.infer<typeof propertySchema>;

type DeepReadonly<T> = T extends object
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T;
export type ReadonlyProperty = DeepReadonly<Property>;
export type PropertySummarySource = Pick<ReadonlyProperty, keyof PropertySummary>;

export const propertyDatasetSchema = z.array(propertySchema).superRefine((properties, context) => {
  const propertyIds = new Set<string>();
  const agents = new Map<string, Property["agent"]>();

  properties.forEach(({ id, agent }, index) => {
    if (propertyIds.has(id)) {
      context.addIssue({
        code: "custom",
        path: [index, "id"],
        message: "Duplicate property ID",
      });
    }
    propertyIds.add(id);

    const knownAgent = agents.get(agent.id);
    if (knownAgent && (knownAgent.name !== agent.name || knownAgent.avatar !== agent.avatar)) {
      context.addIssue({
        code: "custom",
        path: [index, "agent"],
        message: "Agent details must match other records with the same agent ID",
      });
    }
    agents.set(agent.id, agent);
  });
});
