# CLAUDE.md — ZAYA

India-first Work → Cash platform for small agencies.

One line: the moment a client approves a deliverable, the GST invoice sends itself with a payment link, and reminders escalate until the money lands.

Customer-facing pitch: "See where every rupee is stuck, and stop chasing it manually."

NEVER use "OS" or "portal" in any user-facing text.

---

## 1. PROJECT SOURCE OF TRUTH

Zaya is developed using Munder Difflin with Michael acting as the runtime-level
manager and the Zaya ORCHESTRATOR acting as the project's coordination
authority.

Read these files according to their purpose:

### Project rules

- `CLAUDE.md` — repository-wide engineering and product rules
- `MUNDER-DIFFLIN.md` — Munder Difflin operating model and agent coordination

### Product specification

- `docs/planning/05-MVP-PRD.md` — canonical V1.0 MVP specification

### Product and technical documentation

- `docs/00-PRODUCT-VISION.md`
- `docs/02-ICP-AND-PERSONAS.md`
- `docs/06-PRODUCT-ROADMAP.md`
- `docs/08-USER-FLOWS.md`
- `docs/09-UX-UI-SPECIFICATION.md`
- `docs/10-ARCHITECTURE.md`
- `docs/12-DATABASE.md`
- `docs/13-API-SPECIFICATION.md`
- `docs/15-SECURITY.md`
- `docs/16-TESTING-STRATEGY.md`
- `docs/17-DEPLOYMENT.md`

### Agent role definitions

- `agents/ORCHESTRATOR.md`
- `agents/PRODUCT.md`
- `agents/ARCHITECTURE.md`
- `agents/FRONTEND.md`
- `agents/BACKEND.md`
- `agents/QA.md`
- `agents/SECURITY.md`
- `agents/DEVOPS.md`
- `agents/DOCUMENTATION.md`
- `agents/REVIEW.md`

The PRD defines what V1.0 must do.

This file defines repository-wide rules and technical constraints.

`MUNDER-DIFFLIN.md` defines how the agent organization operates.

`agents/*.md` defines specialist responsibilities.

`docs/*.md` defines detailed product and technical specifications.

No lower-level file may silently override a higher-level rule.

---

## 2. PRODUCT IN 60 SECONDS

Zaya serves exactly TWO end users in V1, on two different surfaces.

### User 1 — AGENCY

The paying customer.

Target:

2–15 person Indian agencies, including:

- social media
- content
- influencer
- creative
- digital
- video
- web

They log in and use the full Agency application:

- dashboard
- clients
- deliverables
- invoices
- payments
- reminders
- Money Pipeline

Their job-to-be-done:

"Get paid faster with less awkward chasing, and have proof when clients
dispute."

### User 2 — CLIENT

The agency's customer.

The Client NEVER:

- logs in
- creates an account
- creates a password
- installs anything

This is a hard architectural law.

The Client receives a WhatsApp or email message containing a signed magic
link.

The link opens a branded, mobile-first web experience.

The Client can only:

- view work
- Approve
- Request changes
- view invoice
- Pay by UPI/card
- view bank-transfer instructions

If any design requires the Client to create an account or login, that design
is wrong.

Delete it.

---

## 3. CANONICAL PRODUCT STATE MACHINE

The primary product workflow is:

draft
→ sent
→ viewed
→ changes_requested
→ approved
→ invoiced
→ reminded
→ paid / overdue

Every meaningful transition must be represented by an append-only event.

The event log is the audit trail.

Example:

"Approved — 18 Aug, 4:12 PM — Version 3"

The audit trail is a core product value.

Do not create contradictory state representations between:

- database
- backend
- frontend
- notifications
- payment state

---

## 4. HARD PRODUCT RULES

These rules apply to every implementation.

### 4.1 Client authentication

CLIENT NEVER GETS A LOGIN.

Magic links only:

- signed
- expiring
- single-client-scoped
- revocable

Never create a Client authentication system.

Never create:

- Client passwords
- Client signup
- Client accounts
- Client workspaces
- Client login pages

---

### 4.2 Approval hypothesis

"Approval delay causes late payment" is a HYPOTHESIS.

Never state this as an established fact in:

