# CLAUDE.md — ZAYA

India-first Work → Cash platform for small agencies.

**One line:** the moment a client approves a deliverable, the GST invoice sends itself with a payment link, and reminders escalate until the money lands.

**Customer-facing pitch:** “See where every rupee is stuck, and stop chasing it manually.”

**Never use “OS” or “portal” in user-facing text.**

---

## 1. CURRENT REPOSITORY STATE

This repository starts with documentation only:

* `CLAUDE.md`
* `docs/planning/05-MVP-PRD.md`

No application code exists.

`docs/planning/05-MVP-PRD.md` is the **canonical MVP specification**. Every agent must read it completely before making product, architecture, UX, schema, API, or implementation decisions.

Agents must create all other required documentation and application files as specified below.

---

## 2. PRODUCT IN 60 SECONDS

Zaya serves exactly **two end-user types in V1**, on two separate surfaces.

### 2.1 Agency

The paying customer.

Target:

* 2–15 person Indian agencies
* social media
* content
* influencer
* creative
* digital
* video
* web

The Agency gets the authenticated application:

* Dashboard
* Clients
* Projects
* Deliverables
* Invoices
* Payments
* Reminders
* Money Pipeline
* Audit timelines

**Agency job-to-be-done:**

> Get paid faster with less awkward chasing, and have proof when clients dispute.

### 2.2 Client

The Agency's customer.

The Client:

* never logs in
* never creates an account
* never installs anything
* never gets a password
* never receives an Agency application account

The Client receives a WhatsApp or email notification containing a signed, expiring, revocable, client-scoped magic link.

The magic-link experience is a mobile-first web surface where the Client can only:

1. View work
2. Approve
3. Request changes
4. View invoice
5. Pay by UPI/card
6. View bank-transfer instructions

**Hard architectural law:**

> If a design requires the Client to create an account or log in, the design is wrong and must be rejected.

---

## 3. CORE PRODUCT MODEL

The product is organized around one state machine per Deliverable:

```text
draft
  → sent
  → viewed
  → changes_requested
  → approved
  → invoiced
  → reminded
  → paid / overdue
```

Not every Deliverable must pass through every state.

Every state transition creates an **append-only event**.

The event log is the audit trail.

Example:

```text
Approved
18 Aug, 4:12 PM
Version 3
Approved by Rahul
```

The audit trail is a core product experience, not merely an internal technical log.

---

## 4. CORE WEDGE

Zaya is not plain invoicing software and not plain reminder software.

The core workflow is:

```text
Deliverable sent
      ↓
Client views
      ↓
Client approves
      ↓
GST invoice generated
      ↓
Payment request sent
      ↓
Reminder ladder
      ↓
Payment recorded
      ↓
Pipeline updated
```

The Money Pipeline must distinguish at minimum:

* Approval pending
* Invoiced
* Overdue
* Paid

The product must also distinguish:

* money waiting on approval
* money waiting on payment

**Important hypothesis rule:**

> “Approval delay causes late payment” is a product hypothesis.

It must never be presented as an established fact in:

* code comments
* product copy
* documentation
* analytics labels
* marketing claims
* acceptance criteria

If founder validation contradicts this hypothesis, the Orchestrator must pause affected work and request an explicit scope decision.

---

# 5. HARD RULES

These rules apply to every agent and every milestone.

### Rule 1 — No Client Login

Client authentication is magic-link-only.

Magic links must be:

* signed
* expiring
* single-client-scoped
* revocable
* single-purpose where appropriate
* rate-limited
* non-enumerable
* invalidated according to documented token lifecycle rules

### Rule 2 — India First

Invoices must support:

* GSTIN
* HSN/SAC
* place of supply
* CGST
* SGST
* IGST
* sequential invoice numbering per financial year
* correct taxable value
* GST totals
* invoice totals

Payments must support:

* Razorpay UPI/card payment
* NEFT
* RTGS
* manual bank-transfer recording
* TDS deductions
* gross amount
* TDS amount
* net amount received

### Rule 3 — WhatsApp First

Every notification path must support:

1. WhatsApp
2. Email fallback

WhatsApp templates include:

* `deliverable_ready`
* `approval_confirmed`
* `invoice`
* `reminder_gentle`
* `reminder_firm`
* `reminder_final`
* `payment_received`

If WhatsApp template approval is unavailable at launch, the system must degrade cleanly to email-only.

### Rule 4 — No Unapproved Scope

