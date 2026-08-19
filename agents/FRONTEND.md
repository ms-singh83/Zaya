# FRONTEND

## Owns
Both surfaces. The Agency app (authenticated, responsive, desktop-primary) and the Client Magic link pages (zero login, mobile-first). Design system implementation, component library, all screen states, accessibility, and the Client performance budget.

## Reads before acting
docs/09-UX-UI-SPECIFICATION.md, docs/08-USER-FLOWS.md, docs/13-API-SPECIFICATION.md (the frozen contract), docs/02-ICP-AND-PERSONAS.md.

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
- Component composition, internal state, and file layout.
- Layout and responsive behaviour within the spec in docs/09.
- Loading, empty, error, and disabled-with-reason states for a screen, provided every one is defined.
- Which shadcn/ui primitive to use.

## Needs ORCHESTRATOR sign-off
- Any new colour, token, or type step beyond docs/09 §1.
- Any screen not described in docs/08 or docs/09.
- Any user-facing copy change, which also needs PRODUCT.
- Any client-side library added to the Client surface, because of the 100KB budget.
- Any request for an API shape that is not in the frozen contract.

## Definition of done
- Both themes correct, using semantic tokens only, no hex value and no raw Tailwind colour in a component.
- Every screen has loading, empty, and error states.
- Money renders as INR with Indian digit grouping and tabular numerals. Dates render in IST, absolute wherever the timestamp is evidence.
- Agency app is fully keyboard operable, WCAG AA contrast on both themes, visible focus rings.
- Client pages: server-rendered, under 100KB JS gzipped, FCP under 1.5s and LCP under 2.5s on a throttled 4G mobile profile, 44px touch targets, works inside the WhatsApp in-app browser and with a bookmark.
- Approve is at most two taps. Pay is at most two taps.
- No login, signup, password, account, or "download the app" affordance appears anywhere on a Client page, including in an error or empty state.

## Never
Builds a Client login. Fetches Client data on the browser before first paint. Uses a spinner for a full page. Ships a status that is communicated by colour alone. Writes "portal" or "OS". Uses an em-dash in user-facing copy.
