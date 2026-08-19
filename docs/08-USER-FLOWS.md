# 08 — User Flows

Source: CLAUDE.md §5a, docs/planning/05-MVP-PRD.md. Every flow names its surface: **[Agency]** authenticated web app, **[Client]** Magic link pages, **[System]** background job or webhook.

Terminology is fixed: Workspace, Client, Contact, Deliverable, Version, Approval, Invoice, Payment, Reminder, Pipeline, Magic link.

---

## F1 — Agency onboarding, signup to first Deliverable sent in under 10 minutes
Acceptance criterion 1. Target: 6 screens, no dead ends, every step skippable except business details.

1. **[Agency] Sign up.** Supabase Auth, email or Google. On first login the Workspace row is created and the user becomes its owner. One Workspace per user in V1.
2. **[Agency] Business and GST setup.** Legal name, display name, GSTIN (validated for format and checksum), PAN, registered address, state code (drives place of supply), default HSN/SAC, Invoice number prefix, financial year start (fixed at 1 April). Required before an Invoice can be issued, not before a Deliverable can be sent.
3. **[Agency] Branding.** Logo upload and one brand colour. Applied to Client pages, emails, and the Invoice PDF. Skippable, defaults to the Zaya indigo.
4. **[Agency] Payment setup.** Two independent switches, at least one required before an Invoice can be sent:
   - Razorpay: connect keys, verify with a test call, register the webhook. Blocked until Razorpay KYC is done, so the setup screen states plainly that KYC takes days and can be finished later.
   - Bank transfer: account name, account number, IFSC, branch. Shown to Persona C on the Invoice page and PDF.
5. **[Agency] Add a Client.** Name, WhatsApp number (E.164), email, GSTIN optional, place of supply state code (defaults from GSTIN when present), up to 3 Contacts each with name, WhatsApp number, email, and role.
6. **[Agency] Create a Project.** Name and optional description, belongs to one Client. A Project is a folder for Deliverables, nothing more.
7. **[Agency] Create and send a Deliverable.** Title, note to the Client, files uploaded to Supabase Storage or an external URL, amount to invoice on Approval, GST rate, HSN/SAC, and which Contacts to notify. Creates Version 1. Status `draft`.
8. **[Agency] Send.** Status goes `draft → sent`. **[System]** mints a Magic link scoped to this Client and this Deliverable, sends `deliverable_ready` on WhatsApp to every selected Contact, and always sends the email as well when the Contact has an email. Event `sent` written.

**Onboarding checklist** persists on the dashboard until all of business details, payment setup, first Client, and first Deliverable sent are done.

---

## F2 — The core loop, Deliverable to cash
```
[Agency] send Deliverable
   → [Client] WhatsApp/email with Magic link
   → [Client] opens link            (event: viewed)
   → [Client] Approve   ───────────► (event: approved, version N, timestamp)
        │                              → [System] generate GST Invoice
        │                              → [System] send Invoice + payment ask in the same thread
        │                              → [System] schedule Reminders D3 / D7 / D14
        │                              → [Client] pays  → (event: paid) → receipts to both sides
        │                                    or [Agency] records manual Payment with TDS
        └ Request changes ─────────► (event: changes_requested, free text)
                                       → [Agency] uploads Version N+1 → back to sent
```

### F2.1 [Client] Open the Magic link
Token in the URL path is verified, not expired, not revoked, scoped to this Client and this Deliverable. First open writes a `viewed` event with a timestamp, later opens update `last_used_at` only. The page loads the Agency's branding, the Deliverable title, the Agency's note, the current Version, the files or link, and two buttons. No login. No account. No navigation to anything else.

### F2.2 [Client] Approve
One tap. A confirmation sheet states what is being approved ("Version 3 of Reel edit, 18 Aug"). Confirm writes an `approved` event carrying the Version number, the acting Contact, and the server timestamp. The Client sees a receipt page. **[System]** sends `approval_confirmed` to the Client and notifies the Agency. Deliverable goes `sent`/`viewed` → `approved`.

### F2.3 [Client] Request changes
One tap, then a free-text box (required, 1000 char limit). Writes `changes_requested` with the text. **[System]** notifies the Agency on email and in-app. Deliverable goes to `changes_requested`. The Magic link stays valid, and the page now shows the change request and "waiting for a new version".

### F2.4 [Agency] Ship a new Version
Upload files or a URL plus a note. Creates Version N+1, writes `version_added`, returns the Deliverable to `sent`, and re-sends the same Magic link. The Magic link is not re-minted, so a bookmarked link keeps working. Days-elapsed on the waiting-on-approval list resets to the new send date, and the original send date stays in the event log.

