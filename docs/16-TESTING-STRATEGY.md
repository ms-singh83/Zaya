# 16 — Testing Strategy

Source: CLAUDE.md §4, docs/planning/05-MVP-PRD.md acceptance criteria. Vitest for units and integration, Playwright for E2E.

## 1. What we test and why
Two things can never break, because both silently lose the Agency money or trust:
1. The Client Magic link view to Approve flow.
2. The Razorpay webhook to paid flow.
Everything else is ranked below these two. Coverage targets are a means, not a goal: `lib/domain` requires 95% line coverage and is the one place where the number is enforced in CI.

## 2. Unit tests (Vitest, pure, no I/O) — write these first
`lib/domain` is written and tested before any UI exists.

### 2.1 GST engine
- Intrastate: Workspace state code equals the Client place of supply, so an 18% Invoice splits into CGST 9% plus SGST 9%, and IGST is zero.
- Interstate: different state codes, so IGST is 18% and CGST and SGST are zero.
- Rate table: 0%, 5%, 12%, 18%, 28% at line level.
- Rounding: tax is computed and rounded half-up per line in paise, then summed. A case with three lines proves the per-line sum does not equal a total-level computation, and the per-line result is the correct one.
- Paise integrity: no floats anywhere in the path, asserted on an amount that would lose precision in float (₹1,00,000.005 style inputs are rejected at validation, not silently rounded).
- Place of supply falls back correctly when the Client has no GSTIN.
- 422 when the Workspace has no GSTIN or no state code.

### 2.2 Invoice numbering
- Sequential and gapless within `(workspace_id, fy_label)`.
- Financial year boundary: 31 March 2027 issues in `2026-27`, 1 April 2027 issues in `2027-28` and restarts at 1.
- Two Workspaces have independent series.
- Concurrency: two simultaneous allocations under the row lock produce N and N+1, never a duplicate and never a gap.
- A cancelled Invoice retires its number. The next Invoice takes the following number, and the series is never renumbered.

### 2.3 TDS and settlement
- **Acceptance criterion 5 verbatim**: Invoice ₹75,000, Payment gross ₹75,000, TDS ₹1,500, net received ₹73,500, balance ₹0, Invoice `paid`.
- `net = gross - tds` by default, and an explicit override is flagged.
- Partial: gross ₹40,000 against a ₹75,000 Invoice leaves the Invoice `issued` with a ₹35,000 balance, and Reminders keep running (flow E3, V1.0 behaviour).
- A `provisional` Payment never changes `amount_settled_paise` and never marks an Invoice paid.
- Overpayment is rejected at validation with a clear error, not silently absorbed.
- Multiple Payments sum correctly, and only `confirmed` rows count.

### 2.4 State machine
- Every legal transition in `draft → sent → viewed → changes_requested → approved → invoiced` succeeds and writes exactly one event.
- Every illegal transition is rejected: approving a `draft`, sending an `approved`, re-approving an `approved` (409 returning the existing Approval, per flow E2).
- A transition and its event are written in one transaction. A failure in either rolls back both.
- `deliverable_events` rejects UPDATE and DELETE at the database level.
- A new Version returns a `changes_requested` Deliverable to `sent` and does not reset the event history.

### 2.5 Reminder scheduling
- Tiers land on issue_date + 3, + 7, + 14 in IST.
- Payment cancels every unsent tier.
- Pause cancels scheduled tiers, resume reschedules only tiers whose date has not passed, and a tier whose date passed while paused is `skipped` with reason `date_passed_while_paused`, never fired late.
- `(invoice_id, tier)` uniqueness makes a duplicate job run a no-op.

### 2.6 Magic link
- Verify accepts a valid token, and rejects expired, revoked, wrong-scope, wrong-resource, and tampered tokens.
- The raw token is never persisted, and the stored value is a SHA-256 hash.
- Comparison is constant-time.

## 3. Integration tests (Vitest against a local Supabase)
- **Cross-tenant RLS, per tenant table**: as Workspace A, reading a Workspace B row returns zero rows, and writing a Workspace B row is denied. This test exists for every table before the table is used by a feature.
- The `anon` role can read nothing on any table.
- Public routes with a Workspace A token cannot reach a Workspace B resource, and get 404 rather than 403.
- Webhook idempotency: the same `(provider, provider_event_id)` posted twice creates exactly one Payment.
- Webhook signature: a bad signature returns 401 and writes nothing.
- Approval to Invoice job: one Invoice per Approval, and a replayed `deliverable.approved` event does not mint a second Invoice number.
- WhatsApp failure produces an email fallback row in `message_log` linked by `fallback_of_id`, and the loop continues.
- Storage: a Client can only obtain a signed URL for a file under its own Magic link scope.

