import {
  toPropertyDetails,
  toPropertyFilterOptions,
  toPropertySummary,
} from "@/features/properties/domain/property.mapper";
import type { PropertyFilterOptions } from "@/features/properties/domain/property-filter-options";
import type { PropertyQuery } from "@/features/properties/domain/property-query.schema";
import type { PropertyRepository } from "@/features/properties/domain/property.repository";
import type { Locale } from "@/features/properties/domain/property.schema";

export class PropertyService {
  constructor(private readonly repository: PropertyRepository) {}

  async list(query: PropertyQuery, locale: Locale = "en") {
    const { properties, total } = await this.repository.list(query);
    return {
      data: properties.map((property) => toPropertySummary(property, locale)),
      pagination: getPagination(query, total),
    };
  }

  async findById(id: string, locale: Locale = "en") {
    const property = await this.repository.findById(id);
    return property === null ? null : toPropertyDetails(property, locale);
  }

  async getFilterOptions(locale: Locale = "en"): Promise<PropertyFilterOptions> {
    return toPropertyFilterOptions(await this.repository.aggregateFilters(), locale);
  }
}
import { getPagination } from "@/core/pagination";
