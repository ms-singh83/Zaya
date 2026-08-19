# 17 — Deployment

Source: CLAUDE.md §4 and §5a.

## 1. Environments
| Environment | Where | Database | Purpose |
|---|---|---|---|
| Local | `next dev` | Supabase local via CLI | development |
| Preview | Vercel preview per pull request | Supabase branch, seeded | review and E2E |
| Production | Vercel production, `main` | Supabase production project | the real thing |

Regions: Vercel functions and the Supabase project are placed closest to India (Mumbai / ap-south-1) where the plan allows, because both surfaces are India-only and the Client surface has a hard mobile latency budget.

## 2. Hosting
- **Vercel** hosts the Next.js app, the API routes, the webhook endpoints, and the Inngest handler. `main` deploys to production, every pull request gets a preview URL.
- **Supabase** provides Postgres, Auth, and Storage. Point-in-time recovery is on for production from day one, because this database holds an Agency's receivables.
- **Inngest** connects to `/api/inngest` and holds the signing key per environment. Preview environments use a separate Inngest environment so a preview job can never message a real Client.

## 3. Secrets and configuration
Managed in Vercel per environment, never in the repository. Full variable list in docs/10-ARCHITECTURE.md §9.
- Preview and production have **different** Razorpay, WhatsApp, and Resend credentials. Preview uses Razorpay test mode and a WhatsApp test number.
- A safety flag `ALLOW_OUTBOUND_MESSAGES` defaults to false in preview. Non-production sends are written to `message_log` and not dispatched, unless a developer explicitly opts in with an allowlisted test number. Nothing reaches a real Client from a preview.
- Rotation: rotate on any suspected exposure, on any team change, and on a schedule of 90 days for the WhatsApp access token. Rotate in Vercel, redeploy, then revoke at the provider, in that order, so there is no gap.

## 4. Database migrations
- Supabase CLI, forward-only, one migration per change, checked in under `supabase/migrations/`.
- An applied migration is never edited. A mistake is fixed by a new migration.
- CI applies all migrations to a scratch database on every pull request and fails on error.
- CI fails any migration that creates a table with a `workspace_id` column without `enable row level security`.
- Expand then contract for any breaking change: add the new column, backfill, deploy code that writes both, deploy code that reads the new one, then drop the old column in a later migration. Never in one step, because Vercel serves old and new instances briefly during a deploy.
- Production migrations run from CI on merge to `main`, before the application deploy is promoted.

## 5. CI (GitHub Actions)
Pipeline on every pull request, all jobs required:
1. `lint` — ESLint and Prettier check.
2. `typecheck` — `tsc --noEmit`, TypeScript strict.
3. `unit` — Vitest, with the 95% coverage gate on `lib/domain`.
4. `migrate` — apply migrations to a scratch database, plus the RLS presence check.
5. `integration` — Vitest against local Supabase, including the cross-tenant RLS suite.
6. `e2e` — Playwright E2E-1 (Client approval) and E2E-2 (Payment webhook) against the preview deploy.
7. `security` — `npm audit`, secret scanning.

On merge to `main`: run migrations, deploy to production, sync Inngest functions, create a Sentry release with source maps, and run a post-deploy smoke check.

## 6. Post-deploy smoke check
Automated, runs against production after every deploy, and rolls forward with an alert on failure:
- Health endpoint returns 200 and reports database connectivity.
- A synthetic Magic link on a seeded internal Workspace loads under the performance budget.
- Razorpay webhook endpoint returns 401 for an unsigned request, which proves signature verification is live.
- Inngest reports all functions registered.
No synthetic check ever sends a message to a real Client.

## 7. Rollback
- **Application**: promote the previous Vercel deployment. This is immediate and is the first move for any application-level failure.
- **Database**: forward-fix by default. Because migrations are expand then contract, an application rollback is safe against the newer schema. Point-in-time recovery is a last resort and is a founder decision, not an agent decision, because it loses Payments and Approvals recorded after the restore point.
- **Integrations**: kill switches per Workspace (`whatsapp_enabled`) and per environment (`ALLOW_OUTBOUND_MESSAGES`) let a broken channel be disabled without a deploy.

## 8. Launch runbook (V1.0)
Started in W1, because these have lead time and block P0.5 and payments testing:
1. Meta business verification and WhatsApp template submission for `deliverable_ready`, `approval_confirmed`, `invoice`, `reminder_gentle`, `reminder_firm`, `reminder_final`, `payment_received`. Founder action.
2. Razorpay KYC and live keys. Founder action.
3. Resend domain verification with SPF, DKIM, and DMARC records. Email is the guaranteed channel, so this is not optional.
4. Production Supabase project, PITR on, backups verified by an actual restore test.
5. Sentry and PostHog projects, with PII scrubbing verified by a test.
6. Custom domain, HTTPS, HSTS, and `robots.txt` disallowing `/v/*`.
7. Razorpay and Meta webhook URLs registered against production and verified by a signed test event.
8. If WhatsApp approval has not landed, set `whatsapp_enabled = false` for all Workspaces and launch email-only. This is an accepted launch state, planned for, not an incident.

## 9. Monitoring and alerting
Sentry alerts on a new issue in a payments, webhook, or Magic link path, routed to the founder. Inngest alerts on a function failing all retries. A daily digest reports WhatsApp template failure rate, email bounce rate, webhook rejection count, and Invoices stuck in `draft`. Uptime checks on the health endpoint and on one Client Magic link page, because the Client surface failing is invisible to the Agency until a Client complains.
