# 06 — Product Roadmap

Source: CLAUDE.md §5a and §7, docs/planning/05-MVP-PRD.md. This file is also the scope decision log. No feature beyond the PRD ships without an entry in §5.

## V1.0 — MVP (private build, 5 weeks nominal)
**Objective:** the Work to Cash loop, end to end, for one Agency and its Clients.

**Scope (P0, launch-blocking):** Auth and Workspace; Branding; Clients and Contacts; Deliverables and Versions; Magic link Client view; Approve / Request changes; Approval audit trail plus timeline PDF export; Invoice generation with GST fields and PDF; Razorpay payment link and webhook-driven status; manual Payment recording with TDS; automated Reminder ladder D3 / D7 / D14 with per-Invoice pause; Money Pipeline dashboard; email notifications via Resend.

**Scope (P0.5, target for launch, degradable):** WhatsApp Cloud API sends for `deliverable_ready`, `approval_confirmed`, `invoice`, `reminder_gentle`, `reminder_firm`, `reminder_final`, `payment_received`, with interactive Approve and Request changes buttons; plain-text "approve" or "ok" reply counted as Approval after one confirmation prompt; screenshot / UTR capture producing a provisional Payment that the Agency confirms in one tap.

**Accepted degraded launch state:** if Meta business verification or template approval has not landed, V1.0 ships email-only and WhatsApp moves to V1.1. This is a planned outcome, not a failure.

**Exit criteria:** all 8 PRD acceptance criteria pass, demonstrated by tests or a recorded walkthrough. See docs/16-TESTING-STRATEGY.md §6 for the criterion-to-test map.
1. Agency goes signup to first Deliverable sent in under 10 minutes.
2. Client completes view to Approve on a mid-range Android over 4G in under 60 seconds, zero account.
3. Approval fires the Invoice and the payment ask automatically, or after the configured buffer.
4. Razorpay webhook flips the Invoice to paid and notifies both sides in under 1 minute.
5. Manual bank plus TDS Payment reconciles correctly: ₹75,000 Invoice, ₹73,500 received, ₹1,500 TDS recorded.
6. Reminder ladder fires on schedule, stops on Payment, honours the pause toggle.
7. Timeline PDF export shows sent, viewed, approved, reminded, paid with timestamps.
8. Playwright E2E green on the Client approval flow and the Payment webhook flow.

**Exclusions:** everything in §4 below, plus everything listed in V1.1 and later.

**Founder blockers to start in W1:** Meta business verification and Razorpay KYC. Both have lead time and both block P0.5 and payments testing.

## V1.1 — private beta iteration
**Objective:** make the loop survive contact with 10 real Workspaces.
**Scope:** WhatsApp if it slipped from V1.0; retainer auto-invoicing on the 1st of the month; partial Payments as a first-class Client-visible state; Client payment history page; TDS reconciliation report; multi-user seats; Cashfree as a payment fallback; AI extraction of amount and UTR from a payment screenshot.
**Exit criteria:** at least 10 Workspaces onboarded; at least 1 real Client Payment collected through the platform per active Workspace; WhatsApp template failure rate visible and under control on the message-delivery view.
**Exclusions:** anything in §4.

## V1.5 — paid beta
**Objective:** prove someone pays for it.
**Scope:** founding plan at ₹299/mo, billing and subscription handling, plan limits, in-app upgrade path, onboarding polish driven by V1.1 findings.
**Exit criteria:** at least 5 Workspaces convert to the ₹299/mo founding plan.
**Exclusions:** anything in §4. Pricing above founding tier is not built here.

## V2.0 — public launch
**Objective:** open signup on a tiered plan.
**Scope:** Free / ₹699 / ₹1,499 / ₹3,999 tier hypothesis (a hypothesis, not a decision), self-serve onboarding, public marketing surface, support tooling.
**Exit criteria:** to be set at V1.5 exit, recorded here.
**Exclusions:** anything in §4 unless promoted by a scope decision recorded in §5.

## 4. Permanent exclusions (walls, not backlog)
CRM. Project management. Proposals. E-sign. Time tracking. Accounting replacement. Payroll. Team chat. AI chatbot. Large integration catalogue. E-invoicing / IRN. Multi-currency. Native mobile apps, responsive web only. Third-party API.

Any of these appearing in a PR is CHANGES REQUIRED from REVIEW, regardless of how small the diff is. "Nice to have" is a rejection reason.

## 5. Scope decision log
Every deviation from the PRD, in either direction, gets a row here before it is built. No row, no build.

| ID | Date | Requested by | Decision | Rationale | Milestone | Approved by |
|---|---|---|---|---|---|---|
| SD-000 | 2026-08-19 | ORCHESTRATOR | Repository bootstrapped as documentation only, no application code | CLAUDE.md §5 | Pre-W1 | Founder (pending) |

**Open scope questions awaiting founder decision** are listed in the bootstrap report and must become SD rows before the affected work starts.
