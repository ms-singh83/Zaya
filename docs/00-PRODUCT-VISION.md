# 00 — Product Vision

Source: CLAUDE.md §2 and §3, docs/planning/05-MVP-PRD.md. Nothing in this file is new product scope.

## One line
The moment a Client approves a Deliverable, the GST Invoice sends itself with a payment link, and Reminders escalate until the money lands.

Customer-facing pitch: "See where every rupee is stuck, and stop chasing it manually."

## Who it is for
Two end users, two surfaces, one loop. Every feature in every doc must name which user it serves. A feature serving neither is out of scope by definition.

| | Agency (End user 1) | Client (End user 2) |
|---|---|---|
| Who | Owner or manager of a 2 to 15 person Indian agency (social media, content, influencer, creative, digital, video, web) | The Agency's customer: an SMB owner or marketing manager, or a brand's accounts team |
| Surface | Full authenticated web app, responsive, desktop-primary | Signed Magic link web pages only, mobile-first |
| Auth | Supabase Auth (email or Google) | None, ever |
| Job to be done | "Get paid faster with less awkward chasing, and have proof when clients dispute." | "See the work, say yes, pay, without installing or signing up for anything." |

## The loop (canonical)
Deliverable sent, Client views on a Magic link with zero login, Client Approves or Requests changes, Approval recorded with timestamp and Version, GST Invoice auto-generated, payment ask sent (link plus PDF), Reminders at D3 / D7 / D14, Payment lands (gateway webhook, or manual bank and TDS entry, or screenshot), ledger and notifications updated.

Deliverable lifecycle: `draft → sent → viewed → changes_requested → approved → invoiced`, then the Invoice carries `issued → reminded → paid` or `overdue`. Every transition is an append-only event. The event log IS the audit trail ("Approved, 18 Aug, 4:12 PM, Version 3"), and the audit trail is the emotional hook of the product. See docs/10-ARCHITECTURE.md §3 for the unified Pipeline stage that presents both halves as one timeline.

## The wedge
Plain invoicing and plain payment reminders are commoditised in India (Zoho, Refrens, Vyapar, Razorpay native). Do not re-litigate this. Zaya's wedge is the connected loop:

1. Approval event triggers the Invoice, the Agency never types it.
2. The payment ask lands in the same WhatsApp thread as the approval.
3. Reminders cite the approval timestamp, which is intended to make them land without sounding rude.
4. The Pipeline separates approval-stuck money from payment-stuck money, which no invoicing tool does.

Client portals that require a login have documented adoption failure. That is why the Client never gets one.

## Hard rules (binding on every doc, agent, and line of code)
1. **The Client never gets a login.** Magic links only: signed, expiring, single-Client-scoped, revocable. If a design requires the Client to create anything, the design is wrong. Delete it.
2. **"Approval delay causes late payment" is a HYPOTHESIS.** Never state it as fact in code comments, docs, copy, or commit messages. See §Hypothesis register below.
3. **MVP exclusions are walls**, not backlog. "Nice to have" is a rejection reason.
4. **India-first**: GST-correct Invoices (GSTIN, HSN/SAC, CGST/SGST/IGST by place of supply, sequential numbering per financial year), UPI via Razorpay, manual bank transfer plus TDS-adjusted Payment recording, WhatsApp-first with email fallback on every notification path.
5. **Copy rules**: plain first-person English, commas not em-dashes, INR everywhere, no fabricated statistics, never the words "portal" or "OS" in user-facing text.
6. Do not move to the next milestone until the current one passes its exit criteria.
7. No feature beyond the PRD without an explicit scope decision recorded in docs/06-PRODUCT-ROADMAP.md.

## Explicitly not built (reject in review)
CRM, project management, proposals, e-sign, time tracking, accounting replacement, payroll, team chat, AI chatbot, broad integration catalogue, e-invoicing / IRN, multi-currency, native mobile apps (responsive web only), third-party API.

## Hypothesis register
| ID | Hypothesis | Status | Falsified by | If falsified |
|---|---|---|---|---|
| H1 | Approval delay is a material contributor to late payment | Unvalidated | Founder validation interviews | ORCHESTRATOR pauses W2 and later, requests a scope decision from the founder |
| H2 | Agencies will pay ₹299/mo for the connected loop | Unvalidated | V1.5 paid beta conversion | Re-price or re-scope at V1.5, recorded in docs/06-PRODUCT-ROADMAP.md |
| H3 | Clients approve on a Magic link faster than they approve over email threads | Unvalidated | Private beta telemetry (time from `sent` to `approved`) | Keep the loop, revisit the Client page design |

Validation interviews may run in parallel with the build. If the founder reports that H1 failed, ORCHESTRATOR stops W2 and later work and requests a scope decision. It does not decide alone.
