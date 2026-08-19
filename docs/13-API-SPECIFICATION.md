# 13 — API Specification

Contracts are typed and frozen before FRONTEND and BACKEND work in parallel. Source: CLAUDE.md §4 and §5a.

## 1. Conventions
- Base path `/api/v1`. Breaking changes require `/api/v2`, never a silent change to a frozen shape.
- Two authentication realms, and they never mix:
  - `/api/v1/*` — Agency. Supabase session cookie. `workspace_id` is derived from the session, never accepted from the client.
  - `/api/v1/public/*` — Client. `Authorization: Bearer <magic-link-token>` or the token from the page route. No session, no account, ever.
- JSON only. `Content-Type: application/json`. Money is an integer in paise, named `*_paise`. Dates are ISO 8601 UTC, presented in IST by the UI.
- Mutating endpoints accept `Idempotency-Key`. Server stores it per Workspace and replays the original response on a repeat.
- Types are generated from Zod schemas in `lib/contracts/`, shared by handlers, clients, and tests. The schema is the contract, this document is its description.

### Error envelope
```json
{ "error": { "code": "invoice_already_issued", "message": "This deliverable already has an invoice.", "field": null } }
```
| Status | Meaning |
|---|---|
| 400 | validation failed, `field` names the input |
| 401 | not authenticated, or Magic link invalid, expired, or revoked |
| 403 | authenticated but not entitled, including any cross-Workspace attempt |
| 404 | not found, also returned instead of 403 on public routes so a token cannot probe for existence |
| 409 | state conflict, for example approving an already-approved Deliverable |
| 422 | business rule failed, for example issuing an Invoice with no GSTIN |
| 429 | rate limited |
| 500 | unexpected, `request_id` returned, details in Sentry only |

---

## 2. Agency API (`/api/v1`, session-authenticated)

### Workspace and setup
| Method | Path | Body / Notes |
|---|---|---|
| GET | `/workspace` | current Workspace, secrets redacted |
| PATCH | `/workspace` | `{ name?, legal_name?, gstin?, pan?, address*, state_code?, invoice_prefix?, default_hsn_sac?, default_gst_rate_bps?, payment_terms_days?, auto_invoice_buffer_minutes? }` |
| PATCH | `/workspace/branding` | `{ logo_url?, brand_color? }` |
| PUT | `/workspace/payment-setup` | `{ razorpay?: { key_id, key_secret }, bank?: { account_name, account_number, ifsc, branch } }`. Secrets are write-only and never returned. |
| POST | `/workspace/payment-setup/verify-razorpay` | test call plus webhook registration, returns `{ ok, message }` |
| GET | `/workspace/onboarding` | `{ business_done, payment_done, first_client_done, first_deliverable_sent }` |

### Clients and Contacts
| Method | Path | Notes |
|---|---|---|
| GET | `/clients` | `?q&archived&page&per_page` |
| POST | `/clients` | `{ name, gstin?, place_of_supply_state_code?, billing_address?, contacts: Contact[] }`, max 3 Contacts |
| GET | `/clients/:id` | includes Contacts, open Deliverables, Invoices, Payment history |
| PATCH | `/clients/:id` | |
| POST | `/clients/:id/contacts` | 409 when the Client already has 3 Contacts |
| PATCH | `/clients/:id/contacts/:contactId` | |
| DELETE | `/clients/:id/contacts/:contactId` | 409 when it is the last Contact |
| POST | `/clients/:id/magic-links/revoke` | revokes all live tokens for this Client, writes `link_revoked` |

### Projects
`GET /projects?client_id`, `POST /projects` `{ client_id, name, description? }`, `PATCH /projects/:id`, `POST /projects/:id/archive`.

### Deliverables and Versions
| Method | Path | Notes |
|---|---|---|
| GET | `/deliverables` | `?status&client_id&project_id&page`. Supports `status=waiting_approval` for the Pipeline list. |
| POST | `/deliverables` | `{ client_id, project_id?, title, note?, amount_to_invoice_paise, gst_rate_bps?, hsn_sac?, files[]?, external_url? }`, creates Version 1, status `draft` |
| GET | `/deliverables/:id` | includes Versions, files, and the full event timeline |
| PATCH | `/deliverables/:id` | `draft` only |
| POST | `/deliverables/:id/versions` | `{ note?, files[]?, external_url? }`, creates Version N+1, returns status to `sent` when it was `changes_requested` |
| POST | `/deliverables/:id/send` | `{ contact_ids: uuid[] }`. Mints or reuses the Magic link, emits `deliverable.sent`. 422 when the Client has no Contact with a WhatsApp number or an email. |
| POST | `/deliverables/:id/nudge` | resends the current notification, rate limited to 1 per Contact per 6 hours |
| GET | `/deliverables/:id/timeline.pdf` | streams the timeline PDF, writes `timeline_exported` |
| POST | `/deliverables/:id/upload-url` | returns a signed Supabase Storage upload URL |

