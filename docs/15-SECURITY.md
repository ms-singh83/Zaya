# 15 — Security

Source: CLAUDE.md §3 and §5a. SECURITY review is mandatory and blocking for: auth, tenancy and RLS, payments, webhooks, and Magic links.

## 1. Threat model in one paragraph
Zaya holds two things worth stealing: an Agency's receivables data, and Magic link tokens that let a stranger act as a Client. Everything below exists to keep Workspaces apart, to keep tokens narrow and short-lived, and to make sure money only moves state on a verified provider signature. Card data never touches Zaya, PCI stays with Razorpay.

## 2. Authentication and tenancy
- **Agency**: Supabase Auth, email or Google. Sessions in httpOnly, secure, sameSite=lax cookies. `workspace_id` is always derived from the session and is never accepted from a request body or query string.
- **Client**: no authentication and no account, ever. Magic links only. Any pull request that adds a login form, a signup route, a password field, or a session cookie to the Client surface is CHANGES REQUIRED, no exceptions, regardless of how convenient it is.
- **RLS is the enforcement boundary, not the application.** Every tenant table has RLS enabled with the policy shape in docs/12-DATABASE.md §3. A table with a `workspace_id` column and no `enable row level security` fails CI.
- **Service role key**: server-only, never in a `NEXT_PUBLIC_` variable, never in a Server Component that renders to the browser, and used only inside `lib/services/public/*` and Inngest functions. Every service-role query filters explicitly by `workspace_id` even though RLS is bypassed, so a bug in one layer is not a cross-tenant leak.
- **Cross-tenant tests are mandatory.** For every tenant table, an automated test signs in as Workspace A and asserts zero rows and a denied write for a Workspace B row. A new tenant table without this test does not merge.

## 3. Magic link tokens
| Rule | Value |
|---|---|
| Generation | 32 bytes from a CSPRNG, base64url encoded |
| Storage | SHA-256 hash only. The raw token is never written to the database, logs, Sentry, PostHog, or `message_log.body_preview` |
| Scope | Exactly one Workspace, one Client, one scope (`deliverable`, `invoice`, or `client`) and one `resource_id`. There is no all-access token |
| Expiry | 30 days by default, refreshed on resend of the same resource so a bookmark keeps working |
| Revocation | Per token and per Client, from the Agency app. Revoked tokens fail closed immediately |
| Verification | Constant-time hash comparison, then expiry, then revocation, then scope match against the requested resource |
| Failure response | 404 with no detail, so a token cannot be used to discover whether a resource exists |
| Transport | HTTPS only, token in the URL path, never in a query string, so it stays out of referrer headers and third-party analytics |
| Referrer | `Referrer-Policy: no-referrer` on all Client pages |
| Indexing | `X-Robots-Tag: noindex, nofollow` and a `robots.txt` disallow on `/v/*` |
| Audit | Every use updates `last_used_at` and `use_count`. Mint, use, and revoke are events |

A Magic link is a bearer credential. Anyone holding it can approve and can see one Client's own item, and nothing else. That is the accepted design, and it is why the scope is one resource and the blast radius is one Client.

## 4. Rate limiting
Applied at the edge, keyed as listed, sliding window, returning 429 with `Retry-After`.
| Surface | Limit |
|---|---|
| Magic link verification failures | 20 per IP per 10 minutes, then an increasing backoff |
| `/api/v1/public/*` per token | 60 per minute |
| Approve and request-changes per token | 10 per hour |
| `/link/request-new` per token | 3 per day |
| Agency auth attempts | 10 per email per 15 minutes |
| Nudge and resend per Contact | 1 per 6 hours |
| Webhook endpoints | not rate limited by IP, protected by signature verification instead, so a provider retry storm is never dropped |

## 5. Webhooks
1. Read the **raw** body before any JSON parsing. Signature verification on a re-serialised body is a defect.
2. Verify the signature. Razorpay: HMAC SHA-256 with the Workspace webhook secret. WhatsApp: `X-Hub-Signature-256` against the Meta app secret. Resend: Svix signature. Failure returns 401 with no body.
3. Replay protection: insert into `webhook_events` unique on `(provider, provider_event_id)`. A duplicate returns 200 and does no work. Reject events with a timestamp older than 5 minutes where the provider supplies one.
4. Never trust amounts or status from the browser redirect. Razorpay's webhook is the only thing that marks a gateway Payment confirmed.
5. Process asynchronously through Inngest so the provider gets a fast 200 and retries stay safe.
6. Webhook URLs are unguessable but that is not a control. The signature is the control.

