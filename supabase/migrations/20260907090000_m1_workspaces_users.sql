-- M1 — Workspace, auth, tenancy baseline
-- docs/12-DATABASE.md §1 (enums), §2 workspaces/users, §3 RLS. docs/07-EXECUTION-PLAN.md M1.
-- Authored by ARCHITECTURE (Dwight), not yet applied: Supabase project credentials are pending
-- from the founder (docs/07 "Blocked-on-founder register").
--
-- SECURITY (Creed) reviewed the original version of this migration (commit 543609a) and returned
-- REQUEST CHANGES: the RLS design itself (recursion fix, SECURITY DEFINER safety, no client
-- insert path) was verified sound; four additive fixes were required and are folded in below —
-- §6a (column-level lockdown on the two Razorpay secret columns), the `full_name_input` bound and
-- sanitize in §8, the non-null-email comment on `users.email`, and this migration is not
-- mergeable/usable until the cross-tenant RLS test suite in `supabase/tests/rls/` (authored,
-- pending first execution against a live Supabase project) passes. See
-- docs/handoffs/M1-architecture-handoff.md for the original review request.
--
-- Design decision flagged for SECURITY review: docs/12 §3 gives one generic RLS policy shape
-- for every tenant table, `workspace_id = (select workspace_id from users where id = auth.uid())`.
-- Applied literally to the `users` table itself, that shape self-references `users` inside its
-- own policy and Postgres raises "infinite recursion detected in policy for relation users".
-- This migration instead defines a `SECURITY DEFINER` helper, `app_private.current_workspace_id()`,
-- that every tenant-table policy (this one and future ones) can call without recursing, because a
-- SECURITY DEFINER function owned by the migration role reads `users` without re-entering RLS.
-- `users` itself does not use the helper: a user may only ever read or update their own profile
-- row (`id = auth.uid()`), which is sufficient for V1 (one owner per Workspace, no member rows)
-- and sidesteps the recursion question entirely for that table.

begin;

-- ── 0. Extensions ───────────────────────────────────────────────────────────
-- gen_random_uuid() is built into Postgres 13+ (Supabase runs 15+), pgcrypto kept for parity
-- with older Supabase project defaults and other cryptographic helpers used later.
create extension if not exists pgcrypto;

-- ── 1. Enums (docs/12-DATABASE.md §1, created in full so later milestones need no enum-only
--    migration; unused enums here are inert until the tables that reference them land) ───────
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

-- ── 2. updated_at trigger helper (docs/12 §0, reused by every table going forward) ─────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 3. workspaces (Agency) — docs/12-DATABASE.md §2 ─────────────────────────────────────────
create table public.workspaces (
  id                                 uuid primary key default gen_random_uuid(),
  name                               text not null,
  legal_name                         text,
  gstin                              text,                      -- 15 chars, format-checked in the application (docs/12 §2)
  pan                                text,
  address_line1                     text,
  address_line2                     text,
  city                               text,
  state                              text,
  pincode                            text,
  state_code                        text,                      -- 2-digit GST state code, drives place of supply
  logo_url                           text,
  brand_color                       text not null default '#4F46E5',
  invoice_prefix                    text not null default 'INV',
  default_hsn_sac                   text,
  default_gst_rate_bps              int not null default 1800,
  bank_account_name                 text,
  bank_account_number               text,
  bank_ifsc                         text,
  bank_branch                       text,
  razorpay_key_id                   text,
  razorpay_key_secret_encrypted     text,                      -- encrypted at rest, never returned by any API (docs/15 §6)
  razorpay_webhook_secret_encrypted text,
  whatsapp_enabled                  boolean not null default false,
  auto_invoice_buffer_minutes       int not null default 0,
  payment_terms_days                int not null default 7,
  onboarding_completed_at           timestamptz,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now(),
  constraint workspaces_auto_invoice_buffer_minutes_range
    check (auto_invoice_buffer_minutes between 0 and 1440),
  constraint workspaces_payment_terms_days_positive
    check (payment_terms_days >= 0)
);

comment on table public.workspaces is 'The Agency tenant. One row per paying customer. docs/12-DATABASE.md §2.';
comment on column public.workspaces.gstin is '15 chars, format-checked in the application, not the database (docs/12 §2).';

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ── 4. users (Agency) — docs/12-DATABASE.md §2 ──────────────────────────────────────────────
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  email         text not null,
  -- Assumes Supabase Auth always yields a non-null `auth.users.email` (true today: docs/15
  -- §2 lists email/Google as the only Agency auth methods). Revisit this NOT NULL, and the
  -- `handle_new_user` insert below that populates it from `new.email` unguarded, if a
  -- phone-only auth method is ever added (Creed review FIX 4, informational only).
  full_name     text,
  role          user_role not null default 'owner',
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- V1 allows exactly one owner per Workspace and no member rows (docs/12 §2). The `member`
  -- enum value exists for the V1.1 multi-seat feature and is intentionally unreachable until
  -- that milestone's migration relaxes this check. Drop this constraint in that migration, not before.
  constraint users_v1_owner_only check (role = 'owner')
);

comment on table public.users is 'Agency user profile, one row per auth.users row. docs/12-DATABASE.md §2.';
comment on constraint users_v1_owner_only on public.users is
  'V1 scope wall: no member seats yet. Remove only as part of the V1.1 multi-user-seats migration.';

