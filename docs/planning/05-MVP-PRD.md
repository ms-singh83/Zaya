# 05 — MVP PRD (V1.0) — ZAYA

## Scope statement
MVP = the Work → Cash loop, end to end, for one agency and its clients. Buildable in 4–7 weeks solo with AI-assisted development. Anything not required to complete the loop is OUT.

## End users and surfaces (two users, two surfaces, one loop)
Zaya V1 is built for exactly TWO end users. Every feature below must name which user it serves; a feature serving neither is out of scope by definition.

### End user 1 — AGENCY (authenticated app)
Who: owner/manager of a 2–15 person Indian agency. The buyer, the admin, the only authenticated user.
Surface: full web app (responsive, desktop-primary). Supabase Auth (email/Google).
What they can do in V1: set up workspace + branding + GST details + payment setup; manage clients (up to 3 contacts each) and projects; upload deliverables with versions and an amount-to-invoice; send via WhatsApp/email; watch the state machine (sent → viewed → approved → invoiced → paid); see the Money Pipeline dashboard and the two work lists (waiting-on-approval with days elapsed, waiting-on-payment with aging); record manual bank-transfer payments with TDS; confirm screenshot/provisional payments; pause reminders per invoice; export a deliverable timeline as PDF.
What they should almost never need to do: manually create an invoice for an approved deliverable (automation is the product), or manually send a reminder (the ladder is the product).

### End user 2 — CLIENT (zero-login magic-link surface)
Who: the agency's customer — an SMB owner/marketing manager (Persona: Rahul) or a brand's accounts team.
Surface: signed magic-link web pages ONLY. Mobile-first, branded with the agency's logo/colors, fast on mid-range Android over 4G and inside the WhatsApp in-app browser. Bookmarkable. NO account, NO login, NO app, ever. This is an architectural law, not a preference.
What they can do in V1 (complete list — nothing else):
1. View a deliverable (files/links + agency note, current version).
2. Approve (one tap → timestamped receipt to both parties) or Request changes (free-text).
3. View an invoice (web + PDF) with GST details.
4. Pay via Razorpay (UPI/card/netbanking) OR see bank-transfer details (for brand payers who use NEFT/RTGS with TDS).
5. Receive WhatsApp/email notifications and reminders in the same thread.
Plain-text fallback: replying "approve"/"ok" on WhatsApp counts as approval after one confirmation prompt.
What they can never do: log in, see other clients' data, see the agency's pipeline, or edit anything.

### Interaction contract between the two users
Agency acts in the app → system messages the Client → Client acts on a magic link → system updates the Agency's pipeline and fires the next step (invoice, reminder, receipt). Neither user ever needs to chase the other manually; that chase is the product's job.

## The loop (canonical)
Deliverable sent → client views (magic link, zero login) → Approve / Request changes → approval recorded (timestamp, version) → GST invoice auto-generated → payment ask (link + PDF) → reminders D3/D7/D14 → paid (gateway webhook OR manual bank/TDS entry OR screenshot) → ledger + notifications.

## P0 (launch-blocking)
User column: A = Agency, C = Client, A+C = both surfaces.
| # | Feature | User | Notes |
|---|---|---|---|
| 1 | Auth + workspace | A | Supabase Auth (email/Google); single org per user in MVP |
| 2 | Branding | A+C | Logo + color on client-facing pages and invoice PDF |
| 3 | Clients | A | Name, WhatsApp number, email, GSTIN optional; up to 3 contacts per client |
| 4 | Deliverables + minimal versioning | A | File(s) or URL + note; v1/v2/v3 numbering only, no diffing |
| 5 | Magic-link client view | C | Signed token, bookmarkable, mobile-first, no account ever |
| 6 | Approve / Request changes | C | Buttons on web view; free-text reply captured on changes |
| 7 | Approval audit trail | A+C | Append-only event log; export timeline as PDF |
| 8 | Invoice generation | A+C | GST-compatible fields (GSTIN, HSN/SAC, CGST/SGST/IGST, sequential numbering per FY); PDF |
| 9 | Payment link + status | C | Razorpay (UPI/card/netbanking); webhook-driven state |
| 10 | Manual payment recording | A | Bank transfer + TDS-adjusted amount (Persona C is unusable without this) |
| 11 | Automated reminder ladder | C | D3 gentle / D7 firm / D14 final citing approval date; per-invoice pause toggle |
| 12 | Receivables dashboard | A | Money Pipeline: approval-pending / invoiced / overdue / paid; aging buckets |
| 13 | Email notifications | A+C | Resend; email is the guaranteed channel for every event |

## P0.5 (target for launch, degradable)
- WhatsApp Cloud API sends (deliverable_ready, approval_confirmed, invoice, 3 reminder tiers, payment_received) with interactive Approve/Changes buttons. Meta business verification + template approval starts WEEK 1 (long pole). If blocked at launch: ship email-only, WhatsApp in V1.1. Plain-text "approve"/"ok" replies count as approval after one AI confirm question.
- Screenshot/UTR capture: client sends payment screenshot → provisional paid → agency one-tap confirm. (Manual confirm ships P0; AI extraction may slip to V1.1.)

## P1 (V1.1, private-beta iteration)
Retainer auto-invoicing (1st of month); partial payments; client payment history; TDS reconciliation report; multi-user seats; Cashfree fallback.

## Explicitly NOT in MVP (do not build; reject in review)
CRM, project management, proposals, e-sign, time tracking, accounting replacement, payroll, team chat, AI chatbot, 50 integrations, e-invoicing/IRN, multi-currency, mobile apps (responsive web only), API for third parties.

## Acceptance criteria (loop-level)
1. Agency can go signup → first deliverable sent in <10 minutes.
2. Client completes view→approve on a mid-range Android over 4G in <60 seconds, zero account.
3. Approval fires invoice + payment ask automatically (or after configured buffer).
4. Razorpay webhook flips invoice to PAID and notifies both sides in <1 minute.
5. Manual bank+TDS payment entry reconciles invoice correctly (₹75,000 invoice, ₹73,500 received, TDS ₹1,500 recorded).
6. Reminder ladder fires on schedule and stops on payment; pause toggle honored.
7. Timeline PDF export shows sent/viewed/approved/reminded/paid with timestamps.
8. Playwright E2E green on: client approval flow, payment webhook flow.

## Success metrics (private beta)
≥10 workspaces onboarded; ≥1 real client payment collected through the platform per active workspace; ≥5 convert to paid founding plan (₹299/mo) at V1.5.

## Build sequencing (5 weeks nominal)
W1: auth, workspace, clients, branding + start Meta verification & Razorpay KYC. W2: deliverables, magic-link view, approve/changes, event log. W3: invoice engine, Razorpay, manual/TDS payments. W4: reminder ladder (Inngest), dashboard, email notifications. W5: WhatsApp templates, polish, E2E, beta onboarding.
