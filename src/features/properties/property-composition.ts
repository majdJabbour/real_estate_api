import { PropertyService } from "@/features/properties/application/property.service";
import { JsonPropertyRepository } from "@/features/properties/infrastructure/json-property.repository";

export const propertyService = new PropertyService(new JsonPropertyRepository());
