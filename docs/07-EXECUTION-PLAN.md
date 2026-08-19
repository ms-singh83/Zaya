# 07 — Execution Plan (V1.0)

ORCHESTRATOR-owned. Created after the Phase 0 audit of 2026-08-19. Sequencing follows CLAUDE.md §6 and docs/06-PRODUCT-ROADMAP.md. Slices are vertical wherever the loop allows: each one ends with something a real user can do.

## Audit baseline (2026-08-19)
Repository contained CLAUDE.md, 12 docs, 10 agent definitions, and **zero application code, zero commits, zero build configuration**. Everything below is greenfield. Nothing is rebuilt because nothing exists.

## Environment constraints found in the audit
| Tool | State | Consequence |
|---|---|---|
| node 25.9.0, npm 11.12.1 | present | fine |
| npm registry | reachable | fine |
| gh 2.96.0 | present | CI setup possible |
| **Supabase CLI** | **absent** | migrations authored as SQL files, applied via CLI once installed or via the hosted project |
| **Docker** | **absent** | `supabase start` cannot run, so the local-Supabase integration tier in docs/16 §3 needs a hosted dev project instead |

## Milestone ladder

Legend: **A** = Agency surface, **C** = Client surface. Every milestone ends with SECURITY (where triggered), QA, and REVIEW per agents/ORCHESTRATOR.md §4.

---

### M0 — Foundation and domain core
**Goal:** a typechecking, testing, linting repository with the pure money maths already proven, before any I/O exists.
**Features:** Next.js App Router + TypeScript strict + Tailwind with semantic tokens from docs/09 §1.3 + shadcn/ui base; Vitest; Playwright; ESLint/Prettier; `lib/` layering per docs/10 §4; GST engine, money/paise helpers, Invoice numbering, TDS settlement, state machine, all pure.
**Dependencies:** none external.
**DB:** none.
**API:** none.
**Frontend:** design tokens, both themes, root layout only. No screens.
**Security:** `.gitignore` covers `.env*`; `.env.example` with no values.
**Tests:** docs/16 §2.1 GST, §2.2 numbering, §2.3 TDS including the ₹75,000 / ₹73,500 / ₹1,500 case, §2.4 state machine, §2.5 reminder scheduling. All pure, no mocks.
**Acceptance:** `lint`, `typecheck`, `unit` green. `lib/domain` at 95% coverage. No float in any financial path.
**Agent:** ARCHITECTURE then BACKEND. QA authors tests in parallel.
**Verification:** CI jobs 1 to 3 green locally.

---

### M1 — Workspace, auth, tenancy baseline
**Goal:** an Agency owner can sign up and land in their own Workspace, and the database refuses cross-Workspace reads.
**Features:** Supabase Auth email + Google; Workspace created on first login; `users` profile row; app shell with sidebar per docs/09 §2.1; business + GST settings screen; branding screen.
**Dependencies:** M0, a Supabase project.
**DB:** `workspaces`, `users`, all enums from docs/12 §1, RLS policies, `updated_at` triggers.
**API:** `GET/PATCH /api/v1/workspace`, `PATCH /workspace/branding`, `GET /workspace/onboarding`.
**Frontend:** auth pages (A), app shell (A), settings: business/GST and branding (A). Light and dark.
**Security:** **mandatory SECURITY review** (auth + tenancy). RLS on both tables, cross-tenant read and write tests, `workspace_id` never accepted from input, service role key confined.
**Tests:** cross-tenant RLS suite; GSTIN format/checksum validation; onboarding state.
**Acceptance:** sign up via both providers, save GST details and branding, cross-tenant test proves isolation.
**Agent:** ARCHITECTURE (schema) → SECURITY (RLS review) → BACKEND ‖ FRONTEND → QA → REVIEW.
**Verification:** RLS suite green, manual signup walkthrough.

---

### M2 — Clients and Contacts
**Goal:** an Agency can add a Client with up to 3 Contacts. Completes CLAUDE.md W1.
**Dependencies:** M1.
**DB:** `clients`, `client_contacts` with the 3-Contact trigger and the at-least-one-channel check, `projects`.
**API:** clients and contacts CRUD, projects CRUD per docs/13 §2.
**Frontend:** Clients list and detail (A), Contact editor (A), Project create (A). Empty, loading, error states.
**Security:** RLS on three new tables plus cross-tenant tests. E.164 and GSTIN validated server-side.
**Tests:** 4th Contact rejected; last Contact not deletable; place of supply defaults from GSTIN.
**Acceptance:** W1 exit criteria in agents/ORCHESTRATOR.md §6.
**Agent:** BACKEND ‖ FRONTEND, SECURITY on RLS, QA, REVIEW.

---