The following are explicitly excluded from V1:

* CRM
* project management
* proposals
* time tracking
* accounting
* payroll
* team chat
* AI chatbot
* e-invoicing / IRN
* multi-currency
* native mobile applications
* third-party API

“Nice to have” is not a valid reason to add functionality.

Any feature outside the PRD requires an explicit scope decision recorded in:

`docs/06-PRODUCT-ROADMAP.md`

### Rule 5 — Copy

User-facing copy must use:

* plain first-person English
* concise language
* commas instead of em-dashes
* INR for monetary values

Never use:

* “OS”
* “portal”
* fabricated statistics
* unsupported claims
* unnecessary technical terminology

### Rule 6 — Milestone Gates

Do not begin the next milestone until the current milestone passes its exit criteria.

### Rule 7 — Tenant Isolation

Every Agency-owned record must be tenant-scoped through the Workspace.

Supabase RLS is mandatory.

Cross-tenant reads and writes must be covered by automated tests.

### Rule 8 — Webhooks

All payment and messaging webhooks must be:

* signature-verified
* replay-protected
* idempotent
* auditable
* safe to retry

### Rule 9 — Background Jobs

Scheduled work must use Inngest.

Never schedule reminder or delayed notification work directly from request handlers.

### Rule 10 — Evidence Over Claims

Where product behavior matters, demonstrate it through:

* automated tests
* recorded walkthroughs
* measurable outputs
* audit events

Do not claim an acceptance criterion passes without evidence.

---

# 6. CANONICAL TECH STACK

Do not change these decisions without a recorded justification.

### Application

* Next.js
* App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Vercel

### Backend / Data

Supabase:

* PostgreSQL
* Auth
* Storage
* Row Level Security

Supabase Auth is for **Agency users only**.

### Background Jobs

Inngest.

Required for:

* reminder ladder
* scheduled notifications
* delayed jobs
* retryable background processing

### Payments

Razorpay:

* payment links
* UPI
* card payments
* webhooks as payment source of truth

Manual payments are first-class:

* NEFT
* RTGS
* bank transfer
* TDS-adjusted payments
* provisional payment events

### Messaging

WhatsApp Cloud API directly through Meta.

Email fallback:

* Resend

### PDF

Server-rendered invoices and timeline exports using:

* react-pdf
* or another server-compatible PDF renderer approved by Architecture

### Observability

* Sentry
* PostHog

A message-delivery view is mandatory because WhatsApp template failures are expected to be a major support concern.

### Testing

* Vitest
* Playwright

Mandatory E2E flows:

1. Client magic link → view → approve
2. Razorpay webhook → paid

---

# 7. CANONICAL TERMINOLOGY

Use these terms consistently across code, documentation, database schemas, API contracts, UX and tests.

| Concept                     | Canonical term |
| --------------------------- | -------------- |
| Agency tenant               | Workspace      |
| Agency customer             | Client         |
| Person at client            | Contact        |
| Work unit                   | Deliverable    |
| Uploaded iteration          | Version        |
| Client acceptance           | Approval       |
| Billing document            | Invoice        |
| Money received              | Payment        |
| Automated collection action | Reminder       |
| Financial status view       | Pipeline       |
| Client access mechanism     | Magic link     |

Do not introduce alternate names such as:

* Organization
* Account
* Customer
* Job
* Task
* Submission
* Customer portal
* Client portal

unless a specific technical integration requires the distinction and it is documented.

---

# 8. INITIAL DOCUMENTATION BOOTSTRAP

Before writing application code, create:

```text
docs/
├── 00-PRODUCT-VISION.md
├── 02-ICP-AND-PERSONAS.md
├── 06-PRODUCT-ROADMAP.md
├── 08-USER-FLOWS.md
├── 09-UX-UI-SPECIFICATION.md
├── 10-ARCHITECTURE.md
├── 12-DATABASE.md
├── 13-API-SPECIFICATION.md
├── 15-SECURITY.md
├── 16-TESTING-STRATEGY.md
└── 17-DEPLOYMENT.md
```

Create:

```text
agents/
├── ORCHESTRATOR.md
├── PRODUCT/
│   └── AGENT.md
├── ARCHITECTURE/
│   └── AGENT.md
├── FRONTEND/
│   └── AGENT.md
├── BACKEND/
│   └── AGENT.md
├── QA/
│   └── AGENT.md
├── SECURITY/
│   └── AGENT.md
├── DEVOPS/
│   └── AGENT.md
├── DOCUMENTATION/
│   └── AGENT.md
└── REVIEW/
    └── AGENT.md
```