- code
- comments
- documentation
- user-facing copy
- marketing copy
- commit messages

If founder validation falsifies this hypothesis, dependent product work must
pause and the founder must decide what changes.

---

### 4.3 MVP scope

The PRD exclusions are hard walls.

V1.0 does NOT include:

- CRM
- project management
- proposals
- e-sign
- time tracking
- accounting
- payroll
- team chat
- AI chatbot
- integration catalogue
- e-invoicing / IRN
- multi-currency
- native mobile apps
- third-party API

"Nice to have" is not a sufficient reason to build something.

No feature beyond the PRD may be implemented without an explicit scope
decision recorded in:

`docs/06-PRODUCT-ROADMAP.md §5`

---

### 4.4 India-first

V1.0 must support:

- GST-correct invoices
- GSTIN
- HSN/SAC
- CGST/SGST/IGST based on place of supply
- sequential invoice numbering per financial year
- UPI through Razorpay
- manual bank transfer
- TDS-adjusted payment recording
- WhatsApp-first notifications
- email fallback

Manual bank payments are first-class.

They are not an edge case.

---

### 4.5 Copy

User-facing copy must use:

- plain first-person English
- commas instead of em-dashes
- INR everywhere
- no fabricated statistics

Never use these terms in user-facing text:

- "portal"
- "OS"

---

### 4.6 Milestones

Do not move to the next milestone until the current milestone passes its
defined exit criteria.

---

## 5. CANONICAL TECHNICAL DECISIONS

These decisions should not be changed casually.

A major change requires recorded justification and appropriate founder
approval.

### Frontend

Next.js App Router

TypeScript

Tailwind CSS

shadcn/ui

Deployment: Vercel

### Database / Auth / Storage

Supabase:

- PostgreSQL
- Auth
- Storage
- Row Level Security

Auth is for Agency users only.

RLS is mandatory for tenant isolation.

### Background jobs

Inngest.

Use Inngest for:

- reminder scheduling
- delayed notifications
- scheduled sends
- background workflows

Never schedule business-critical delayed work directly from request handlers.

### Payments

Razorpay:

- payment links
- UPI
- cards
- webhooks

Razorpay webhooks are the source of truth for gateway payments.

Manual payments must support:

- NEFT
- RTGS
- bank transfer
- TDS-adjusted payments

### WhatsApp

Meta WhatsApp Cloud API directly.

Initial templates:

- `deliverable_ready`
- `approval_confirmed`
- `invoice`
- `reminder_gentle`
- `reminder_firm`
- `reminder_final`
- `payment_received`

Email fallback through Resend when:

- WhatsApp is unavailable
- template delivery fails
- Client has no WhatsApp path

### PDF

Server-rendered PDFs.

Use react-pdf or an equivalent implementation approved by Architecture.

### Observability

Sentry + PostHog.

A message-delivery view is required because WhatsApp delivery and template
failures are operationally important.

### Testing

Vitest for:

- invoice calculations
- GST calculations
- TDS reconciliation
- invoice numbering
- state transitions
- business logic

Playwright E2E for the two critical flows:

1. Client magic-link view → Approve
2. Razorpay webhook → Paid

---

## 6. MONEY DOMAIN RULES

Financial calculations must be implemented as deterministic domain logic
where practical.

Before UI work depends on money calculations, the underlying domain logic
must exist and be tested.

At minimum:

- GST
- CGST
- SGST
- IGST
- TDS
- invoice totals
- received amount
- outstanding amount
- invoice numbering

Do not duplicate financial calculations independently across frontend and
backend.

The server/domain implementation is authoritative.

---

## 7. SECURITY BASELINE

Security is a product requirement, not a later optimization.

Implement and verify:

- Supabase RLS
- tenant isolation
- authorization
- magic-link security
- token expiry
- token revocation
- single-client token scope
- webhook signature verification
- webhook replay protection
- idempotent webhooks
- rate limiting on public endpoints
- input validation
- secret management
- minimal Client PII
- no PII in logs
- deletion path for Client data

PCI-sensitive payment handling remains with Razorpay.

Never commit:

- API keys
- access tokens
- private credentials
- production secrets
- database passwords

---

## 8. API CONTRACT RULE

