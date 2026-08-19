# 12 — Database

Postgres on Supabase. Source: CLAUDE.md §4 and §5a, docs/planning/05-MVP-PRD.md.

## 0. Conventions
- `id uuid primary key default gen_random_uuid()`. `created_at`, `updated_at` are `timestamptz not null default now()`, `updated_at` maintained by trigger.
- **All money is `bigint` in paise.** Never float, never numeric-with-decimals in application paths. Column names end in `_paise`.
- **All tax rates are `int` in basis points.** 18% is `1800`.
- Every tenant table carries `workspace_id uuid not null references workspaces(id) on delete cascade`, and every one has RLS enabled.
- Timestamps stored UTC, presented in IST.
- Soft delete only where a Client-visible artefact must survive: Invoices are cancelled, never deleted. Everything else uses hard delete with cascade.
- Naming: snake_case, plural tables, `_id` foreign keys.

## 1. Enums
```sql
create type deliverable_status as enum ('draft','sent','viewed','changes_requested','approved','invoiced');
create type invoice_status     as enum ('draft','issued','paid','cancelled');
create type payment_source     as enum ('gateway','manual','provisional');
create type payment_status     as enum ('provisional','confirmed','failed','refunded');
create type payment_method     as enum ('razorpay','neft','rtgs','imps','upi','cheque','other');
create type reminder_tier      as enum ('gentle','firm','final');
create type reminder_status    as enum ('scheduled','sent','skipped','cancelled');
create type message_channel    as enum ('whatsapp','email');
create type message_status     as enum ('queued','sent','delivered','read','failed','fallback_sent');
create type actor_type         as enum ('agency_user','client_contact','system','gateway');
create type magic_link_scope   as enum ('deliverable','invoice','client');
create type contact_role       as enum ('primary','billing','other');
create type user_role          as enum ('owner','member');
create type event_type as enum (
  'created','sent','delivered','viewed','version_added','changes_requested','approved',
  'invoice_generated','invoice_sent','invoice_cancelled','reminder_sent','reminder_paused',
  'reminder_resumed','payment_recorded','payment_confirmed','paid','timeline_exported','link_revoked'
);
```

## 2. Tables

### workspaces (Agency)
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| name | text not null | display name, shown to the Client |
| legal_name | text | on the Invoice |
| gstin | text | 15 chars, format-checked in the application |
| pan | text | |
| address_line1, address_line2, city, state, pincode | text | |
| state_code | text | 2-digit GST state code, drives place of supply |
| logo_url | text | Supabase Storage public path |
| brand_color | text | hex, defaults to `#4F46E5` |
| invoice_prefix | text not null default 'INV' | |
| default_hsn_sac | text | |
| default_gst_rate_bps | int not null default 1800 | |
| bank_account_name, bank_account_number, bank_ifsc, bank_branch | text | shown to Persona C |
| razorpay_key_id | text | per Workspace |
| razorpay_key_secret_encrypted | text | encrypted at rest, never returned by any API |
| razorpay_webhook_secret_encrypted | text | |
| whatsapp_enabled | boolean not null default false | false runs the Workspace email-only |
| auto_invoice_buffer_minutes | int not null default 0 | 0 to 1440 |
| payment_terms_days | int not null default 7 | drives `due_date` |
| onboarding_completed_at | timestamptz | |

### users (Agency)
`id uuid pk references auth.users(id) on delete cascade`, `workspace_id`, `email text not null`, `full_name text`, `role user_role not null default 'owner'`, `last_seen_at`.
V1 allows exactly one `owner` per Workspace and no `member` rows. The column exists because multi-user seats are V1.1, and adding it later would need a data migration on a live tenant table.

### clients (Agency-managed, the Client's record)
`id`, `workspace_id`, `name text not null`, `gstin text`, `place_of_supply_state_code text` (defaults from `gstin` first two digits when present, otherwise required before an Invoice can issue), `billing_address text`, `notes text`, `archived_at timestamptz`.

### client_contacts (Contact)
`id`, `workspace_id`, `client_id`, `name text not null`, `whatsapp_e164 text`, `email text`, `role contact_role not null default 'primary'`, `is_default boolean not null default false`.
Constraint: at most 3 rows per `client_id`, enforced by a trigger. At least one of `whatsapp_e164` or `email` must be present (`check`). Any Contact can Approve, first Approval wins (flow E2).

### projects
`id`, `workspace_id`, `client_id`, `name text not null`, `description text`, `archived_at`.
A Project is a folder for Deliverables. It is not project management.

### deliverables
| Column | Type | Notes |
|---|---|---|
| id, workspace_id, client_id, project_id | uuid | `project_id` nullable |
| title | text not null | |
| note | text | the Agency's message to the Client |
| status | deliverable_status not null default 'draft' | |
| current_version | int not null default 1 | |
| amount_to_invoice_paise | bigint not null | taxable value, pre-GST |
| gst_rate_bps | int not null | defaults from the Workspace |
| hsn_sac | text | |
| sent_at, first_viewed_at, approved_at | timestamptz | denormalised from events for list sorting |
| approved_by_contact_id | uuid | |
| approved_version | int | |
| invoice_id | uuid | set when the Invoice is generated |

