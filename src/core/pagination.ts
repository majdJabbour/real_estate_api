import { z } from "zod";

export const unsignedInteger = z.string().regex(/^\d+$/, "Expected an unsigned integer").transform(Number);

export const paginationFields = {
  page: unsignedInteger.pipe(z.int().min(1).max(1_000_000)).default(1),
  limit: unsignedInteger.pipe(z.int().min(1).max(100)).default(20),
};

export function queryFromSearchParams<Schema extends z.ZodObject>(schema: Schema) {
  return z.preprocess((params, context) => {
    if (!(params instanceof URLSearchParams)) {
      context.addIssue({ code: "custom", path: ["query"], message: "Invalid query parameters" });
      return z.NEVER;
    }
    const fields = new Map<string, string>();
    for (const [key, value] of params) {
      if (!Object.hasOwn(schema.shape, key)) {
        context.addIssue({ code: "custom", path: ["query"], message: "Unknown query parameter" });
        continue;
      }
      if (fields.has(key)) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Query parameter must occur only once",
        });
      }
      fields.set(key, value);
    }
    return Object.fromEntries(fields);
  }, schema);
}

export const pageQuerySchema = queryFromSearchParams(z.strictObject(paginationFields));
export type PaginationQuery = z.output<typeof pageQuerySchema>;

export function getPagination({ page, limit }: PaginationQuery, total: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: totalPages > 0 && page > 1,
  };
}

export type Pagination = ReturnType<typeof getPagination>;