### Invoices
| Method | Path | Notes |
|---|---|---|
| GET | `/invoices` | `?status&client_id&overdue=true&aging_bucket&page` |
| GET | `/invoices/:id` | line items, Payments, Reminder schedule, balance |
| POST | `/invoices/:id/send` | resends the Invoice to the Client's Contacts |
| POST | `/invoices/:id/reminders/pause` | `{ paused: boolean }`, writes `reminder_paused` or `reminder_resumed` |
| POST | `/invoices/:id/cancel` | `{ reason }`, cancels Reminders, notifies the Client. The number is retired, never reused. |
| GET | `/invoices/:id/pdf` | streams the stored PDF |
| POST | `/invoices/preview` | `{ client_id, amount_paise, gst_rate_bps }` returns the computed GST split without writing anything. No Invoice number is allocated. |

There is deliberately no `POST /invoices`. Invoices are created by the Approval job. The automation is the product.

### Payments
| Method | Path | Notes |
|---|---|---|
| GET | `/payments` | `?invoice_id&client_id&status` |
| POST | `/payments` | manual entry: `{ invoice_id, received_at, gross_paise, tds_paise, net_received_paise?, method, reference?, evidence_storage_path? }`. `net_received_paise` defaults to `gross - tds`. Recomputes settlement and cancels Reminders when the balance reaches zero. |
| POST | `/payments/:id/confirm` | one-tap confirm of a provisional Payment: `{ gross_paise, tds_paise, net_received_paise?, method, reference? }` |
| PATCH | `/payments/:id` | corrections while `provisional`, blocked once `confirmed` |

### Pipeline and Messages
| Method | Path | Returns |
|---|---|---|
| GET | `/pipeline` | `{ totals: { approval_pending_paise, invoiced_paise, overdue_paise, paid_fy_paise }, counts: {...} }` |
| GET | `/pipeline/waiting-approval` | rows with `client, deliverable, version, amount_paise, days_elapsed, first_viewed_at` |
| GET | `/pipeline/waiting-payment` | rows with `client, invoice_number, balance_paise, days_outstanding, aging_bucket, reminders_sent, reminders_paused` |
| GET | `/messages` | `?channel&status&client_id`, the message-delivery view |
| POST | `/messages/:id/resend` | resends, or sends the email fallback |

---

## 3. Client API (`/api/v1/public`, Magic-link-authenticated)
Every route resolves the token first: verify hash, not expired, not revoked, scope matches the requested resource, then loads the Workspace and Client from the token. A token that does not match returns 404, never 403, so it cannot be used to probe. There is no login route, no signup route, and no account route on this surface, and adding one is CHANGES REQUIRED in review.

| Method | Path | Notes |
|---|---|---|
| GET | `/deliverable` | the Deliverable the token is scoped to, plus Agency branding, current Version, files as short-lived signed URLs. First call writes `viewed`. |
| POST | `/deliverable/approve` | `{ version_number, contact_id? }`. Writes `approved`, emits `deliverable.approved`. 409 when already approved, and returns the existing Approval so the page can show the receipt (flow E2). |
| POST | `/deliverable/request-changes` | `{ note }` required, max 1000 chars. Writes `changes_requested`. |
| GET | `/invoice` | Invoice, line items, tax split, balance, `razorpay_short_url` when present, bank details when present, approval reference |
| GET | `/invoice/pdf` | streams the stored PDF |
| POST | `/link/request-new` | called from the expired-link page, notifies the Agency, rate limited to 3 per token per day |

Rate limits on this surface: 60 requests per token per minute, 10 approve or request-changes attempts per token per hour, and a per-IP limit on token verification failures. See docs/15-SECURITY.md §4.

---

## 4. Webhooks (`/api/webhooks/*`)
All three: read the raw body, verify the signature, insert into `webhook_events` on `(provider, provider_event_id)`, return 200 on a duplicate without doing work, then hand off to Inngest. Never do the work inside the handler.

| Path | Provider | Handles |
|---|---|---|
| `/api/webhooks/razorpay` | Razorpay | `payment_link.paid`, `payment.captured`, `payment.failed`, `refund.processed`. HMAC SHA-256 with the Workspace webhook secret, resolved by the payment link id. Source of truth for gateway Payments. |
| `/api/webhooks/whatsapp` | Meta | GET verification challenge; POST message status callbacks into `message_log`, and inbound messages driving plain-text Approval (flow E5) and screenshot Payments (flow E4). `X-Hub-Signature-256` verified against the app secret. |
| `/api/webhooks/resend` | Resend | delivery, bounce, and complaint events into `message_log`. Svix signature verified. |

## 5. Inngest events (internal contract)
`deliverable.sent`, `deliverable.approved`, `deliverable.changes_requested`, `invoice.issued`, `invoice.reminder.due`, `invoice.cancelled`, `payment.confirmed`, `message.send_failed`.
Each payload carries `workspace_id`, the entity id, and an `idempotency_key`. Payloads carry ids, never PII.

## 6. Freezing the contract
A contract is frozen when the Zod schemas are merged and ARCHITECTURE signs off. From that point FRONTEND builds against generated types and mocks while BACKEND implements the handlers. Any change to a frozen shape needs ORCHESTRATOR sign-off and a note in the milestone report, because it invalidates parallel work in flight.