API contracts must be defined and frozen before Frontend and Backend
implementation are allowed to diverge into parallel work.

Use typed contracts.

Preferred location:

`lib/contracts/`

Contracts should be:

- typed
- versioned where necessary
- validated
- shared between API consumers and implementations

After an API contract is frozen:

- Backend implements against it
- Frontend implements against it
- QA tests against it

A contract change after implementation begins requires ORCHESTRATOR
coordination.

---

## 9. WEBHOOK RULES

All external webhooks must be:

- signature verified
- idempotent
- replay protected where applicable
- logged safely
- associated with the correct Workspace
- safe to retry

Never treat a client-side payment success screen as the authoritative
payment state.

For Razorpay:

Razorpay webhook
→ verified event
→ idempotent processing
→ Payment state update
→ notification
→ audit event

---

## 10. NOTIFICATION RULE

Every important notification path must have a fallback.

Primary:

WhatsApp

Fallback:

Email

The system must record message delivery state.

At minimum, the message log should distinguish relevant states such as:

- queued
- sent
- delivered
- failed
- fallback_sent

Do not silently assume that a notification was delivered.

---

## 11. CLIENT EXPERIENCE RULES

The Client experience must be:

- zero-login
- mobile-first
- fast
- branded by the Agency
- usable inside WhatsApp's in-app browser
- usable on mid-range Android devices
- simple enough for approval without onboarding

Target:

- maximum two taps to approve
- maximum two taps to pay

Do not add unnecessary Client navigation, account settings, dashboards, or
other portal-like surfaces.

---

## 12. AGENCY EXPERIENCE RULES

The Agency application must make the Money Pipeline central.

The dashboard must make it easy to distinguish:

### Approval pending

Work waiting for Client approval.

Show useful context such as:

- days elapsed
- viewed-at timestamp

### Payment pending

Approved work that has been invoiced but not paid.

Show aging buckets.

### Paid

Completed payment.

The Agency must be able to understand where money is stuck without manually
searching through conversations.

---

## 13. STATE AND AUDIT RULES

Important business state changes must produce append-only events.

Examples:

- deliverable sent
- deliverable viewed
- changes requested
- deliverable approved
- invoice generated
- reminder sent
- payment initiated
- payment received
- manual payment recorded
- TDS recorded

Events must contain sufficient information to reconstruct the relevant
timeline.

Never silently mutate the audit history to hide a previous state.

---

## 14. DATABASE RULES

All tenant-owned tables require appropriate RLS.

Expected core entities include:

- workspaces
- users
- clients
- client_contacts
- projects
- deliverables
- deliverable_versions
- deliverable_events
- invoices
- invoice_line_items
- payments
- reminders
- message_log
- magic_link_tokens

Schema changes require:

1. Architecture review
2. Security/RLS review
3. Migration
4. Tests

Never apply an unreviewed destructive migration to tenant data.

---

## 15. DEVELOPMENT WORKFLOW

Use vertical slices whenever practical.

Preferred flow:

requirements
→ architecture
→ schema
→ API contract
→ UX
→ implementation
→ tests
→ QA
→ security
→ review
→ documentation

After the API contract is frozen:

Frontend and Backend may work in parallel.

QA should begin authoring appropriate tests before implementation is
complete.

Security should review high-risk architecture early rather than waiting
until the end.

---

## 16. AGENT OPERATING MODEL

Munder Difflin provides the runtime environment.

Michael is the runtime-level manager.

The Zaya ORCHESTRATOR is the project coordination authority.

Only ORCHESTRATOR coordinates Zaya project work.

Specialist agents must not:

- change product scope
- assign work to other agents
- override the PRD
- bypass security gates
- bypass review gates
- silently redefine requirements

Specialist responsibilities are defined in:

`agents/*.md`

The detailed orchestration policy is defined in:

`agents/ORCHESTRATOR.md`

The Munder Difflin operating model is defined in:

`MUNDER-DIFFLIN.md`

---

## 17. AUTONOMOUS ENGINEERING

Agents should make normal engineering decisions autonomously when those
decisions:

- follow the PRD
- follow CLAUDE.md
- follow project documentation
- preserve the existing architecture
- are reversible
- do not change product scope
- do not introduce significant unapproved cost
- do not require production secrets
- do not create destructive production changes

Do not interrupt the founder for trivial implementation decisions.

Escalate decisions involving:

- product direction
- material scope changes
- conflicting requirements
- major architecture replacement
- destructive production operations
- production credentials
- significant irreversible changes

---

## 18. SCOPE CHANGE PROTOCOL

If an agent discovers a potentially valuable feature outside the PRD:

DO NOT BUILD IT.

Instead:

1. Report it to ORCHESTRATOR.
2. ORCHESTRATOR determines whether it is truly outside scope.
3. If outside scope, request founder decision.
4. If approved, record an SD entry in:
   `docs/06-PRODUCT-ROADMAP.md §5`
5. Update affected documentation.
6. Only then schedule implementation.

Silence is not approval.

---

## 19. DOCUMENTATION RULE

Documentation must describe what the product actually does.

When implementation changes behavior:

- update the affected product documentation
- update API documentation
- update database documentation when schema changes
- update user flows when behavior changes
- update testing strategy when requirements change
- record approved scope changes

Never modify documentation merely to make an unauthorized implementation
appear intentional.

---

## 20. TESTING AND DEFINITION OF DONE

Code is not complete merely because it compiles.

A feature is complete only when:

- implementation works
- acceptance criteria pass
- relevant tests pass
- security requirements are satisfied
- no unauthorized scope has been added
- review passes
- affected documentation is updated
- repository is left in a clean state

Critical flows must have E2E coverage.

---

## 21. GIT RULES

Agents should:

- make focused commits
- avoid unrelated changes
- inspect git status before major operations
- never commit secrets
- avoid destructive history rewriting
- keep commits understandable
- never claim the approval hypothesis is proven in commit messages

Do not modify unrelated files merely for convenience.

---

## 22. V1.0 BUILD SEQUENCE

### W1

- scaffold
- CI
- Supabase
- Agency auth
- Workspace
- GST/business setup
- branding
- Clients
- Contacts

Founder action immediately:

- Meta Business verification
- Razorpay KYC

These have external lead times.

### W2

- Projects
- Deliverables
- Versions
- Magic-link Client view
- Approve
- Request changes
- append-only event log

### W3

- GST engine
- invoice generation
- invoice PDF
- Razorpay payment links
- Razorpay webhook
- manual bank payments
- TDS recording

GST/money calculations must be unit-tested before dependent UI work.

### W4

- reminder ladder
- Inngest jobs
- Money Pipeline
- email notifications
- timeline PDF export

### W5

- WhatsApp templates
- interactive WhatsApp buttons
- plain-text approval fallback
- screenshot/UTR provisional payment
- agency one-tap payment confirmation
- polish
- E2E verification
- beta onboarding

If Meta approval has not landed, email-only is an accepted launch state.

---

## 23. V1.0 EXIT

V1.0 is complete only when all 8 acceptance criteria in:

`docs/planning/05-MVP-PRD.md`

pass.

Evidence must be provided through:

- automated tests
- E2E tests
- recorded walkthroughs where appropriate

No milestone may be marked complete based only on "the code appears to
work."

---

## 24. CONTEXT

Plain invoicing and plain payment reminders are commoditized in India.

Zaya's wedge is the CONNECTED loop:

approval event
→ automatic invoice
→ same-thread payment ask
→ reminders
→ payment
→ Money Pipeline

The product should distinguish:

Approval-stuck money

from:

Payment-stuck money.

The Client experience remains zero-login because the product is designed
around removing friction from the Client side.

Founder validation may run in parallel with development.

If founder validation falsifies the approval hypothesis, ORCHESTRATOR pauses
dependent work and requests a scope decision.

---

## 25. FINAL PRINCIPLE

Build only what the customer needs.

Prefer the smallest implementation that satisfies the PRD.

Do not confuse speed with skipping verification.

BUILD FAST
→ VERIFY FAST
→ FIX FAST
→ REVIEW
→ SHIP

Preserve:

- scope
- security
- data integrity
- Client privacy
- financial correctness
- acceptance criteria
- auditability

The founder remains the final authority on product direction and major
business decisions.