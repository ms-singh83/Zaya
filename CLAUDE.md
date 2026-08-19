# CLAUDE.md — ZAYA

India-first Work → Cash platform for small agencies.
One line: the moment a client approves a deliverable, the GST invoice sends itself with a payment link, and reminders escalate until the money lands.

Customer-facing pitch: "See where every rupee is stuck, and stop chasing it manually."
NEVER use "OS" or "portal" in any user-facing text.

---

## 1. CURRENT STATE

- This repository contains ONLY:
  - CLAUDE.md (this file)
  - docs/planning/05-MVP-PRD.md  ← the canonical MVP spec. Read it FIRST, fully, before anything else.
- No application code exists. No other docs exist. You will create everything else.

---

## 2. THE PRODUCT IN 60 SECONDS

Zaya serves exactly TWO end users in V1, on two different surfaces:

### User 1 — AGENCY (the paying customer)
2–15 person Indian agencies (social media, content, influencer, creative, digital, video, web).
They log in. They get the full app: dashboard, clients, deliverables, invoices, payments, reminders, Money Pipeline.
Their job-to-be-done: "get paid faster with less awkward chasing, and have proof when clients dispute."

### User 2 — CLIENT (the agency's customer)
The client NEVER logs in, NEVER creates an account, NEVER installs anything. This is a hard architectural law.
They receive WhatsApp/email messages with a signed magic link → a branded mobile-first web page → they can only: view work, Approve, Request changes, view invoice, Pay (UPI/card) or see bank details.
If any design requires the client to create anything, that design is wrong. Delete it.

The entire product is one state machine per deliverable:
draft → sent → viewed → changes_requested → approved → invoiced → reminded → paid / overdue
Every transition is an append-only event. The event log IS the audit trail ("Approved — 18 Aug, 4:12 PM — Version 3"), and the audit trail is the emotional hook of the product.

---

## 3. HARD RULES (every agent, every milestone)

1. CLIENT NEVER GETS A LOGIN. Magic links only (signed, expiring, single-client-scoped, revocable).
2. Approval-delay-causes-late-payment is a HYPOTHESIS, never stated as fact in code comments, docs, or copy.
3. MVP exclusions in the PRD are walls: no CRM, no project management, no proposals, no time tracking, no accounting/payroll, no team chat, no AI chatbot, no e-invoicing/IRN, no multi-currency, no native mobile apps, no third-party API. "Nice to have" is a rejection reason.
4. India-first: GST-correct invoices (GSTIN, HSN/SAC, CGST/SGST/IGST by place of supply, sequential numbering per FY), UPI via Razorpay, manual bank-transfer + TDS-adjusted payment recording, WhatsApp-first with email fallback on EVERY notification path.
5. Copy rules: plain first-person English, commas not em-dashes, INR everywhere, no fabricated statistics, no "portal", no "OS".
6. Do not move to the next milestone until the current one passes its exit criteria.
7. No feature beyond the PRD without an explicit scope decision recorded in docs/06-PRODUCT-ROADMAP.md.

---

## 4. CANONICAL TECH DECISIONS (change only with recorded justification)

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, deployed on Vercel.
- Supabase: Postgres, Auth (agency only), Storage (deliverable files), RLS for tenant isolation.
- Background jobs: Inngest (reminder ladder D3/D7/D14, scheduled sends). Never schedule from request handlers.
- Payments: Razorpay (payment links + webhooks as source of truth). Manual payments (NEFT/RTGS + TDS) are first-class events, not an afterthought — brand clients pay by bank transfer, not UPI links.
- WhatsApp Cloud API direct from Meta (templates: deliverable_ready, approval_confirmed, invoice, reminder_gentle, reminder_firm, reminder_final, payment_received). Email fallback via Resend when template fails or client has no WhatsApp.
- PDF invoices: server-rendered (react-pdf or similar).
- Observability: Sentry + PostHog. A message-delivery view is required: WhatsApp template failures will be the #1 support issue.
- Testing: Vitest (invoice math: GST splits, TDS reconciliation, numbering; state transitions) + Playwright E2E on the two flows that can never break: (a) client magic-link view → approve, (b) Razorpay webhook → paid.

---

## 5. YOUR FIRST TASK — BOOTSTRAP THE REPO (documentation only, no app code yet)

Read docs/planning/05-MVP-PRD.md completely. Then CREATE the following, deriving all content from the PRD and this file. Keep every doc tight and implementation-ready; no filler prose.

