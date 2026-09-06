import { z } from 'zod';

/**
 * Shared primitives for lib/contracts/*. DRAFT — proposed by ARCHITECTURE for M1, not frozen.
 * A schema is frozen only once ARCHITECTURE signs off per CLAUDE.md §8 and docs/13-API-SPECIFICATION.md §6.
 */

export const uuidSchema = z.string().uuid();

/** Money in paise. Always a non-negative integer, never a float. docs/12-DATABASE.md §0. */
export const paiseSchema = z.number().int().nonnegative();

/** Tax rate in basis points, e.g. 1800 for 18%. docs/12-DATABASE.md §0. */
export const gstRateBpsSchema = z.number().int().nonnegative();

/**
 * GSTIN: 2-digit state code, 10-char PAN, 1-digit entity code, literal 'Z', 1 checksum char.
 * docs/15-SECURITY.md §8: "GSTIN ... formats are checked on the server."
 */
export const gstinSchema = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN');

/** PAN: 5 letters, 4 digits, 1 letter. */
export const panSchema = z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN');

/** 2-digit GST state code (docs/12-DATABASE.md §2 `state_code`, drives place of supply). */
export const gstStateCodeSchema = z.string().regex(/^[0-9]{2}$/, 'Enter a 2-digit GST state code');

/** IFSC: 4 letters, literal 0, 6 alphanumeric. docs/15-SECURITY.md §8. */
export const ifscSchema = z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code');

export const pincodeSchema = z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit PIN code');

/** Hex color, e.g. #4F46E5. docs/12-DATABASE.md §2 `brand_color`. */
export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a hex color, e.g. #4F46E5');

/** Error envelope shape, every non-2xx response. docs/13-API-SPECIFICATION.md §1. */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().nullable(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