### F2.5 [System] Approval fires the Invoice
On `approved`, an Inngest job runs, never the request handler:
1. Wait the Workspace's configured auto-invoice buffer (default 0 minutes, settable up to 24 hours so the Agency can catch a mistake).
2. Allocate the next Invoice number for the current financial year, gapless, per Workspace, under a row lock.
3. Compute GST from the Workspace state code against the Client's place of supply. Same state gives CGST plus SGST at half rate each, different state gives IGST at the full rate.
4. Render the PDF with Agency branding, GSTIN, HSN/SAC, tax splits, bank details, and the approval line ("Approved on 18 Aug 2026, 4:12 PM, Version 3").
5. Create a Razorpay payment link when Razorpay is connected.
6. Write `invoice_generated`, set Deliverable to `invoiced`, set Invoice to `issued`.
7. Send the `invoice` message on WhatsApp in the same thread as the Approval, and by email always.
8. Schedule Reminders at issue_date + 3, + 7, + 14 days.

Idempotency: one Invoice per Deliverable Approval. A duplicate `approved` event never mints a second Invoice number.

### F2.6 [Client] Pay
The Invoice page shows the amount, the tax split, the due date, a Pay button, and bank-transfer details side by side. Two taps maximum to reach the Razorpay checkout.
- **Razorpay path (Persona B):** Pay, complete UPI or card or netbanking, return to a receipt page. Truth comes from the `payment_link.paid` / `payment.captured` webhook, never from the browser redirect.
- **Bank transfer path (Persona C):** account name, number, IFSC, branch, the Invoice number to quote, and a copy button on each field. Nothing to tap beyond copy.

### F2.7 [System] Payment lands
Webhook verified and de-duplicated by event id. Payment row written with `source = gateway`, status `confirmed`. Invoice goes to `paid` when confirmed gross across all Payments is greater than or equal to the Invoice total. Remaining scheduled Reminders are cancelled. `payment_received` goes to the Client, and the Agency is notified. Target: under 1 minute end to end (acceptance criterion 4).

### F2.8 [Agency] Record a manual Payment (Persona C, P0)
Form fields: date received, gross amount settled against the Invoice, TDS deducted, net amount received (auto-computed as gross minus TDS, editable), method (NEFT, RTGS, IMPS, UPI, cheque), UTR or reference, optional evidence file.
Worked example from acceptance criterion 5: Invoice ₹75,000, net received ₹73,500, TDS ₹1,500. Gross settled is ₹75,000, so the Invoice balance is ₹0 and it goes to `paid`. TDS is recorded, never re-added to the balance. Zaya records the TDS figure the Agency enters, it does not compute the TDS rate.

---

## F3 — Reminder ladder
**[System]**, Inngest scheduled jobs, one per tier.

| Tier | Fires | Tone | Cites |
|---|---|---|---|
| `gentle` | issue_date + 3 days | friendly nudge | Invoice number, amount, approval date |
| `firm` | issue_date + 7 days | direct | days outstanding, approval date |
| `final` | issue_date + 14 days | plain and final | days outstanding, approval date, bank details repeated |

Every tier goes to the Client's Contacts on WhatsApp with email always sent as well. Every tier cites the Approval timestamp, which is the design intent of the ladder. Copy never claims a legal consequence and never implies the Client is dishonest.

**Base date:** all three tiers count from the Invoice issue date, not the due date. With the default payment terms of 7 days, the `gentle` tier at D3 lands before the due date and reads as a pre-due nudge, `firm` at D7 lands on the due date, and `final` at D14 is a week overdue. This base date is a documented choice, not a PRD instruction, and the founder can move the ladder to due-date-relative with a scope decision row.

**Stops when:** Invoice reaches `paid` or `cancelled`, or the Agency pauses Reminders on that Invoice.
**Pause:** per-Invoice toggle on the Agency Invoice screen. Cancels scheduled sends, writes `reminder_paused`. Resume reschedules only the tiers whose date has not passed. A tier whose date passed while paused is skipped, never fired late in a burst.
**Overdue:** an Invoice past its due date and not paid is `overdue` in the Pipeline. Overdue is a Pipeline state, it does not add extra Reminders beyond the three tiers.

---