Index: `(workspace_id, status, sent_at desc)` for the waiting-on-approval list.

### deliverable_versions (Version)
`id`, `workspace_id`, `deliverable_id`, `version_number int not null`, `note text`, `external_url text`, `created_by uuid`, `created_at`.
Unique `(deliverable_id, version_number)`. Files live in `deliverable_files`: `id`, `workspace_id`, `deliverable_version_id`, `storage_path text not null`, `file_name`, `mime_type`, `size_bytes bigint`.
No diffing. v1, v2, v3 numbering only.

### deliverable_events (append-only, the audit trail)
| Column | Type |
|---|---|
| id | uuid pk |
| workspace_id, deliverable_id | uuid not null |
| invoice_id, payment_id | uuid null |
| type | event_type not null |
| actor_type | actor_type not null |
| actor_id | uuid null (user or contact) |
| actor_label | text (name captured at write time, so a deleted Contact still reads correctly on the PDF) |
| actor_channel | text null ('web','whatsapp','whatsapp_text','email','api') |
| version_number | int null |
| metadata | jsonb not null default '{}' |
| occurred_at | timestamptz not null default now() |

Append-only enforced: `revoke update, delete on deliverable_events from public, authenticated, anon` plus a `before update or delete` trigger that raises. No RLS policy for UPDATE or DELETE exists at all. Index `(deliverable_id, occurred_at)`.

### invoices
| Column | Type | Notes |
|---|---|---|
| id, workspace_id, client_id | uuid | |
| deliverable_id | uuid unique null | unique gives one Invoice per Deliverable in V1 and makes the Approval job idempotent |
| invoice_number | text not null | rendered, e.g. `INV/2026-27/0012` |
| fy_label | text not null | `2026-27` |
| seq_in_fy | int not null | gapless within `(workspace_id, fy_label)` |
| status | invoice_status not null default 'draft' | |
| issue_date, due_date | date not null | `due_date = issue_date + payment_terms_days` |
| place_of_supply_state_code | text not null | snapshotted from the Client |
| is_interstate | boolean not null | drives CGST+SGST vs IGST |
| supplier_gstin, supplier_legal_name, supplier_address, client_gstin, client_name, client_billing_address | text | snapshotted at issue, an issued Invoice never changes when a master record changes |
| subtotal_paise, cgst_paise, sgst_paise, igst_paise, total_paise | bigint not null | |
| amount_settled_paise | bigint not null default 0 | sum of confirmed Payment gross, maintained in the Payment transaction |
| reminders_paused | boolean not null default false | |
| razorpay_payment_link_id, razorpay_short_url | text | |
| pdf_storage_path | text | rendered once at issue |
| cancelled_at, cancel_reason | timestamptz, text | |
| approval_reference | text | "Approved on 18 Aug 2026, 4:12 PM, Version 3", printed on the PDF |

Unique `(workspace_id, invoice_number)` and `(workspace_id, fy_label, seq_in_fy)`.
Derived, not stored: `balance_paise = total_paise - amount_settled_paise`; `overdue = status = 'issued' and due_date < current_date and balance_paise > 0`.

### invoice_number_sequences
`workspace_id`, `fy_label`, `last_seq int not null default 0`, primary key `(workspace_id, fy_label)`.
Allocation runs `select ... for update` on this row inside the Invoice transaction. Gapless and sequential per financial year is a legal requirement, so it is never generated from a count or a max.

### invoice_line_items
`id`, `workspace_id`, `invoice_id`, `position int`, `description text not null`, `hsn_sac text`, `quantity numeric(12,3) not null default 1`, `unit_price_paise bigint not null`, `gst_rate_bps int not null`, `taxable_paise bigint not null`, `cgst_paise`, `sgst_paise`, `igst_paise` bigint not null default 0.
Tax is computed per line and summed to the Invoice, never computed on the Invoice total. Rounding: round each line's tax half-up to the nearest paisa, then sum.

### payments
| Column | Type | Notes |
|---|---|---|
| id, workspace_id, client_id, invoice_id | uuid | |
| source | payment_source not null | gateway, manual, provisional |
| method | payment_method not null | |
| status | payment_status not null | |
| gross_paise | bigint not null default 0 | amount settled against the Invoice |
| tds_paise | bigint not null default 0 | as entered by the Agency, Zaya does not compute the TDS rate |
| net_received_paise | bigint not null default 0 | `gross - tds` by default, editable |
| received_at | timestamptz | |
| reference | text | UTR, cheque number, or Razorpay payment id |
| razorpay_payment_id, razorpay_payment_link_id | text | |
| evidence_storage_path | text | screenshot or bank advice |
| recorded_by | uuid null | null for gateway |
| confirmed_by, confirmed_at | uuid, timestamptz | the Agency one-tap confirm for provisional |
| gateway_payload | jsonb | |
| idempotency_key | text | unique per Workspace |