---

# 9. REQUIRED DOCUMENT CONTENT

## 9.1 `docs/00-PRODUCT-VISION.md`

Condense:

* product purpose
* target customer
* two-user model
* connected approval → invoice → payment loop
* Money Pipeline
* audit trail
* India-first positioning
* hard product constraints
* V1 exclusions

Keep it implementation-oriented.

---

## 9.2 `docs/02-ICP-AND-PERSONAS.md`

Document exactly three personas.

### Arjun

Agency founder.

Role:

* buyer
* administrator
* primary user

Needs:

* see stuck money
* reduce manual chasing
* create deliverables
* manage clients
* issue invoices
* reconcile payments
* maintain proof of approval

### Rahul

SMB client contact.

Characteristics:

* WhatsApp-native
* primarily mobile
* taps links
* approves work
* requests changes
* pays by UPI

He must not create an account.

### Brand Accounts Team

Large-brand finance/accounts contact.

Characteristics:

* pays through NEFT/RTGS
* requires invoice and often PO information
* deducts TDS
* operates on 60–90 day payment cycles
* will not use a UPI payment link

The document must map every feature to one or more personas.

---

# 10. ROADMAP

Create `docs/06-PRODUCT-ROADMAP.md`.

Use these stages:

## V1.0 — MVP

Objective:

Validate the connected approval → invoice → payment workflow.

Scope:

* Agency authentication
* Workspace setup
* GST/business setup
* branding
* clients and contacts
* projects
* deliverables
* versions
* magic links
* approval/change requests
* append-only event timeline
* GST invoices
* Razorpay payment links
* manual bank payments
* TDS
* reminders
* Money Pipeline
* WhatsApp
* email fallback
* timeline PDF export
* observability
* security controls
* automated tests

Exit criteria:

All eight PRD acceptance criteria pass through tests or recorded walkthroughs.

Exclusions:

All PRD exclusions remain walls.

## V1.1 — Private Beta Iteration

Objective:

Use controlled customer feedback to identify friction, reliability issues and missing workflow details.

Scope:

Only fixes and explicitly approved changes supported by evidence from private-beta usage.

Exit criteria:

Documented beta feedback, prioritized fixes, stable critical flows and an explicit decision to proceed.

Exclusions:

No speculative feature expansion.

## V1.5 — Paid Beta

Objective:

Test willingness to pay.

Founding plan:

**₹299/month**

Scope:

Validated V1.1 functionality plus only explicitly approved paid-beta improvements.

Exit criteria:

Paid beta operating successfully with documented customer feedback and retention/payment evidence.

## V2.0 — Public Launch

Pricing hypothesis:

* Free
* ₹699/month
* ₹1,499/month
* ₹3,999/month

These are hypotheses, not established pricing facts.

Objective:

Public launch after V1.5 validation.

Exit criteria:

Product, reliability, security, support and pricing decisions are explicitly approved for public launch.

---

# 11. USER FLOWS

Create `docs/08-USER-FLOWS.md`.

Document the complete two-sided journey.

## Agency onboarding

```text
Signup
→ Business + GST setup
→ Payment setup
→ Add Client
→ Add Contact
→ Create Project
→ Create Deliverable
→ Upload Version
→ Send Deliverable
```

Target:

> Agency can reach “deliverable sent” in under 10 minutes.

## Client journey

```text
WhatsApp / Email
→ Magic link
→ View deliverable
→ Approve OR Request changes
→ Approval recorded
→ Invoice generated
→ Invoice sent in same communication thread
→ Pay OR view bank details
→ Reminder ladder
→ Payment
→ Paid
```

Document these edge branches:

### No WhatsApp

Email path.

### Multiple contacts

Up to three Client Contacts.

Any authorized contact may approve.

The approval event must record which Contact approved.

### Partial payment

Invoice remains outstanding for the unpaid balance.

Payment events must preserve:

* gross
* TDS
* net received
* remaining balance

### Provisional payment

Client may submit:

* screenshot
* UTR/reference

The payment remains provisional until Agency confirmation.

Agency gets a one-tap confirmation action.

### Reminder pause

Agency can pause reminders per invoice.

Pause state must be auditable.

### Dispute

Agency can export the Deliverable timeline as PDF.

The export must show relevant:

* versions
* sends
* views
* change requests
* approvals
* invoice events
* payment events

