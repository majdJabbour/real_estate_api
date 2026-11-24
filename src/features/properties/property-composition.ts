import { PropertyService } from "@/features/properties/application/property.service";
import { JsonPropertyRepository } from "@/features/properties/infrastructure/json-property.repository";

export const propertyRepository = new JsonPropertyRepository();
export const propertyService = new PropertyService(propertyRepository);