create index users_workspace_id_idx on public.users (workspace_id);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ── 5. RLS helper (avoids self-referential recursion on `users`, reused by every future
--    tenant table's policies) — schema kept out of the `public`/PostgREST-exposed surface ───
create schema if not exists app_private;

create or replace function app_private.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id from public.users where id = auth.uid();
$$;

comment on function app_private.current_workspace_id() is
  'Returns the calling Agency user''s workspace_id. SECURITY DEFINER so tenant-table RLS '
  'policies can call it without re-entering RLS on `users` (which would recurse). Never '
  'exposed over PostgREST: lives in app_private, not public, and is not granted to anon.';

revoke all on function app_private.current_workspace_id() from public;
grant execute on function app_private.current_workspace_id() to authenticated;

-- ── 6. RLS — workspaces ──────────────────────────────────────────────────────────────────
-- `workspaces.id` is the tenant key here (there is no separate `workspace_id` column on this
-- table). No INSERT policy for `authenticated`: a Workspace is created only by the
-- `handle_new_user` trigger below (SECURITY DEFINER, runs as the migration role, bypasses RLS
-- by design), never by a direct client insert. No DELETE policy: Workspaces are not deleted
-- through the app in V1.
alter table public.workspaces enable row level security;

create policy workspaces_tenant_read on public.workspaces
  for select to authenticated
  using (id = app_private.current_workspace_id());

create policy workspaces_tenant_update on public.workspaces
  for update to authenticated
  using  (id = app_private.current_workspace_id())
  with check (id = app_private.current_workspace_id());

-- ── 6a. Column-level lockdown — Razorpay secrets (docs/15-SECURITY.md §6, Creed review FIX 2) ──
-- RLS makes the *row* readable/writable to the owning Workspace, which is correct: the Agency
-- needs to see `razorpay_key_id` and everything else on its own row. But the two encrypted
-- secret columns must never be selectable or updatable by a browser client even for its own
-- Workspace — only a server process using the `service_role` key (which bypasses RLS and table
-- ACLs entirely) may touch them. `anon` and `authenticated` get their baseline table-level
-- SELECT/UPDATE privileges from Supabase's project-wide default privileges (granted outside this
-- migration, at project provisioning, to every table in `public`); this narrows those two roles
-- at the column level on top of the row-level policy above, so even a correctly-scoped,
-- correctly-authenticated request can never read or write the raw secret values through
-- PostgREST. No corresponding GRANT is needed for `service_role`: it already holds full table
-- privileges independent of these column-level ACLs.
revoke select (razorpay_key_secret_encrypted, razorpay_webhook_secret_encrypted),
       update (razorpay_key_secret_encrypted, razorpay_webhook_secret_encrypted)
  on public.workspaces from authenticated, anon;

comment on column public.workspaces.razorpay_key_secret_encrypted is
  'Encrypted at rest. SELECT/UPDATE revoked from anon and authenticated (see migration §6a) — '
  'readable/writable only by service_role. Never returned by any API (docs/15-SECURITY.md §6).';
comment on column public.workspaces.razorpay_webhook_secret_encrypted is
  'Encrypted at rest. SELECT/UPDATE revoked from anon and authenticated (see migration §6a) — '
  'readable/writable only by service_role. Never returned by any API (docs/15-SECURITY.md §6).';

-- ── 7. RLS — users ───────────────────────────────────────────────────────────────────────
-- Own-row only. Sufficient for V1 (one owner per Workspace, no member rows to look up). No
-- INSERT policy for `authenticated`: a `users` row is created only by `handle_new_user`. No
-- DELETE policy: profile rows are removed by the `auth.users` cascade, not by the app.
alter table public.users enable row level security;

create policy users_own_row_read on public.users
  for select to authenticated
  using (id = auth.uid());

create policy users_own_row_update on public.users
  for update to authenticated
  using  (id = auth.uid())
  with check (id = auth.uid() and workspace_id = app_private.current_workspace_id());

-- ── 8. Workspace-on-signup — docs/07-EXECUTION-PLAN.md M1 "Workspace created on first login"
-- Standard Supabase pattern: a SECURITY DEFINER trigger on `auth.users` creates the Workspace
-- and the owner's `users` row atomically, in the same transaction as the Auth signup, so there
-- is never a moment where a signed-in Agency user has no Workspace to be scoped to, and no
-- client-side code path ever inserts into `workspaces` or `users` directly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  -- raw_user_meta_data is client-controlled at signup (Supabase Auth accepts arbitrary metadata
  -- from the signup call), and `workspaces.name` seeded from it here is Client-visible (Agency
  -- branding on invoices and the Magic-link view), so treat it as untrusted input: trim, drop it
  -- if it's empty after trimming, and cap it at the same 200-char max the workspace PATCH
  -- contract enforces (lib/contracts/workspace.ts) so a signup can't seed an unbounded value
  -- into either `workspaces.name` or `users.full_name` ahead of any application-layer
  -- validation (Creed review FIX 3).
  full_name_input text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  insert into public.workspaces (name)
  values (left(coalesce(full_name_input, split_part(new.email, '@', 1)), 200))
  returning id into new_workspace_id;

  insert into public.users (id, workspace_id, email, full_name, role)
  values (new.id, new_workspace_id, new.email, left(full_name_input, 200), 'owner');

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates one Workspace and one owner `users` row per Supabase Auth signup. SECURITY DEFINER '
  'by necessity (the signing-up user has no Workspace yet, so RLS could not otherwise let them '
  'create one). This is the only code path allowed to insert into workspaces or users.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