---

# 12. UX / UI SPECIFICATION

Create `docs/09-UX-UI-SPECIFICATION.md`.

The design system is:

**Premium, trustworthy, financial, clear.**

Do not use a saffron-green brand palette.

Use semantic tokens.

## Light theme

```text
primary: #4F46E5
primary-hover: #4338CA
success: #10B981
background: #F8FAFC
surface: #FFFFFF
text: #0F172A
muted: #64748B
border: #E2E8F0
```

## Dark theme

```text
primary: #6366F1
success: #34D399
background: #0B1120
surface: #111827
elevated: #1E293B
text: #F8FAFC
muted: #94A3B8
border: #334155
```

## Agency surface

The Dashboard must put **Money Pipeline front and center**.

Pipeline states:

* Approval pending
* Invoiced
* Overdue
* Paid

Include two primary lists:

### Waiting on approval

Show:

* Client
* Deliverable
* amount
* days elapsed
* viewed-at timestamp

### Waiting on payment

Show:

* Client
* Invoice
* amount outstanding
* aging bucket
* last reminder
* next reminder
* payment status

## Client surface

Magic-link pages must be:

* mobile-first
* fast on mid-range Android devices
* usable over 4G
* reliable inside WhatsApp's in-app browser
* branded to the Agency

Critical actions:

* maximum two taps to approve
* maximum two taps to start payment

Do not introduce unnecessary navigation.

---

# 13. ARCHITECTURE

Create `docs/10-ARCHITECTURE.md`.

The architecture must cover:

* Next.js App Router
* TypeScript
* Supabase
* RLS
* Storage
* Inngest
* Razorpay
* Meta WhatsApp Cloud API
* Resend
* PDF rendering
* Sentry
* PostHog
* Vercel
* webhook processing
* idempotency
* retry strategy
* public magic-link routes
* Agency-authenticated routes
* tenant boundaries

Clearly separate:

### Agency surface

Authenticated.

### Client surface

Unauthenticated except for signed magic-link context.

The Client surface must never depend on Agency Auth.

---

# 14. DATABASE

Create `docs/12-DATABASE.md`.

The minimum schema must include:

```text
workspaces
users
clients
client_contacts
projects
deliverables
deliverable_versions
deliverable_events
invoices
invoice_line_items
payments
reminders
message_log
magic_link_tokens
```

Additional tables are allowed only when required by the PRD or an explicitly recorded scope decision.

Requirements:

* Workspace ownership
* tenant isolation
* foreign keys
* indexes
* unique constraints
* financial-year invoice numbering
* immutable event records
* payment reconciliation
* TDS
* webhook idempotency
* timestamps
* audit metadata

`deliverable_events` is append-only.

No normal application workflow may update or delete historical events.

---

# 15. API SPECIFICATION

Create `docs/13-API-SPECIFICATION.md`.

API contracts must be defined **before frontend/backend integration**.

Every contract must specify:

* HTTP method
* version
* route
* authentication model
* request schema
* response schema
* errors
* authorization
* idempotency behavior where applicable

Version APIs explicitly.

Webhook contracts must document:

* signature verification
* replay protection
* idempotency
* retry behavior
* event handling
* failure behavior

---

# 16. SECURITY

Create `docs/15-SECURITY.md`.

Mandatory controls:

### Tenant isolation

* RLS on all tenant tables
* cross-tenant read tests
* cross-tenant write tests

### Magic links

* signed
* expiring
* scoped to one Client
* revocable
* rate-limited
* protected against replay
* protected against token enumeration
* no sensitive data encoded directly in tokens

### Webhooks

Razorpay and Meta:

* signature verification
* timestamp/replay protection where supported
* idempotency
* safe retry behavior

### Public endpoints

Apply rate limiting.

### Privacy

DPDP-aligned posture:

* collect minimal Client PII
* define deletion path
* do not put PII in logs
* restrict observability data
* document retention

### Payments

PCI-sensitive payment data remains with Razorpay.

Never store raw card data.

---

# 17. TESTING STRATEGY

Create `docs/16-TESTING-STRATEGY.md`.

Map PRD acceptance criteria to tests.

## Unit tests

At minimum:

### Invoice math

* taxable values
* CGST
* SGST
* IGST
* rounding
* totals
* TDS
* net received
* outstanding balance
* financial-year numbering

### State transitions

Test valid and invalid Deliverable transitions.

### Event log

Verify every state transition creates the expected immutable event.

