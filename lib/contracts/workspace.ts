import { z } from 'zod';
import { gstRateBpsSchema, gstStateCodeSchema, gstinSchema, hexColorSchema, panSchema, uuidSchema } from './common';

/**
 * Workspace and setup contracts. docs/13-API-SPECIFICATION.md §2 "Workspace and setup".
 * DRAFT — proposed by ARCHITECTURE for M1 (docs/07-EXECUTION-PLAN.md M1). Not frozen.
 * Freezing needs ORCHESTRATOR sign-off per CLAUDE.md §8. Covers only the four M1 endpoints:
 * GET/PATCH /workspace, PATCH /workspace/branding, GET /workspace/onboarding.
 * PUT /workspace/payment-setup and its verify route are M6 scope (Razorpay) and out of this draft.
 */

// ─── GET /api/v1/workspace ──────────────────────────────────────────────────────────────────
// "current Workspace, secrets redacted" (docs/13 §2). Razorpay key/secret columns are never
// serialised here at all, per docs/15-SECURITY.md §6 ("never returned in any response") — this
// draft omits them from the shape entirely rather than nulling them out, so there is no field
// a future change could accidentally start populating.
export const workspaceResponseSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  legal_name: z.string().nullable(),
  gstin: z.string().nullable(),
  pan: z.string().nullable(),
  address_line1: z.string().nullable(),
  address_line2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  pincode: z.string().nullable(),
  state_code: z.string().nullable(),
  logo_url: z.string().nullable(),
  brand_color: z.string(),
  invoice_prefix: z.string(),
  default_hsn_sac: z.string().nullable(),
  default_gst_rate_bps: gstRateBpsSchema,
  bank_account_name: z.string().nullable(),
  bank_account_number: z.string().nullable(),
  bank_ifsc: z.string().nullable(),
  bank_branch: z.string().nullable(),
  whatsapp_enabled: z.boolean(),
  auto_invoice_buffer_minutes: z.number().int().min(0).max(1440),
  payment_terms_days: z.number().int().nonnegative(),
  onboarding_completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;

// ─── PATCH /api/v1/workspace ────────────────────────────────────────────────────────────────
// Business + GST settings. Field list matches docs/13 §2 exactly. `workspace_id` is never a
// field here: it is derived from the session (docs/13 §1), not accepted from the client.
export const patchWorkspaceRequestSchema = z
  .object({
    name: z.string().min(1).max(200),
    legal_name: z.string().max(200).nullable(),
    gstin: gstinSchema.nullable(),
    pan: panSchema.nullable(),
    address_line1: z.string().max(200).nullable(),
    address_line2: z.string().max(200).nullable(),
    city: z.string().max(100).nullable(),
    state: z.string().max(100).nullable(),
    pincode: z.string().max(10).nullable(),
    state_code: gstStateCodeSchema.nullable(),
    invoice_prefix: z.string().min(1).max(20),
    default_hsn_sac: z.string().max(20).nullable(),
    default_gst_rate_bps: gstRateBpsSchema,
    payment_terms_days: z.number().int().min(0).max(365),
    auto_invoice_buffer_minutes: z.number().int().min(0).max(1440),
  })
  .partial();
export type PatchWorkspaceRequest = z.infer<typeof patchWorkspaceRequestSchema>;

// ─── PATCH /api/v1/workspace/branding ───────────────────────────────────────────────────────
export const patchWorkspaceBrandingRequestSchema = z
  .object({
    logo_url: z.string().url().nullable(),
    brand_color: hexColorSchema,
  })
  .partial();
export type PatchWorkspaceBrandingRequest = z.infer<typeof patchWorkspaceBrandingRequestSchema>;

// ─── GET /api/v1/workspace/onboarding ───────────────────────────────────────────────────────
// `first_client_done` and `first_deliverable_sent` read tables that do not exist until M2
// (`clients`) and M3/M4 (`deliverables`, `deliverable_events`). The shape is stable now so
// FRONTEND can build the onboarding checklist against it; BACKEND returns `false` for those
// two fields until the underlying tables land, not an error and not an omitted field.
export const workspaceOnboardingResponseSchema = z.object({
  business_done: z.boolean(),
  payment_done: z.boolean(),
  first_client_done: z.boolean(),
  first_deliverable_sent: z.boolean(),
});
export type WorkspaceOnboardingResponse = z.infer<typeof workspaceOnboardingResponseSchema>;
