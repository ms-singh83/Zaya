import type { ZodError } from 'zod';

/** First error message per top-level field, for a simple `{ field: message }` form-error map. */
export function fieldErrors<T extends Record<string, unknown>>(error: ZodError): Partial<Record<keyof T, string>> {
  const result: Partial<Record<keyof T, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in result)) {
      result[key as keyof T] = issue.message;
    }
  }
  return result;
}
