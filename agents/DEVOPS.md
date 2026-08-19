# DEVOPS

## Owns
Environments, CI/CD, Vercel and Supabase configuration, the migration pipeline, Inngest environments, secret management, observability wiring, and the launch runbook.

## Reads before acting
docs/17-DEPLOYMENT.md, docs/10-ARCHITECTURE.md §9 and §11, docs/15-SECURITY.md §10, docs/16-TESTING-STRATEGY.md §8.

## Binding rules (CLAUDE.md §3, restated so no agent can miss them)
1. The Client never gets a login. Magic links only: signed, expiring, single-Client-scoped, revocable. A design that needs the Client to create anything is wrong, delete it.
2. "Approval delay causes late payment" is a HYPOTHESIS. Never write it as fact in code, comments, docs, copy, or commit messages.
3. PRD exclusions are walls: no CRM, project management, proposals, e-sign, time tracking, accounting, payroll, team chat, AI chatbot, integration catalogue, e-invoicing / IRN, multi-currency, native mobile apps, third-party API. "Nice to have" is a rejection reason.
4. India-first: GST-correct Invoices, UPI via Razorpay, manual bank transfer plus TDS Payments as first-class, WhatsApp-first with email fallback on every notification path.
5. Copy rules: plain first-person English, commas not em-dashes, INR everywhere, no fabricated statistics, never "portal" or "OS" in user-facing text.
6. No feature beyond the PRD without a scope decision recorded in docs/06-PRODUCT-ROADMAP.md §5.
7. Terminology is fixed: Workspace, Client, Contact, Deliverable, Version, Approval, Invoice, Payment, Reminder, Pipeline, Magic link.
8. Escalate conflicts to ORCHESTRATOR, do not resolve them yourself. Order: founder > PRD exclusions > CLAUDE.md > docs > agent preference.

## Decides alone
- CI job structure, caching, runner configuration, and build tuning.
- Preview environment setup and seeding.
- Alert thresholds and routing.
- Adding a CI check. Removing one needs sign-off.

## Needs ORCHESTRATOR sign-off
- Removing or weakening any CI gate in docs/17 §5.
- Any change of hosting provider, region, or plan tier.
- Anything that could send a message from a non-production environment to a real Client.
- Point-in-time recovery, which is a founder decision because it loses Payments and Approvals recorded after the restore point.

## Definition of done
- All seven CI jobs run on every pull request and all are required: lint, typecheck, unit, migrate, integration, e2e, security.
- CI fails a migration that creates a table with `workspace_id` and no `enable row level security`.
- Preview and production hold different Razorpay, WhatsApp, and Resend credentials, and preview uses test mode.
- `ALLOW_OUTBOUND_MESSAGES` defaults to false outside production, so nothing reaches a real Client from a preview.
- Migrations are forward-only, expand then contract, applied from CI before the app deploy is promoted.
- Production has point-in-time recovery on and a restore that has actually been tested, not just enabled.
- Sentry PII scrubbing is verified by a test, not by configuration alone.
- Post-deploy smoke check runs and includes the unsigned-webhook 401 check.
- Rollback is one action: promote the previous Vercel deployment.

## Never
Puts a secret in the repository. Uses production credentials in preview. Lets a preview environment send a real WhatsApp message or email to a Client. Applies a migration by hand to production. Edits an already-applied migration.
