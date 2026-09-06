import {
  patchWorkspaceBrandingRequestSchema,
  patchWorkspaceRequestSchema,
  type PatchWorkspaceBrandingRequest,
  type PatchWorkspaceRequest,
  type WorkspaceOnboardingResponse,
  type WorkspaceResponse,
} from '@/lib/contracts';

/**
 * Data-layer seam for the four M1 Workspace endpoints (docs/13-API-SPECIFICATION.md
 * §2, frozen shapes in lib/contracts/workspace.ts). BACKEND has not built
 * `app/api/v1/workspace*` yet and Supabase credentials are pending from the founder,
 * so there is no real fetch here. `createMockWorkspaceClient` is an in-memory stand-in
 * so the settings screens are genuinely usable and testable today; it is not a live
 * session and it makes no network call.
 *
 * TODO(pending creds + backend routes): replace `createMockWorkspaceClient` calls
 * with a `fetch('/api/v1/workspace', ...)` backed implementation of the same
 * `WorkspaceClient` interface once both exist. No screen should need to change.
 */

export interface WorkspaceServiceError {
  code: string;
  message: string;
  field: string | null;
}

export type WorkspaceResult<T> = { ok: true; data: T } | { ok: false; error: WorkspaceServiceError };

export interface WorkspaceClient {
  getWorkspace(): Promise<WorkspaceResult<WorkspaceResponse>>;
  patchWorkspace(input: PatchWorkspaceRequest): Promise<WorkspaceResult<WorkspaceResponse>>;
  patchBranding(input: PatchWorkspaceBrandingRequest): Promise<WorkspaceResult<WorkspaceResponse>>;
  getOnboarding(): Promise<WorkspaceResult<WorkspaceOnboardingResponse>>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultWorkspace(): WorkspaceResponse {
  const ts = nowIso();
  return {
    id: '00000000-0000-4000-8000-000000000000',
    name: 'My agency',
    legal_name: null,
    gstin: null,
    pan: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    pincode: null,
    state_code: null,
    logo_url: null,
    brand_color: '#4F46E5',
    invoice_prefix: 'INV',
    default_hsn_sac: null,
    default_gst_rate_bps: 1800,
    bank_account_name: null,
    bank_account_number: null,
    bank_ifsc: null,
    bank_branch: null,
    whatsapp_enabled: false,
    auto_invoice_buffer_minutes: 0,
    payment_terms_days: 7,
    onboarding_completed_at: null,
    created_at: ts,
    updated_at: ts,
  };
}

/**
 * Mirrors the "business details done" half of docs/08-USER-FLOWS.md F1 step 2.
 * GSTIN is deliberately not required here: GST registration itself is not
 * universal for a small agency below the threshold, and lib/contracts/workspace.ts
 * keeps `gstin` nullable for the same reason. BACKEND owns the real rule; this is a
 * placeholder heuristic for the mock.
 */
function isBusinessDone(w: WorkspaceResponse): boolean {
  return Boolean(w.name && w.state_code && w.address_line1 && w.city && w.pincode && w.invoice_prefix);
}

export function createMockWorkspaceClient(seed?: Partial<WorkspaceResponse>): WorkspaceClient {
  let workspace: WorkspaceResponse = { ...defaultWorkspace(), ...seed };

  return {
    async getWorkspace() {
      return { ok: true, data: workspace };
    },

    async patchWorkspace(input) {
      const parsed = patchWorkspaceRequestSchema.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return {
          ok: false,
          error: {
            code: 'validation_error',
            message: issue?.message ?? 'Check the highlighted fields and try again.',
            field: issue?.path.join('.') ?? null,
          },
        };
      }
      workspace = { ...workspace, ...parsed.data, updated_at: nowIso() };
      return { ok: true, data: workspace };
    },

    async patchBranding(input) {
      const parsed = patchWorkspaceBrandingRequestSchema.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return {
          ok: false,
          error: {
            code: 'validation_error',
            message: issue?.message ?? 'Check the highlighted fields and try again.',
            field: issue?.path.join('.') ?? null,
          },
        };
      }
      workspace = { ...workspace, ...parsed.data, updated_at: nowIso() };
      return { ok: true, data: workspace };
    },

    async getOnboarding() {
      return {
        ok: true,
        data: {
          business_done: isBusinessDone(workspace),
          payment_done: false,
          // Read tables that do not exist until M2/M3/M4 (lib/contracts/workspace.ts
          // comment). The mock reports the same false default BACKEND will return.
          first_client_done: false,
          first_deliverable_sent: false,
        },
      };
    },
  };
}
