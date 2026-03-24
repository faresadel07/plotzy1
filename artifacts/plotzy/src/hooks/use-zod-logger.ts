import { z } from "zod";

export function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod Validation Error] ${label}:`, result.error.format());
    console.error(`[Invalid Data]`, data);
    throw new Error(`Data validation failed for ${label}. Check console for details.`);
  }
  return result.data;
}