### 5a. Create docs/
- docs/00-PRODUCT-VISION.md — condensed from §2–3 here.
- docs/02-ICP-AND-PERSONAS.md — three personas: Arjun (agency founder, buyer+admin), Rahul (SMB client contact: WhatsApp-native, taps links, pays UPI), Brand Accounts Team (pays NEFT/RTGS against invoice+PO, deducts TDS, 60–90 day cycles, will never tap a UPI link). Every feature must name which persona it serves.
- docs/06-PRODUCT-ROADMAP.md — V1.0 MVP → V1.1 private-beta iteration → V1.5 paid beta (₹299/mo founding plan) → V2.0 public launch (Free/₹699/₹1,499/₹3,999 hypothesis). Each with objective, scope, exit criteria, exclusions.
- docs/08-USER-FLOWS.md — the complete two-sided flow: agency onboarding (signup → business+GST setup → payment setup → add client → create project → send deliverable in <10 min) and client flow (WhatsApp message → magic link → view → approve/changes → auto invoice in same thread → pay or bank-transfer → reminder ladder → paid). Include edge branches: no WhatsApp (email path), 3 client contacts any-can-approve, partial payment, screenshot/UTR provisional payment + agency one-tap confirm, per-invoice reminder pause, dispute → timeline PDF export.
- docs/09-UX-UI-SPECIFICATION.md — design system: indigo+emerald. Light: primary #4F46E5, hover #4338CA, success #10B981, bg #F8FAFC, surface #FFFFFF, text #0F172A, muted #64748B, border #E2E8F0. Dark: primary #6366F1, success #34D399, bg #0B1120, surface #111827, elevated #1E293B, text #F8FAFC, muted #94A3B8, border #334155. Semantic tokens only; premium/trustworthy/financial; no saffron-green brand palette. Two surface specs: AGENCY dashboard (Money Pipeline front and center: approval-pending / invoiced / overdue / paid + two lists: waiting-on-approval with days-elapsed and viewed-at, waiting-on-payment with aging buckets) and CLIENT magic-link pages (mobile-first, loads fast on mid-range Android/4G and inside the WhatsApp in-app browser, agency branding, max two taps to approve, max two taps to pay).
- docs/10-ARCHITECTURE.md, docs/12-DATABASE.md, docs/13-API-SPECIFICATION.md — from §4 here + the PRD. Database must include: workspaces, users, clients, client_contacts, projects, deliverables, deliverable_versions, deliverable_events (append-only), invoices, invoice_line_items, payments (gateway/manual/provisional, gross-TDS-net), reminders, message_log, magic_link_tokens. API contracts typed and versioned before FE/BE integration. All webhooks idempotent.
- docs/15-SECURITY.md — RLS on all tenant tables with cross-tenant read tests; magic-link token rules; Razorpay + Meta webhook signature verification and replay protection; rate limiting on public endpoints; DPDP posture (minimal client PII, deletion path, no PII in logs); PCI stays with Razorpay.
- docs/16-TESTING-STRATEGY.md — from §4 testing canon + PRD acceptance criteria mapped to tests.
- docs/17-DEPLOYMENT.md — Vercel + Supabase + Inngest, GitHub Actions CI (lint, typecheck, unit, E2E), preview deploys, supabase CLI migrations.

### 5b. Create agents/
ORCHESTRATOR.md plus PRODUCT, ARCHITECTURE, FRONTEND, BACKEND, QA, SECURITY, DEVOPS, DOCUMENTATION, REVIEW (one AGENT.md each). Orchestration rules: only ORCHESTRATOR coordinates; agents read relevant docs before decisions; no silent product redefinition; requirements → architecture → schema review → API contracts → UX spec → implementation → tests → QA → SECURITY review (auth, tenancy, payments, webhooks, magic links) → REVIEW → docs updated; REVIEW flags ANY unrequested feature and ANY client-login surface as CHANGES REQUIRED.

### 5c. Consistency pass
Same terminology everywhere: Workspace, Client, Contact, Deliverable, Version, Approval, Invoice, Payment, Reminder, Pipeline, Magic link. Then report: files created, open questions, and the V1 build plan.

---

## 6. THEN — BUILD V1.0

Follow the PRD's build sequencing (5 weeks nominal):
- W1: scaffold, auth, workspace, clients, branding. Flag to the founder immediately: Meta business verification and Razorpay KYC must be started by the founder in W1 — both have lead time and block P0.5/payments testing.
- W2: deliverables, versions, magic-link client view, approve/request-changes, event log.
- W3: invoice engine (GST math unit-tested first), Razorpay integration, manual bank+TDS payment recording.
- W4: reminder ladder via Inngest, Money Pipeline dashboard, email notifications, timeline PDF export.
- W5: WhatsApp templates + interactive buttons (degrade to email-only if Meta approval hasn't landed — this is an accepted launch state), polish, E2E green, beta onboarding flow.

V1.0 exit = all 8 acceptance criteria in the PRD pass, demonstrated by tests or recorded walkthrough.

Milestone reporting format: files created/modified; scope changes (should be none); acceptance-criteria status; risks; recommended next action.

---

## 7. CONTEXT YOU SHOULD KNOW (do not re-litigate)

- Plain invoicing and plain payment reminders are commoditized in India (Zoho, Refrens, Vyapar, Razorpay native). Zaya's wedge is the CONNECTED loop: approval event → auto invoice → same-thread payment ask → reminders that cite the approval timestamp → pipeline separating approval-stuck from payment-stuck money.
- Client portals with logins have documented adoption failure. That is why rule #1 exists.
- Founder validation interviews may run in parallel with the build; if the founder reports the approval-hypothesis failed, ORCHESTRATOR pauses W2+ and requests a scope decision.