## F4 — [Agency] Money Pipeline dashboard
Four totals across the top: approval-pending, invoiced, overdue, paid (this financial year). Two lists below, because approval-stuck money and payment-stuck money are different problems:
1. **Waiting on approval:** Client, Deliverable, Version, days elapsed since sent, viewed-at ("Viewed 2 days ago" or "Not opened yet"). Actions: nudge, open Deliverable.
2. **Waiting on payment:** Client, Invoice number, amount, aging bucket (0 to 30, 31 to 60, 61 to 90, 90-plus days), Reminders sent so far, paused flag. Actions: record Payment, pause or resume Reminders, resend Invoice.

---

## Edge branches

### E1 — Client has no WhatsApp, or the WhatsApp send fails
Detection: Contact has no WhatsApp number, or the Cloud API returns a template or delivery failure, or delivery is not confirmed within 60 seconds.
Behaviour: **[System]** sends the email equivalent immediately and marks the message log row `fallback_sent` linked to the failed row. The Agency sees "WhatsApp failed, sent by email instead" on the Deliverable and on the message-delivery view. The loop never stalls on a channel failure. Email is the guaranteed channel for every event.

### E2 — Three Contacts, any one can approve
A Client may have up to 3 Contacts. All selected Contacts receive their own Magic link token. Any single Contact can Approve, and the first Approval wins. The event records which Contact acted. Later opens by other Contacts show "Already approved by Priya on 18 Aug, 4:12 PM" and the Approve button is gone. There is no approval quorum, no approver hierarchy, and no reassignment in V1.

### E3 — Partial Payment
V1.0 behaviour: Payments are rows, so the Invoice balance is always gross settled minus Invoice total. A Payment smaller than the balance leaves the Invoice `issued` (or `overdue`) with the remaining balance shown **to the Agency only**, and the Reminder ladder continues unchanged. Client-visible partial-payment state, adjusted Reminder copy, and a Client payment history page are V1.1 (PRD P1). Do not build them in V1.0.

### E4 — Screenshot or UTR provisional Payment
**[Client]** replies to the WhatsApp thread with a payment screenshot or a UTR string. **[System]** creates a Payment with `source = provisional`, status `provisional`, amount left blank when it cannot be read, evidence file stored, and writes `payment_recorded`. The Invoice does not move to `paid` on a provisional Payment. The Agency sees a "confirm this payment" card on the Pipeline, opens it, fills or corrects gross, TDS, net, and reference, and confirms in one tap. On confirm the Payment becomes `confirmed`, Invoice settlement is recalculated, and `payment_confirmed` is written. Reminders keep running while a Payment is provisional, and the Agency is told this on the confirm card so a pause is a deliberate choice. AI extraction of amount and UTR is V1.1, manual confirm ships in V1.0.

### E5 — Plain-text WhatsApp approval
**[Client]** replies "approve", "ok", "approved", "haan", or similar in the thread instead of tapping. **[System]** replies with one confirmation question naming the exact Deliverable and Version. A confirming reply writes a normal `approved` event with `actor_channel = whatsapp_text`, and the loop proceeds identically. An ambiguous or negative reply is routed to the Agency, never guessed. Requires WhatsApp, so this branch is inert in the email-only degraded launch.

### E6 — Dispute, timeline PDF export
**[Agency]** opens a Deliverable, taps Export timeline. Server renders a branded PDF of the append-only event log: sent, delivered, viewed, each Version, changes requested with the Client's text, approved with Contact name and timestamp, Invoice issued with number, each Reminder sent, each Payment. Every row shows a server timestamp in IST plus the actor. The PDF is generated on demand, is not editable in the app, and is the artefact the Agency forwards when a Client disputes. Acceptance criterion 7.

### E7 — Magic link expired or revoked
The page shows the Agency's branding and a plain message: this link has expired, ask the Agency to send a new one, with a "request a new link" button that notifies the Agency. No error codes, no login prompt, and never an account creation offer. The Agency can revoke and re-mint a link for any Client from the Client screen.

### E8 — Invoice needs correcting after issue
V1.0 has no Invoice editing after issue, because Invoice numbers are gapless and sequential per financial year. The Agency cancels the Invoice (status `cancelled`, reason recorded, Reminders cancelled, Client notified) and issues a fresh Invoice with the next number. The cancelled number is never reused and never removed from the series.

### E9 — Approval arrives with no payment method configured
The Approval is still recorded and the Invoice is still generated with bank details omitted if none exist. The Agency gets a blocking banner: "Add payment details so this Invoice can be paid." The Invoice is not sent to the Client until at least one payment method exists. The Approval is never blocked by Agency setup.