## 6. Payments
- Razorpay key secrets and webhook secrets are stored encrypted at rest, are write-only over the API, and are never returned in any response.
- Zaya never sees or stores card numbers, CVVs, or UPI PINs. Checkout is hosted by Razorpay. PCI scope stays with Razorpay.
- Manual Payment entry is Agency-only and is fully attributed (`recorded_by`, `confirmed_by`).
- A provisional Payment can never settle an Invoice on its own. Only a `confirmed` Payment counts.
- Invoice numbering is allocated under a row lock so two concurrent Approvals cannot produce a duplicate or a gap in a legally sequential series.

## 7. Files
Private Storage buckets with no public read. Client access is a signed URL of at most 15 minutes, minted only after Magic link verification. Uploads are limited by MIME type and size, filenames are sanitised, and the storage path always begins with the `workspace_id`. Uploaded files are served with `Content-Disposition: attachment` and a restrictive `Content-Security-Policy` so a stored HTML or SVG file cannot execute in the Zaya origin.

## 8. Application hardening
CSP with no `unsafe-inline` script, `frame-ancestors 'none'` (Razorpay checkout opens in its own context, Zaya is never framed), HSTS, `X-Content-Type-Options: nosniff`. Server Actions and mutating routes are CSRF-protected by sameSite cookies plus origin checks. All input is validated by Zod at the boundary, and validation is server-side even where the client also validates. GSTIN, IFSC, and E.164 phone formats are checked on the server. Dependencies are pinned, `npm audit` runs in CI, and Dependabot is on.

## 9. DPDP posture
- **Minimal Client PII**: name, WhatsApp number, email, optional GSTIN and billing address. Nothing else is collected about a Client, and Zaya never asks a Client for anything on the Magic link surface.
- **Purpose**: the data is used only to deliver and get paid for the Agency's work. No profiling, no resale, no cross-Workspace analytics on Client identity.
- **The Agency is the data fiduciary for its Clients' data, Zaya is the processor.** Terms must say so.
- **Deletion path**: deleting a Client cascades its Contacts, Deliverables, Versions, files, and tokens. Invoices and Payments are retained because Indian tax law requires it, with Client identity fields retained on the issued Invoice snapshot only. A documented, executable deletion request path exists from day one, not after launch.
- **No PII in logs**: logs, Sentry, and PostHog carry ids only. Never a phone number, an email, a GSTIN, a full Magic link, or a token. Sentry `beforeSend` scrubs these, and a test asserts it.
- **Data location**: Supabase and Vercel regions are chosen closest to India (Mumbai / ap-south-1) where the plan allows, recorded in docs/17-DEPLOYMENT.md.
- **Retention**: `webhook_events` payloads and `message_log.payload` are pruned after 90 days.

## 10. Secrets
No secret in the repository, ever. Local development uses `.env.local`, which is gitignored. Vercel holds environment secrets per environment. Rotation procedure is documented in docs/17-DEPLOYMENT.md. A committed secret is treated as compromised and rotated, not deleted from history and forgotten. Secret scanning runs in CI.

## 11. SECURITY review checklist (blocking, per pull request that touches these areas)
- [ ] New tenant table has RLS enabled, policies present, and a cross-tenant read and write test.
- [ ] No `workspace_id` accepted from user input anywhere.
- [ ] Service role client used only in the confined service layer, and every query filters by `workspace_id`.
- [ ] No new authentication surface on the Client side. No login, signup, password, or session on `/v/*` or `/api/v1/public/*`.
- [ ] Magic link scope checked against the requested resource, failures return 404.
- [ ] Tokens hashed, never logged, never in a query string, never in `message_log.body_preview`.
- [ ] Webhook signature verified on the raw body, before parsing.
- [ ] Webhook idempotent on `(provider, provider_event_id)`.
- [ ] Payment state changes only from a verified webhook or an attributed Agency action.
- [ ] Invoice number allocation is under a row lock.
- [ ] Rate limits present on every new public endpoint.
- [ ] No PII in logs, Sentry, or PostHog. No secret in the diff.
