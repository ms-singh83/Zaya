# 10 — Architecture

Source: CLAUDE.md §4, docs/planning/05-MVP-PRD.md. Canonical tech decisions change only with a recorded justification in docs/06-PRODUCT-ROADMAP.md §5.

## 1. Stack
| Concern | Choice |
|---|---|
| App | Next.js App Router, TypeScript strict, Tailwind, shadcn/ui |
| Hosting | Vercel |
| Database, auth, storage | Supabase: Postgres, Auth (Agency only), Storage, RLS for tenant isolation |
| Background jobs | Inngest |
| Payments | Razorpay payment links plus webhooks |
| WhatsApp | WhatsApp Cloud API direct from Meta |
| Email | Resend |
| PDFs | Server-rendered, react-pdf |
| Observability | Sentry, PostHog, plus an in-app message-delivery view |
| Tests | Vitest, Playwright |

## 2. Topology
```
Browser (Agency, authenticated)      Browser (Client, Magic link, no auth)
        │                                        │
        ▼                                        ▼
 Next.js on Vercel ─ App Router: /app (Agency)  /v/[token] (Client)
        │                        /api/v1/*      /api/v1/public/*
        │                        /api/webhooks/{razorpay,whatsapp,resend}
        ├──────────► Supabase Postgres (RLS) + Storage
        ├──────────► Inngest  (events in, scheduled functions out)
        ├──────────► Razorpay (payment links)
        ├──────────► WhatsApp Cloud API
        └──────────► Resend
Inngest ──► Next.js /api/inngest ──► same service layer as the app
```

## 3. Domain model and the state machine
One loop per Deliverable, stored across two status columns plus an append-only event log.

- `deliverables.status`: `draft → sent → viewed → changes_requested → approved → invoiced`
- `invoices.status`: `draft → issued → paid`, plus `cancelled`, with `overdue` derived from `due_date`
- **Pipeline stage** is a derived read-model that presents the whole loop from CLAUDE.md §2 as one timeline to users: `draft, sent, viewed, changes_requested, approved, invoiced, reminded, paid, overdue`. `reminded` means an Invoice is `issued`, unpaid, and has at least one sent Reminder. `overdue` means `issued` and past due date. Users see one loop, the database keeps the two entities honest.

Transitions are executed only through a single server-side state machine module. No route handler mutates a status directly. Every transition writes a row to `deliverable_events` in the same transaction as the status change. `deliverable_events` is append-only: no UPDATE and no DELETE grant, enforced by a trigger. The event log is the audit trail and the source of the timeline PDF.

## 4. Layering
```
app/(agency)/**        Server Components + Server Actions, Agency surface
app/(client)/v/**      Server-rendered Client Magic link pages, zero JS beyond the two actions
app/api/v1/**          Typed route handlers (agency-authenticated)
app/api/v1/public/**   Typed route handlers (magic-link-authenticated)
app/api/webhooks/**    Signature-verified, idempotent
app/api/inngest        Inngest handler
lib/domain/**          State machine, GST engine, Invoice numbering, TDS settlement, Reminder scheduling. Pure, unit-tested, no I/O.
lib/services/**        Orchestration: transactions, event writes, job dispatch
lib/integrations/**    razorpay, whatsapp, resend, storage. One adapter each, all mockable.
lib/db/**              Supabase clients, generated types, query helpers
lib/auth/**            Agency session, Magic link verification
```
Rule: `lib/domain` never imports `lib/integrations` or `lib/db`. All money maths is pure and unit-tested before any UI exists (docs/16-TESTING-STRATEGY.md §2).

## 5. Tenancy
Every tenant table carries `workspace_id`. RLS is on for all of them, and the Agency app uses the user's Supabase JWT so the database, not the application, enforces isolation. Client Magic link requests never carry a user JWT. They are resolved server-side: verify token, load its Workspace, Client, and scope, then query through a service-role client that is confined to `lib/services/public/*` and always filters by the token's `workspace_id`, `client_id`, and `resource_id`. The service-role key is never used in Agency request paths and never reaches the browser. Details and tests in docs/15-SECURITY.md.

## 6. Background jobs (Inngest)
Never schedule from a request handler. Handlers emit an event, Inngest owns the timing.

| Function | Trigger | Does |
|---|---|---|
| `deliverable.sent` | event | mint Magic link, send WhatsApp, send email, log messages |
| `deliverable.approved` | event | wait the auto-invoice buffer, generate the Invoice, render the PDF, create the Razorpay link, send the payment ask, schedule Reminders |
| `invoice.reminder` | scheduled, one run per tier | send the tier if the Invoice is still unpaid and Reminders are not paused, else skip and record why |
| `invoice.overdue.sweep` | daily cron | mark Invoices overdue in the read-model, refresh aging |
| `message.fallback` | event or 60s timeout | send the email equivalent when WhatsApp fails or is unconfirmed |
| `payment.confirmed` | event | recompute settlement, cancel remaining Reminders, notify both sides |

Every function is idempotent on a natural key (`deliverable_id + version`, `invoice_id + tier`, `provider_event_id`). Retries are safe by construction, not by luck. All jobs are cancellable by an Invoice reaching `paid` or `cancelled`.

## 7. Webhooks
All webhooks: verify the signature before parsing the body, read the raw body for HMAC, reject on failure with 401 and no detail, then insert into `webhook_events` keyed by `(provider, provider_event_id)`. A duplicate insert returns 200 immediately and does no work, which is how replay protection and at-least-once delivery are handled. Processing happens in an Inngest function, not in the webhook handler, so the provider always gets a fast 200.

- **Razorpay** is the source of truth for gateway Payments. The browser redirect never marks anything paid.
- **WhatsApp Cloud API** delivers status callbacks (sent, delivered, read, failed) into `message_log`, and inbound messages that drive the plain-text approval branch and the screenshot Payment branch.
- **Resend** delivers email status into `message_log`.

## 8. Files and PDFs
Deliverable files go to Supabase Storage in a private bucket, path `workspace_id/client_id/deliverable_id/version/filename`. Client access is a short-lived signed URL minted only after Magic link verification. Invoice PDFs and timeline PDFs are server-rendered with react-pdf. The Invoice PDF is rendered once at issue and stored, because a GST Invoice must not change after it is issued. The timeline PDF is rendered on demand from the event log.

## 9. Configuration
Environment variables, all server-side unless prefixed `NEXT_PUBLIC_`:
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MAGIC_LINK_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `RESEND_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`.
Razorpay keys are per Workspace and stored encrypted in the database, not in the environment. The environment holds only the platform-level webhook secret.

## 10. Failure posture
- An integration being down never blocks a state transition. The transition commits, the send is queued and retried, and the Agency sees the delivery status on the Messages view.
- WhatsApp failure always degrades to email, per flow E1.
- If Meta approval has not landed at launch, the WhatsApp adapter is disabled by a Workspace flag and everything runs email-only. This is an accepted launch state, not an outage.
- Razorpay not connected means the Invoice still issues with bank details only.

## 11. Observability
Sentry for exceptions with `workspace_id` as a tag and no PII in the payload. PostHog for the loop funnel: `deliverable_sent → viewed → approved → invoice_issued → paid`, plus time-in-stage. The in-app Messages view is a product feature, not a debug tool, because WhatsApp template failures are expected to be the top support issue. Structured logs carry `workspace_id`, `request_id`, and entity ids, never phone numbers, emails, GSTINs, or tokens.
