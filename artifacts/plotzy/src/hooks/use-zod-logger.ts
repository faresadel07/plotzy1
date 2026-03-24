import { z } from "zod";

export function parseWithLogging<T>(schema: z.ZodSchema<T> | undefined | null, data: unknown, label: string): T {
  if (!schema) return data as T;
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[Zod Validation Warning] ${label}:`, result.error.format());
    console.warn(`[Invalid Data]`, data);
    return data as T;
  }
  return result.data;
}
