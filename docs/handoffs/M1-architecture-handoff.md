# M1 handoff — Workspace, auth, tenancy baseline

From: ARCHITECTURE. Scope: docs/07-EXECUTION-PLAN.md M1 (`workspaces`, `users`, RLS, `updated_at` triggers, workspace/branding/onboarding contracts). Not applied to any Supabase project — credentials are still pending from the founder.

## Deliverables in this handoff
- `supabase/migrations/20260907090000_m1_workspaces_users.sql` — all enums from docs/12-DATABASE.md §1, `workspaces`, `users`, RLS on both, `updated_at` triggers, and a `handle_new_user` trigger on `auth.users` that creates the Workspace + owner row on signup.
- `lib/contracts/common.ts`, `lib/contracts/workspace.ts`, `lib/contracts/index.ts` — draft (unfrozen) Zod schemas for `GET/PATCH /api/v1/workspace`, `PATCH /workspace/branding`, `GET /workspace/onboarding`.

## What SECURITY must review before this migration is applied or the contract is frozen
1. **RLS recursion fix on `users`.** docs/12 §3's generic policy shape (`workspace_id = (select workspace_id from users where id = auth.uid())`) applied literally to the `users` table's own policies causes Postgres to raise "infinite recursion detected in policy for relation users" — it is a self-referencing subquery. I resolved this with a `SECURITY DEFINER` helper, `app_private.current_workspace_id()` (migration §5), used by every tenant table's policies going forward *except* `users` itself, which instead uses plain `id = auth.uid()` (own-row only, sufficient because V1 has exactly one owner row per Workspace and no member rows). Please verify this reasoning and the helper's `search_path` pinning and grants (only `authenticated` gets `EXECUTE`, `app_private` is not exposed over PostgREST).
2. **`handle_new_user` trigger on `auth.users`** (migration §8) is `SECURITY DEFINER` and is the *only* code path that inserts into `workspaces` or `users` — there is deliberately no `INSERT` RLS policy for `authenticated` on either table, so a client can never create a second Workspace or a `users` row for someone else. Please confirm this is the intended shape versus, e.g., a server-action/service-role path instead of a DB trigger; both are defensible, this is the one I picked because it makes "Workspace created on first login" atomic with the Auth signup itself.
3. **`users_own_row_update` policy's `with check`** re-asserts `workspace_id = app_private.current_workspace_id()` on every update, which is a belt-and-suspenders block against a crafted request trying to move a user to a different Workspace, even though no endpoint exposes `workspace_id` as writable. Worth a second look.
4. **Cross-tenant RLS tests** for `workspaces` and `users` per docs/15-SECURITY.md §2 and docs/16-TESTING-STRATEGY.md §3 do not exist yet — this migration is not mergeable/usable until those tests exist and pass, per the SECURITY review checklist in docs/15 §11.
5. `users_v1_owner_only` is a hard `check (role = 'owner')` enforcing "V1 allows exactly one owner per Workspace and no member rows" (docs/12 §2) at the database level. It is meant to be dropped only by the V1.1 multi-seat migration — flagging so it isn't mistaken for an oversight.

## What BACKEND (‖ FRONTEND) implements next, once SECURITY signs off and the contract is frozen
- Route handlers for `GET/PATCH /api/v1/workspace`, `PATCH /api/v1/workspace/branding`, `GET /api/v1/workspace/onboarding` against `lib/contracts/workspace.ts`. `workspace_id` comes from the session (`lib/auth`), never from the request body, per CLAUDE.md §8 and docs/13 §1.
- `workspace_onboarding_response.first_client_done` and `.first_deliverable_sent` should hardcode `false` until `clients` (M2) and `deliverables`/`deliverable_events` (M3/M4) exist — the response shape is stable now, the two booleans just have no real data source yet.
- `PUT /workspace/payment-setup` and `POST /workspace/payment-setup/verify-razorpay` are **not** in this draft — they're M6 (Razorpay) scope.
- Supabase project credentials are still pending from the founder (docs/07 "Blocked-on-founder register"); this migration cannot actually be applied (`supabase db push` / hosted dev project) until those land.

## Not in scope here (per assignment boundaries)
No backend route handlers, no frontend screens, no contract freeze — ARCHITECTURE does not freeze contracts unilaterally (CLAUDE.md §8, agents/ORCHESTRATOR.md §8 stage 4).