## 4. E2E tests (Playwright) — the two that can never break
**E2E-1, Client approval flow.** Agency signs in, sets up business and GST details, creates a Client with a Contact, creates and sends a Deliverable. The test extracts the Magic link from the outbound message log, opens it in a fresh context with no cookies and no storage state, on a mobile viewport, asserts the page shows the Agency branding and no login or signup affordance anywhere, taps Approve, confirms, and asserts the receipt. Back in the Agency app, the Deliverable is `approved`, the event log shows the Approval with a timestamp and a Version, and an Invoice is generated with the correct GST split.

**E2E-2, Payment webhook flow.** From an issued Invoice, post a signed Razorpay `payment_link.paid` webhook, assert the Invoice becomes `paid`, the remaining Reminders are cancelled, both notifications are queued, and the Pipeline totals move from invoiced to paid. Post the identical webhook again and assert nothing changes and no second Payment is created.

**Additional E2E, non-blocking for the two above but required for V1.0 exit:**
- Signup to first Deliverable sent in under 10 minutes of wall-clock steps, no dead ends (acceptance criterion 1).
- Manual bank plus TDS Payment recording reconciling the ₹75,000 / ₹73,500 / ₹1,500 case through the UI (acceptance criterion 5).
- Reminder pause and resume honoured (acceptance criterion 6).
- Timeline PDF export downloads and contains sent, viewed, approved, reminded, and paid rows with timestamps (acceptance criterion 7).
- Expired Magic link shows the plain expiry page with no login prompt (flow E7).

## 5. Performance and channel checks
- Client Deliverable and Invoice pages: Lighthouse mobile run in CI with a throttled 4G profile, asserting first contentful paint under 1.5s, largest contentful paint under 2.5s, and total JS under 100KB gzipped (docs/09-UX-UI-SPECIFICATION.md §3.2). Acceptance criterion 2 is verified as a timed Playwright run on a mobile viewport plus this budget, and confirmed once on a real mid-range Android before V1.0 exit.
- Webhook to notification latency under 1 minute, asserted as an integration timing test (acceptance criterion 4).

## 6. Acceptance criteria to test map (V1.0 exit gate)
| # | Acceptance criterion | Verified by |
|---|---|---|
| 1 | Signup to first Deliverable sent in under 10 minutes | E2E onboarding test plus one recorded walkthrough |
| 2 | Client view to Approve in under 60 seconds, zero account | E2E-1 timed on a mobile viewport, Lighthouse budget, one real-device run |
| 3 | Approval fires the Invoice and payment ask automatically | Integration test on the Approval job, plus E2E-1 |
| 4 | Razorpay webhook flips to paid and notifies both sides in under 1 minute | E2E-2 plus the latency test in §5 |
| 5 | Manual bank plus TDS entry reconciles: ₹75,000 / ₹73,500 / ₹1,500 | Unit test §2.3 plus the UI E2E in §4 |
| 6 | Reminder ladder fires on schedule, stops on Payment, honours pause | Unit tests §2.5 plus the pause E2E |
| 7 | Timeline PDF shows sent, viewed, approved, reminded, paid with timestamps | PDF export E2E with content assertions |
| 8 | Playwright E2E green on the Client approval and Payment webhook flows | E2E-1 and E2E-2 green in CI |

## 7. Test data and environments
- Fixtures build a full Workspace in one call: Workspace with GST details, Client with 3 Contacts, Project, Deliverable, issued Invoice. Two Workspaces are always seeded so every test can assert isolation cheaply.
- Razorpay, WhatsApp Cloud API, and Resend are mocked at the adapter boundary in unit and integration tests, and stubbed with signed fixture payloads in E2E. No test ever calls a live provider.
- Time is injected, never read from the system clock in `lib/domain`, so financial year boundaries and Reminder dates are deterministic. IST is the presentation timezone in every date assertion.
- E2E runs against a preview deploy with a seeded Supabase branch.

## 8. CI gates (a pull request cannot merge without all of these)
lint, typecheck, unit, integration, Playwright E2E-1 and E2E-2, the RLS test suite, `lib/domain` coverage at 95%, the migration RLS check, and secret scanning. A red pipeline is never merged past, and a skipped test needs an ORCHESTRATOR-approved note in the milestone report.
