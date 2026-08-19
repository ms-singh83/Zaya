# Zaya

India-first Work → Cash platform for small agencies. The moment a Client approves a
Deliverable, the GST Invoice sends itself with a payment link, and Reminders escalate
until the money lands.

## Read first
- `CLAUDE.md` — the hard rules. Read completely before changing anything.
- `docs/planning/05-MVP-PRD.md` — the canonical MVP spec.
- `docs/07-EXECUTION-PLAN.md` — the milestone ladder and current position.
- `agents/ORCHESTRATOR.md` — how work is coordinated and reviewed.

## Getting started
```bash
npm install
cp .env.example .env.local   # fill in, never commit
npm run dev
```

## Scripts
| Command | Does |
|---|---|
| `npm run dev` | local dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm test` | Vitest unit suite |
| `npm run test:coverage` | unit suite with the 95% `lib/domain` gate |
| `npm run e2e` | Playwright |
| `npm run build` | production build |

## Layout
```
app/                Next.js App Router. (agency) authenticated, /v/* Client Magic link surface.
lib/domain/         Pure business rules. No I/O, no database, no integrations. Unit-tested first.
lib/utils/          Small shared helpers.
docs/               Source of truth. Implementation follows these, not the other way round.
agents/             Agent responsibilities and review gates.
e2e/                Playwright. *.agency.spec.ts and *.client.spec.ts run in separate projects.
```

## Two rules worth repeating
1. **The Client never gets a login.** Magic links only. Any login, signup, password, or
   account on the Client surface is rejected in review.
2. **Money is integer paise.** Tax rates are basis points. No floats in a financial path.