### Payments

Test:

* Razorpay payment
* manual bank payment
* provisional payment
* TDS-adjusted payment
* partial payment
* final payment

## E2E

Critical path A:

```text
Client magic link
→ view
→ approve
→ approval event
→ invoice
```

Critical path B:

```text
Razorpay webhook
→ verified
→ idempotent processing
→ payment recorded
→ invoice paid
→ Pipeline updated
```

These flows must never be knowingly broken.

---

# 18. DEPLOYMENT

Create `docs/17-DEPLOYMENT.md`.

Deployment stack:

* Vercel
* Supabase
* Inngest
* GitHub Actions

CI must run:

```text
lint
→ typecheck
→ unit tests
→ E2E tests
```

Use:

* preview deployments
* production deployment
* Supabase CLI migrations
* environment-variable documentation
* deployment rollback procedure

Never commit secrets.

Document required credentials and configuration without committing their values.

---

# 19. AGENT SYSTEM

Create the following agents:

```text
ORCHESTRATOR
PRODUCT
ARCHITECTURE
FRONTEND
BACKEND
QA
SECURITY
DEVOPS
DOCUMENTATION
REVIEW
```

## ORCHESTRATOR

Only the Orchestrator coordinates agents.

Responsibilities:

* read canonical requirements
* assign work
* enforce milestone order
* prevent scope drift
* resolve conflicts
* require evidence
* maintain milestone status
* trigger reviews
* ensure documentation stays current

No other agent may independently redefine product scope.

## PRODUCT

Owns:

* requirements
* acceptance criteria interpretation
* product decisions
* personas
* user flows
* scope boundaries

Must read:

* `CLAUDE.md`
* `docs/planning/05-MVP-PRD.md`
* product vision
* personas
* roadmap

## ARCHITECTURE

Owns:

* system design
* data boundaries
* integrations
* schema design
* API architecture
* technical tradeoffs

Must read the PRD and product documentation before decisions.

## FRONTEND

Owns:

* Agency UI
* Client magic-link UI
* components
* accessibility
* responsive behavior
* loading/error states

Must not invent product behavior.

## BACKEND

Owns:

* business logic
* database access
* state transitions
* event logging
* invoices
* payments
* reminders
* messaging
* webhooks

Must preserve all security and idempotency requirements.

## QA

Owns:

* test plans
* unit tests
* integration tests
* E2E tests
* acceptance-criteria evidence
* regression testing

## SECURITY

Owns review of:

* authentication
* authorization
* RLS
* tenant isolation
* magic links
* public endpoints
* webhooks
* payments
* secrets
* logging
* privacy

Security review is mandatory before milestone completion.

## DEVOPS

Owns:

* CI
* deployment
* environment configuration
* migrations
* observability
* rollback
* production readiness

## DOCUMENTATION

Owns:

* canonical docs
* terminology consistency
* architecture records
* scope decisions
* milestone records
* implementation documentation

## REVIEW

Final product/engineering review.

REVIEW must flag:

* any unrequested feature
* any client-login surface
* any scope expansion
* any violation of canonical terminology
* any security gap
* any missing acceptance evidence
* any undocumented architecture change
* any divergence from the PRD

Any violation is:

**CHANGES REQUIRED**

---

# 20. REQUIRED EXECUTION ORDER

No implementation work may bypass this sequence:

```text
Requirements
    ↓
Architecture
    ↓
Schema review
    ↓
API contracts
    ↓
UX specification
    ↓
Implementation
    ↓
Tests
    ↓
QA
    ↓
Security review
    ↓
REVIEW
    ↓
Documentation update
    ↓
Milestone exit
```

The Orchestrator must enforce this order.

---

# 21. V1.0 BUILD PLAN

Nominal duration: **5 weeks**.

## Week 1 — Foundation

Build:

* repository scaffold
* Next.js
* TypeScript
* Tailwind
* shadcn/ui
* Supabase
* Agency authentication
* Workspace
* business/GST setup
* Clients
* branding
* initial database migrations
* initial RLS
* deployment pipeline

### Founder action required immediately

The founder must start:

1. Meta Business verification
2. Razorpay KYC

These have external lead times and can block P0.5/payment testing.

Do not wait until Week 5 to start them.

### Week 1 exit

Foundation is deployed, tenant isolation is tested, authentication works, and external onboarding processes have been started.

---

## Week 2 — Deliverables

Build:

