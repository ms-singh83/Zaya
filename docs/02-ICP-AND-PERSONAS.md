# 02 — ICP and Personas

Source: CLAUDE.md §2 and §5a, docs/planning/05-MVP-PRD.md. Every feature must name the persona it serves.

## Ideal customer profile (the buyer)
- 2 to 15 person Indian agency: social media, content, influencer, creative, digital, video, or web.
- Bills in INR, GST-registered, issues 5 to 40 Invoices a month.
- Client mix is split: SMB clients who pay by UPI, and brand clients whose accounts teams pay by NEFT / RTGS against an Invoice and a PO, and deduct TDS.
- Work is delivered as files or links and needs sign-off before it can be billed.
- Not the ICP: solo freelancers with 1 to 2 clients, 50-plus person agencies with a finance team and an ERP, non-India billing, product companies.

## Persona A — Arjun, agency founder (Agency surface)
**Role:** owner, buyer, admin, and in V1 the only authenticated user.
**Context:** runs delivery and sales. Chases payment personally over WhatsApp, and hates it. Keeps approvals in WhatsApp screenshots and email threads, so disputes turn into archaeology.
**Wants:** money in the bank sooner, less awkward chasing, proof of what was approved and when.
**Fears:** looking pushy with a brand client, losing a client over a reminder, an Invoice with wrong GST.
**Surface:** full web app, desktop-primary, responsive.
**Succeeds when:** they sign up and send their first Deliverable in under 10 minutes, then never manually writes an Invoice or a Reminder again.
**Fails us when:** they have to manually create an Invoice for an approved Deliverable, or manually send a Reminder. Both mean the automation did not do its job.

## Persona B — Rahul, SMB client contact (Client surface)
**Role:** owner or marketing manager at the Agency's SMB customer. Approves work and pays for it themselves.
**Context:** WhatsApp-native. Lives on a mid-range Android on 4G. Taps links inside the WhatsApp in-app browser. Will not install an app, will not create an account, will not remember a password.
**Wants:** see the work, say yes, pay, in under a minute, on their phone.
**Fears:** signing up for one more tool, entering card details on a page they do not trust.
**Surface:** Magic link pages only, branded with the Agency's logo and colour.
**Succeeds when:** view to Approve takes under 60 seconds with zero account, and paying takes at most two taps.
**Pays by:** Razorpay UPI, sometimes card or netbanking.
**Fallback:** replying "approve" or "ok" on WhatsApp counts as an Approval after one confirmation prompt.

## Persona C — Brand accounts team (Client surface)
**Role:** accounts payable staff at a brand or a larger company. Not the person who approved the work, and often not the person who received it.
**Context:** pays by NEFT / RTGS against an Invoice, usually needs a PO reference, deducts TDS at source, runs 60 to 90 day payment cycles, works from a shared inbox. Will never tap a UPI link.
**Wants:** a correct GST Invoice with a GSTIN, HSN/SAC, and clean tax splits, plus bank details they can hand to their bank.
**Fears:** a mismatched Invoice number or GSTIN that fails their internal check and restarts the cycle.
**Surface:** Magic link Invoice page (web plus PDF) with bank-transfer details, and email. Email is the guaranteed channel for this persona.
**Succeeds when:** the Invoice PDF passes their internal check first time, and the Agency can record the received amount with TDS so both sides agree the Invoice is settled.
**Notable:** Persona C makes manual Payment recording with TDS a P0 feature, not an afterthought. Without it, Zaya is unusable for any Agency with brand clients.

## Feature to persona map (P0 and P0.5)
| # | Feature | Serves | Persona |
|---|---|---|---|
| 1 | Auth and Workspace | Agency | A |
| 2 | Branding (logo, colour on Client pages and Invoice PDF) | Agency + Client | A, B, C |
| 3 | Clients and Contacts (up to 3 Contacts each) | Agency | A |
| 4 | Deliverables and minimal Versioning | Agency | A |
| 5 | Magic link Client view | Client | B, C |
| 6 | Approve / Request changes | Client | B |
| 7 | Approval audit trail, timeline PDF export | Agency + Client | A (dispute defence), C (proof) |
| 8 | Invoice generation, GST fields, PDF | Agency + Client | A, C |
| 9 | Payment link and status (Razorpay) | Client | B |
| 10 | Manual Payment recording with TDS | Agency | A on behalf of C |
| 11 | Automated Reminder ladder D3 / D7 / D14, per-Invoice pause | Client | B, C (pause exists because of C) |
| 12 | Receivables dashboard (Money Pipeline) | Agency | A |
| 13 | Email notifications | Agency + Client | A, B, C (guaranteed channel) |
| P0.5 | WhatsApp Cloud API sends and interactive buttons | Agency + Client | B primarily |
| P0.5 | Screenshot / UTR provisional Payment, Agency one-tap confirm | Agency + Client | B sends, A confirms |

## Persona-driven rules
- Any Client-facing page must render usefully for both B (phone, UPI, one tap) and C (desktop or shared inbox, PDF, bank details). Never assume UPI.
- Any notification must have an email path, because C may have no WhatsApp presence at all.
- Reminder copy must stay usable for C, whose 60 to 90 day cycle is normal and not delinquent. The pause toggle exists for exactly this.