### M3 — Deliverables, Versions, event log (Agency half)
**Goal:** an Agency can create a Deliverable with files and Versions, and every action lands in the append-only audit trail.
**Dependencies:** M2.
**DB:** `deliverables`, `deliverable_versions`, `deliverable_files`, `deliverable_events` with UPDATE/DELETE revoked and the guard trigger; `deliverables` Storage bucket.
**API:** deliverables CRUD, `POST /deliverables/:id/versions`, `POST /deliverables/:id/upload-url`.
**Frontend:** Deliverable create with file upload (A), Deliverable detail with Version history and Timeline component (A).
**Security:** private bucket, path prefixed by `workspace_id`, MIME and size limits, filename sanitising, attachment disposition.
**Tests:** append-only enforcement at the database level; version numbering; state machine rejects illegal transitions.
**Acceptance:** create, upload, add a Version, see the event log.
**Agent:** ARCHITECTURE → SECURITY (storage) → BACKEND ‖ FRONTEND → QA → REVIEW.

---

### M4 — Magic link, Client view, Approve and Request changes  ← the first true vertical slice
**Goal:** the loop's heart. Agency sends, Client opens a link on a phone with no account, approves, Agency sees it.
**Dependencies:** M3.
**DB:** `magic_link_tokens`, `message_log`.
**API:** `POST /deliverables/:id/send` (A); `GET /api/v1/public/deliverable`, `POST /deliverable/approve`, `POST /deliverable/request-changes` (C).
**Frontend:** send dialog (A); `/v/[token]` Deliverable page, approve confirmation sheet, receipt, change-request form, expired-link page (C). Mobile-first, under 100KB JS.
**Security:** **mandatory SECURITY review** (Magic links). 32-byte CSPRNG token, SHA-256 stored, constant-time compare, scope checked against the resource, 404 on any failure, no token in logs or `body_preview`, `noindex`, `no-referrer`, rate limits from docs/15 §4.
**Tests:** **E2E-1**; expired, revoked, wrong-scope, tampered tokens; second Contact sees the receipt not the button (flow E2); Lighthouse mobile budget.
**Acceptance:** PRD acceptance criterion 2. CLAUDE.md W2 exit.
**Agent:** ARCHITECTURE → SECURITY (blocking, before merge) → BACKEND ‖ FRONTEND → QA → REVIEW.
**Verification:** E2E-1 green in a cookie-free context asserting no login affordance exists.

---

### M5 — GST Invoice generation on Approval
**Goal:** Approval mints a correct, numbered, GST-compliant Invoice and PDF without the Agency typing anything.
**Dependencies:** M4, M0 GST engine, Inngest.
**DB:** `invoices`, `invoice_line_items`, `invoice_number_sequences`, `invoices` bucket.
**API:** `GET /invoices`, `GET /invoices/:id`, `POST /invoices/preview`, `GET /invoices/:id/pdf`, `POST /invoices/:id/cancel`; `GET /api/v1/public/invoice` and `/invoice/pdf` (C). Deliberately no `POST /invoices`.
**Frontend:** Invoice list and detail (A); Client Invoice page with bank-transfer block (C).
**Security:** number allocation under a row lock; snapshotted supplier and Client fields; issued Invoice immutable.
**Tests:** intrastate vs interstate splits; FY boundary; concurrent allocation; one Invoice per Approval on a replayed event.
**Acceptance:** PRD acceptance criterion 3.
**Agent:** ARCHITECTURE → BACKEND → FRONTEND → QA → REVIEW.

---

### M6 — Razorpay payment link and webhook
**Goal:** a Client pays and the Invoice flips to paid from the webhook, never from the browser.
**Dependencies:** M5, Razorpay KYC (founder, started W1).
**DB:** `payments`, `webhook_events`.
**API:** `POST /api/webhooks/razorpay`; `PUT /workspace/payment-setup`; `POST /workspace/payment-setup/verify-razorpay`.
**Frontend:** payment setup (A); Pay button and paid state (C).
**Security:** **mandatory SECURITY review** (payments + webhooks). Raw-body HMAC, idempotency on `(provider, provider_event_id)`, key secrets encrypted and write-only.
**Tests:** **E2E-2** including the replayed duplicate; bad signature returns 401 and writes nothing.
**Acceptance:** PRD acceptance criterion 4.
**Agent:** ARCHITECTURE → SECURITY (blocking) → BACKEND ‖ FRONTEND → QA → REVIEW.

---

