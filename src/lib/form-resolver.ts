import { toNestErrors, validateFieldsNatively } from "@hookform/resolvers";
import type { FieldError, FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * react-hook-form resolver for zod 4 schemas.
 *
 * The installed @hookform/resolvers (v3) only recognises zod 3 errors: with
 * zod 4 a failed check is thrown instead of returned, so the form froze with
 * no message under the wrong field. This returns the errors the way
 * react-hook-form expects, so every field shows what to fix.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodFormResolver(schema: ZodType): Resolver<any> {
  return async (values, _context, options) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      if (options.shouldUseNativeValidation) validateFieldsNatively({}, options);
      return { values: result.data as FieldValues, errors: {} };
    }
    const flat: Record<string, FieldError> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join(".");
      // First message per field wins (the most basic problem comes first)
      if (!flat[path]) flat[path] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors: toNestErrors(flat, options) };
  };
}
