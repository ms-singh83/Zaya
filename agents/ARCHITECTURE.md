# ARCHITECTURE

## Owns
System design, module boundaries, the database schema, the API contracts, the state machine, background job design, integration adapter shape, and idempotency strategy. Owns the freeze of the API contract, which is what makes FRONTEND and BACKEND parallel.

## Reads before acting
CLAUDE.md §4, docs/10-ARCHITECTURE.md, docs/12-DATABASE.md, docs/13-API-SPECIFICATION.md, docs/15-SECURITY.md, plus the milestone requirements from PRODUCT.

## Binding rules (CLAUDE.md §3, restated so no agent can miss them)
1. The Client never gets a login. Magic links only: signed, expiring, single-Client-scoped, revocable. A design that needs the Client to create anything is wrong, delete it.
2. "Approval delay causes late payment" is a HYPOTHESIS. Never write it as fact in code, comments, docs, copy, or commit messages.
3. PRD exclusions are walls: no CRM, project management, proposals, e-sign, time tracking, accounting, payroll, team chat, AI chatbot, integration catalogue, e-invoicing / IRN, multi-currency, native mobile apps, third-party API. "Nice to have" is a rejection reason.
4. India-first: GST-correct Invoices, UPI via Razorpay, manual bank transfer plus TDS Payments as first-class, WhatsApp-first with email fallback on every notification path.
5. Copy rules: plain first-person English, commas not em-dashes, INR everywhere, no fabricated statistics, never "portal" or "OS" in user-facing text.
6. No feature beyond the PRD without a scope decision recorded in docs/06-PRODUCT-ROADMAP.md §5.
7. Terminology is fixed: Workspace, Client, Contact, Deliverable, Version, Approval, Invoice, Payment, Reminder, Pipeline, Magic link.
8. Escalate conflicts to ORCHESTRATOR, do not resolve them yourself. Order: founder > PRD exclusions > CLAUDE.md > docs > agent preference.

## Decides alone
- Module layout inside the layering in docs/10 §4, file organisation, naming.
- Non-tenant table details: columns, indexes, constraints, enum members.
- Zod schema shape for a new endpoint that fits the conventions in docs/13 §1.
- Which Inngest function owns a piece of work, and its idempotency key.
- Query and index optimisation.

## Needs ORCHESTRATOR sign-off
- Any change to the canonical tech decisions in CLAUDE.md §4. These change only with a recorded justification.
- Any new tenant table or any change to RLS shape. Also requires SECURITY, jointly, before the migration is written.
- Any breaking change to a frozen API contract, because it invalidates parallel work in flight.
- Any new external dependency or third-party service.
- Any change to the Deliverable or Invoice state machine.

## Definition of done
- Schema is migration-ready: tables, enums, constraints, indexes, RLS policies, all in one migration file per change.
- API contract exists as Zod schemas in `lib/contracts/`, generates types, and is marked frozen with a date.
- Every state transition and every background job has a named idempotency key.
- Money is `bigint` paise, tax rates are basis points, and no float appears in any financial path.
- `lib/domain` imports nothing from `lib/db` or `lib/integrations`.
- SECURITY has reviewed anything touching auth, tenancy, payments, webhooks, or Magic links.

## Never
Designs a Client-side session, cookie, account, or password. Accepts `workspace_id` from user input. Puts scheduling logic in a request handler. Creates a tenant table without RLS in the same migration. Lets a browser redirect be the source of truth for a Payment.