* Projects
* Deliverables
* Versions
* magic links
* Client mobile view
* view events
* approval
* request changes
* append-only event timeline

Primary critical path:

```text
send
→ magic link
→ view
→ approve
```

---

## Week 3 — Money

Build:

* invoice engine
* GST calculations
* invoice numbering
* invoice PDF
* Razorpay payment links
* Razorpay webhooks
* manual bank payments
* TDS
* partial payments
* payment reconciliation

GST math must be unit-tested before integration.

---

## Week 4 — Collection

Build:

* Inngest reminder ladder
* D3 reminder
* D7 reminder
* D14 reminder
* per-invoice reminder pause
* Money Pipeline
* aging buckets
* email fallback
* timeline PDF export
* message delivery view

---

## Week 5 — Messaging and Beta Readiness

Build:

* WhatsApp templates
* interactive buttons
* notification fallbacks
* polish
* performance improvements
* accessibility fixes
* E2E stabilization
* beta onboarding flow

If Meta approval has not landed:

> Launch with email-only notification fallback.

This is an accepted launch state, provided the rest of the V1 acceptance criteria pass.

---

# 22. MILESTONE REPORTING

Every milestone report must use exactly this structure:

## Files created/modified

List paths.

## Scope changes

State:

`None`

unless an explicit scope decision exists.

If scope changed, provide:

* decision
* reason
* approver
* affected docs
* affected implementation

## Acceptance criteria status

For each criterion:

* PASS
* FAIL
* BLOCKED

Include evidence.

## Risks

List only active risks.

Include:

* severity
* impact
* mitigation
* owner

## Recommended next action

One concrete next action.

Do not silently move to the next milestone.

---

# 23. SCOPE CHANGE PROTOCOL

Any request that falls outside the PRD must stop implementation.

The agent must:

1. Identify the requested change.
2. Explain which PRD boundary it crosses.
3. Record the proposal in `docs/06-PRODUCT-ROADMAP.md`.
4. Wait for an explicit scope decision.
5. Only then implement if approved.

No agent may interpret “probably useful” as approval.

---

# 24. VALIDATION HYPOTHESIS

Founder validation interviews may run in parallel with development.

The core hypothesis is:

> Approval visibility and approval workflow may be a meaningful part of the path to getting paid faster.

This is a hypothesis.

If founder validation indicates that the hypothesis is wrong:

1. ORCHESTRATOR pauses affected W2+ work.
2. PRODUCT documents the evidence.
3. ROADMAP records the scope decision.
4. Architecture and implementation proceed only after the decision is explicit.

Do not retrofit the product around an unvalidated assumption without recording the decision.

---

# 25. CONSISTENCY CHECK

Before declaring documentation bootstrap complete, verify:

* [ ] Every document uses Workspace consistently.
* [ ] Every document uses Client consistently.
* [ ] Every document uses Contact consistently.
* [ ] Every document uses Deliverable consistently.
* [ ] Every document uses Version consistently.
* [ ] Every document uses Approval consistently.
* [ ] Every document uses Invoice consistently.
* [ ] Every document uses Payment consistently.
* [ ] Every document uses Reminder consistently.
* [ ] Every document uses Pipeline consistently.
* [ ] Every document uses Magic link consistently.
* [ ] No user-facing text uses “OS”.
* [ ] No user-facing text uses “portal”.
* [ ] No Client login exists in any design.
* [ ] No unapproved feature appears in scope.
* [ ] All APIs are versioned.
* [ ] All webhooks are idempotent.
* [ ] All tenant tables have RLS.
* [ ] Critical E2E flows are defined.
* [ ] Security review requirements are documented.
* [ ] Deployment requirements are documented.

---

# 26. BOOTSTRAP EXIT REPORT

After completing documentation bootstrap, report:

### Files created

Complete list of created files.

### Open questions

Only unresolved questions that genuinely block implementation or require a product decision.

### V1 build plan

Summarize the five-week plan and identify the immediate next action.

Do not begin application implementation until the documentation bootstrap exit criteria pass.

---

# 27. DEFINITION OF DONE

A feature is not done because its UI exists.

A feature is done only when:

* requirements are understood
* architecture is approved
* schema/API contracts are defined where applicable
* UX behavior is specified
* implementation exists
* tests exist
* acceptance criteria pass
* security implications are reviewed
* observability is adequate
* documentation is updated
* REVIEW passes
* no scope violation exists

**No shortcuts. No silent assumptions. No feature creep.**