Check: `net_received_paise = gross_paise - tds_paise` unless explicitly overridden by a `manual_override boolean not null default false`.
Settlement rule: only `status = 'confirmed'` rows count toward `amount_settled_paise`. A `provisional` Payment never moves an Invoice to `paid` (flow E4).
Worked example (acceptance criterion 5): Invoice `total_paise = 7500000`, Payment `gross_paise = 7500000`, `tds_paise = 150000`, `net_received_paise = 7350000`, balance ₹0, Invoice `paid`.

### reminders
`id`, `workspace_id`, `invoice_id`, `tier reminder_tier not null`, `scheduled_for timestamptz not null`, `status reminder_status not null default 'scheduled'`, `sent_at`, `skip_reason text`, `message_log_id uuid`, `inngest_run_id text`.
Unique `(invoice_id, tier)`, which makes the ladder idempotent. Skipped tiers record why (`paid`, `paused`, `cancelled`, `date_passed_while_paused`).

### message_log
`id`, `workspace_id`, `client_id`, `contact_id`, `channel message_channel not null`, `template_name text`, `subject text`, `body_preview text`, `status message_status not null default 'queued'`, `provider_message_id text`, `provider_error_code text`, `provider_error_message text`, `fallback_of_id uuid references message_log(id)`, `related_deliverable_id`, `related_invoice_id`, `queued_at`, `sent_at`, `delivered_at`, `read_at`, `payload jsonb`.
This table powers the Messages view in the Agency app. `body_preview` is truncated and must never contain a token or a full Magic link URL.

### magic_link_tokens (Magic link)
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| workspace_id, client_id | uuid not null | scoping is mandatory |
| contact_id | uuid null | which Contact this link was minted for |
| scope | magic_link_scope not null | |
| resource_id | uuid not null | deliverable, invoice, or client id |
| token_hash | text not null unique | SHA-256 of the raw token, the raw token is never stored |
| expires_at | timestamptz not null | default now() + 30 days |
| revoked_at | timestamptz | |
| last_used_at | timestamptz | |
| use_count | int not null default 0 | |
| created_by | uuid | |

Index `(client_id, scope, resource_id)` so a resend reuses the live token instead of minting a new one, which keeps bookmarks working (flow F2.4).

### webhook_events (idempotency and replay protection)
`id`, `provider text not null` (`razorpay`, `whatsapp`, `resend`), `provider_event_id text not null`, `event_type text`, `signature_verified boolean not null`, `received_at`, `processed_at`, `payload jsonb`, `error text`.
Unique `(provider, provider_event_id)`. A duplicate insert means the event was already accepted, so the handler returns 200 and does nothing.

## 3. RLS
Enabled on every table listed above. Policy shape for every tenant table:
```sql
alter table <t> enable row level security;
create policy tenant_read on <t> for select to authenticated
  using (workspace_id = (select workspace_id from users where id = auth.uid()));
create policy tenant_write on <t> for insert to authenticated
  with check (workspace_id = (select workspace_id from users where id = auth.uid()));
create policy tenant_update on <t> for update to authenticated
  using  (workspace_id = (select workspace_id from users where id = auth.uid()))
  with check (workspace_id = (select workspace_id from users where id = auth.uid()));
```
Exceptions:
- `deliverable_events` gets SELECT and INSERT only. No UPDATE and no DELETE policy exists, and both are revoked at the grant level.
- `invoices` and `invoice_line_items` get no DELETE policy. Issued Invoices are cancelled.
- `webhook_events` and `magic_link_tokens` are service-role only, with no `anon` or `authenticated` policy at all.
- The `anon` role has no policy on any table. Client Magic link reads never touch the anon role, they go through the confined service-role service layer described in docs/10-ARCHITECTURE.md §5.

Every table ships with a cross-tenant read test before it is used by a feature (docs/16-TESTING-STRATEGY.md §3).

## 4. Storage buckets
| Bucket | Public | Path |
|---|---|---|
| `deliverables` | private | `{workspace_id}/{client_id}/{deliverable_id}/{version}/{filename}` |
| `invoices` | private | `{workspace_id}/{invoice_id}.pdf` |
| `payment-evidence` | private | `{workspace_id}/{payment_id}/{filename}` |
| `branding` | public | `{workspace_id}/logo.{ext}` |
Client access to private objects is a signed URL of at most 15 minutes, minted only after Magic link verification.

## 5. Migrations
Supabase CLI, one migration per change, forward-only, checked in under `supabase/migrations/`. Never edit an applied migration. Every migration that adds a tenant table must add its RLS policies in the same file, and CI fails a migration that creates a table with `workspace_id` and no `enable row level security`.