### M7 — Manual bank and TDS Payment recording
**Goal:** Persona C is usable. Brand clients pay by NEFT with TDS and the Invoice reconciles.
**Dependencies:** M6 (shares `payments`).
**API:** `POST /payments`, `PATCH /payments/:id`, `POST /payments/:id/confirm`.
**Frontend:** record Payment sheet with the live balance line (A); provisional confirm card (A).
**Security:** Agency-only, fully attributed, provisional never settles.
**Tests:** the ₹75,000 / ₹73,500 / ₹1,500 case end to end through the UI; partial leaves the Invoice open (flow E3); overpayment rejected.
**Acceptance:** PRD acceptance criterion 5. CLAUDE.md W3 exit.
**Agent:** BACKEND ‖ FRONTEND → QA → REVIEW.

---

### M8 — Reminder ladder on Inngest
**Goal:** D3/D7/D14 fire without anyone's browser open, stop on Payment, honour pause.
**Dependencies:** M5, M6.
**DB:** `reminders`.
**API:** `POST /invoices/:id/reminders/pause`.
**Frontend:** Reminder schedule and pause toggle on Invoice detail (A).
**Security:** jobs carry ids only, never PII.
**Tests:** docs/16 §2.5 in full, including `date_passed_while_paused` never firing late.
**Acceptance:** PRD acceptance criterion 6.
**Agent:** ARCHITECTURE (job design) → BACKEND → QA → REVIEW.

---

### M9 — Money Pipeline dashboard
**Goal:** the Agency sees where every rupee is stuck.
**Dependencies:** M5 to M8.
**API:** `GET /pipeline`, `/pipeline/waiting-approval`, `/pipeline/waiting-payment`.
**Frontend:** the four Pipeline cards and the two lists per docs/09 §2.2 (A).
**Tests:** totals reconcile against seeded fixtures; aging buckets correct at boundaries.
**Agent:** BACKEND ‖ FRONTEND → QA → REVIEW.

---

### M10 — Email notifications and timeline PDF export
**Goal:** every event has a guaranteed channel, and a dispute has an artefact.
**Dependencies:** M4 to M9, Resend domain verified.
**API:** `GET /deliverables/:id/timeline.pdf`, `GET /messages`, `POST /messages/:id/resend`.
**Frontend:** Messages delivery view (A); Export timeline button (A).
**Tests:** PDF contains sent, viewed, approved, reminded, paid with timestamps.
**Acceptance:** PRD acceptance criterion 7. CLAUDE.md W4 exit.
**Agent:** BACKEND ‖ FRONTEND → QA → REVIEW.

---

### M11 — WhatsApp Cloud API (conditional)
**Goal:** the loop runs in the Client's WhatsApp thread.
**Dependencies:** **Meta business verification and template approval.** If not landed, this milestone is deferred to V1.1 and V1.0 ships email-only, which docs/06 records as an accepted launch state, not a failure.
**API:** `POST /api/webhooks/whatsapp` plus GET verification.
**Features:** 7 templates, interactive buttons, plain-text approval (flow E5), screenshot Payment (flow E4), fallback to email on any failure (flow E1).
**Security:** **mandatory SECURITY review** (webhooks). `X-Hub-Signature-256` on the raw body.
**Acceptance:** PRD acceptance criterion 8 and the full 8. CLAUDE.md W5 exit.
**Agent:** ARCHITECTURE → SECURITY (blocking) → BACKEND → QA → REVIEW.

---

## Critical path and parallelism
```
M0 ─► M1 ─► M2 ─► M3 ─► M4 ─► M5 ─► M6 ─► M7 ─► M8 ─► M9 ─► M10 ─► M11
                                    └─────────────► M8 scheduling design (early)
DEVOPS: CI and environments run alongside from M0, never blocking a slice.
QA:     authors tests against frozen contracts one milestone ahead of implementation.
```
The system becomes demonstrable at **M4** (a real Client approves on a real phone) and commercially useful at **M7** (money reconciles both ways).

## Blocked-on-founder register
| Item | Blocks | Owner | Started |
|---|---|---|---|
| Supabase project credentials | M1 onward | founder | pending |
| Razorpay KYC and live keys | M6 | founder | W1 |
| Meta business verification and 7 templates | M11 | founder | W1 |
| Resend domain verification (SPF, DKIM, DMARC) | M10 | founder | W1 |
| The six open product decisions in §Open decisions | M5 to M7 | founder | pending |

## Open decisions carried from bootstrap
Defaults are recorded so M0 to M4 are unblocked. Each must be confirmed or overturned **before M5 starts**, and any change becomes an SD row in docs/06 §5.
1. One Invoice per Deliverable (unique `deliverable_id`). Default: yes.
2. Reminder ladder counts from issue date, payment terms 7 days. Default: yes.
3. Partial Payment is Agency-visible only in V1.0. Default: yes.
4. Invoice corrections by cancel and reissue, no credit note. Default: yes.
5. Deliverable amount is the pre-GST taxable value. Default: yes.
6. Deliverable amount is required, no zero-amount Deliverables. Default: yes.
