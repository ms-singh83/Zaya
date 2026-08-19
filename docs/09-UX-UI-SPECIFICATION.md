# 09 — UX and UI Specification

Source: CLAUDE.md §4 and §5a, docs/planning/05-MVP-PRD.md. Two surfaces: **Agency app** (authenticated, responsive, desktop-primary) and **Client Magic link pages** (zero login, mobile-first).

Feel: premium, trustworthy, financial. Not playful, not startup-loud. No saffron and green brand palette.

---

## 1. Design system

### 1.1 Colour, light theme
| Token | Value | Use |
|---|---|---|
| `--primary` | `#4F46E5` | primary actions, active nav, focus ring |
| `--primary-hover` | `#4338CA` | hover and pressed |
| `--success` | `#10B981` | paid, approved, positive deltas |
| `--bg` | `#F8FAFC` | app background |
| `--surface` | `#FFFFFF` | cards, sheets, tables |
| `--text` | `#0F172A` | primary text |
| `--muted` | `#64748B` | secondary text, labels, timestamps |
| `--border` | `#E2E8F0` | dividers, card and input borders |

### 1.2 Colour, dark theme
| Token | Value |
|---|---|
| `--primary` | `#6366F1` |
| `--success` | `#34D399` |
| `--bg` | `#0B1120` |
| `--surface` | `#111827` |
| `--elevated` | `#1E293B` |
| `--text` | `#F8FAFC` |
| `--muted` | `#94A3B8` |
| `--border` | `#334155` |

### 1.3 Semantic tokens (the only names components may use)
Components never reference a hex value or a raw Tailwind colour. Tailwind theme extension maps these to CSS variables, defined on `:root` for light and `[data-theme="dark"]` plus `@media (prefers-color-scheme: dark)` for dark.

`--primary`, `--primary-hover`, `--primary-fg`, `--bg`, `--surface`, `--elevated`, `--text`, `--muted`, `--border`, `--focus`, and the status set: `--status-approved`, `--status-pending`, `--status-overdue`, `--status-paid`, `--status-neutral`.

Status mapping: approved and paid use `--success`. Pending and awaiting-approval use amber `#F59E0B` (light) / `#FBBF24` (dark). Overdue uses red `#DC2626` (light) / `#F87171` (dark). Neutral uses `--muted`. Amber and red are the only additions to the two given palettes, and exist because a receivables Pipeline is unreadable without an overdue signal.

### 1.4 Type, spacing, radius, elevation
- Font: Inter (system fallback: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`). Tabular numerals on every money figure and every count: `font-variant-numeric: tabular-nums`.
- Scale: display 30/36 semibold, h1 24/32 semibold, h2 20/28 semibold, h3 16/24 semibold, body 14/20, small 13/18, caption 12/16 in `--muted`.
- Spacing: 4px base, steps 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: 8px inputs and buttons, 12px cards, 16px sheets and modals. Full round only on avatars and status dots.
- Elevation: flat by default. One shadow for raised cards (`0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.10)`), one for overlays. Dark theme uses `--elevated` instead of shadows.
- Motion: 150ms ease-out for hover and focus, 200ms for sheets. Respect `prefers-reduced-motion`.

### 1.5 Money, dates, numbers
- Money is always INR with the ₹ symbol and Indian digit grouping: ₹75,000, ₹1,25,000, ₹73,500. Never abbreviate to 75k in a financial figure. Stored in paise as integers, formatted at the edge only.
- Dates in IST, format `18 Aug 2026`, with time as `18 Aug 2026, 4:12 PM` wherever the timestamp is evidence. Relative time ("2 days ago") is allowed only next to an absolute date, never instead of it.
- Days elapsed and aging buckets are whole days, computed in IST.

### 1.6 Components (shadcn/ui base)
Button (primary, secondary, ghost, destructive), Input, Textarea, Select, Combobox, Checkbox, Switch, Badge (status), Card, Table, Tabs, Dialog, Sheet, DropdownMenu, Toast, Tooltip, Avatar, Progress, Skeleton, EmptyState, FileDropzone, Stepper, Timeline, CopyField, MoneyInput (paise-safe), GstinInput (format-validated), PhoneInput (E.164, India default).

### 1.7 States every screen must define
Loading (skeleton, never a spinner on a full page), empty (one line of what this is plus one primary action), error (plain sentence plus retry, never a raw error code to the Client), and disabled-with-reason (a Send button disabled for missing GST details says so on hover and on tap).

### 1.8 Accessibility
WCAG AA contrast on both themes. Visible focus ring using `--focus` at 2px offset. Full keyboard operation of the Agency app. Touch targets 44px minimum on Client pages. Status is never colour-only, always colour plus a word. Every input has a real label, never placeholder-as-label.

### 1.9 Copy rules (binding on all UI text, email, WhatsApp templates, and PDFs)
Plain first-person English. Commas, not em-dashes. INR everywhere. No fabricated statistics. Never the words "portal" or "OS". Never state or imply that approval delay causes late payment. Sentence case for buttons and headings. Errors say what happened and what to do next. Reminder copy is firm at most, never threatening, and never implies the Client is dishonest.

---

## 2. Agency surface

### 2.1 Shell
Left sidebar (collapsible under 1024px): Pipeline, Clients, Deliverables, Invoices, Payments, Messages, Settings. Top bar: Workspace name and logo, search, theme toggle, account menu. Onboarding checklist chip persists in the top bar until setup is complete. Desktop-primary at 1280px, fully usable at 768px, and readable on a phone.

### 2.2 Pipeline dashboard (the home screen, Persona A)
This screen is the product. It answers one question: where is my money stuck.

**Row 1, four Pipeline cards.** Each shows an INR total and a count, and each is a filter link.
| Card | Definition |
|---|---|
| Approval pending | Sum of amount-to-invoice on Deliverables in `sent`, `viewed`, or `changes_requested` |
| Invoiced | Sum of unpaid balance on Invoices in `issued`, not past due |
| Overdue | Sum of unpaid balance on Invoices past their due date |
| Paid | Sum of confirmed Payments in the current financial year |

**Row 2, two lists side by side on desktop, stacked on mobile.** They are separate because approval-stuck money and payment-stuck money need different actions.
- **Waiting on approval:** Client, Deliverable title, Version, amount, days elapsed since sent, viewed state ("Viewed 2 days ago" or "Not opened yet", the second in `--muted`). Sorted by days elapsed descending. Row actions: nudge, open.
- **Waiting on payment:** Client, Invoice number, amount outstanding, days since issue, aging badge (0 to 30 neutral, 31 to 60 amber, 61 to 90 amber, 90-plus red), Reminders sent count, paused indicator. Sorted by days outstanding descending. Row actions: record Payment, pause or resume Reminders, resend.

Empty state before the first Deliverable: the onboarding checklist takes the whole area.

### 2.3 Other Agency screens
- **Clients:** list plus detail. Detail shows Contacts (max 3), GSTIN, place of supply, Projects, open Deliverables, Invoices, Payment history, and Magic link management (revoke and re-mint).
- **Deliverable detail:** current Version, all Versions, files, the Client-facing preview link, the append-only Timeline component, and Export timeline PDF.
- **Invoice detail:** PDF preview, line items with HSN/SAC and tax split, Payments applied with TDS shown, balance, Reminder schedule with sent and upcoming tiers, pause toggle, cancel Invoice.
- **Record Payment sheet:** date, gross settled, TDS, net received (auto-computed, editable), method, UTR or reference, evidence upload. Live line: "Invoice balance after this payment: ₹0".
- **Messages (message-delivery view):** every WhatsApp and email send with Client, Contact, channel, template name, status, error code, and the email fallback link. Required, because WhatsApp template failures are expected to be the top support issue.
- **Settings:** business and GST, branding, payment setup (Razorpay and bank), notification defaults, auto-invoice buffer, Reminder tier copy preview.

---

## 3. Client surface (Magic link pages)

### 3.1 Non-negotiables
No login, no signup, no password, no account, no cross-Client navigation, no Agency data beyond this Client's own item. Nowhere on any Client page is there a "create an account", "sign in", or "download the app" affordance. Branded with the Agency's logo and brand colour, with a small "Sent with Zaya" line as the only Zaya presence.

### 3.2 Performance budget (measured on a mid-range Android over 4G, inside the WhatsApp in-app browser)
Server-rendered, first contentful paint under 1.5s, largest contentful paint under 2.5s, total JS under 100KB gzipped on the Deliverable and Invoice pages, no client-side data fetching before first paint. Images lazy-loaded with explicit dimensions. Fonts self-hosted with `font-display: swap`, system fallback acceptable. Works with the back button and with a bookmark.

### 3.3 Deliverable page (Persona B)
Single column, 16px gutters. Order: Agency logo, "From <Agency name>", Deliverable title, Version chip ("Version 3"), Agency note, files (thumbnail or filename with size and a download or open action) or the external link, then a sticky bottom bar with **Approve** (primary, full width) and **Request changes** (secondary).
- Approve: tap, confirmation sheet naming the Deliverable and Version, confirm. Two taps total (acceptance criterion 2, under 60 seconds).
- Request changes: tap, textarea (required, 1000 chars), send.
- After Approval: receipt state showing "Approved on 18 Aug 2026, 4:12 PM by Priya" and, once the Invoice exists, a Pay button.
- Already approved by another Contact (edge E2): receipt state, no Approve button.
- After Request changes: "The Agency has been told, you will get the next version here" and the same link keeps working.

### 3.4 Invoice page (Personas B and C on one page)
Order: Agency logo, Invoice number, issue date and due date, amount due in large tabular figures, line items with HSN/SAC, tax split rows (CGST and SGST, or IGST), total, then two payment blocks that are equally prominent because Persona C will never tap Pay:
- **Pay now:** one primary button to the Razorpay link. Two taps maximum to checkout.
- **Or transfer to our bank:** account name, account number, IFSC, branch, and "quote invoice number <n>", each with a copy button.
Plus: Download PDF, and the approval reference line "Approved on 18 Aug 2026, Version 3".
Paid state: green banner "Paid on 20 Aug 2026", receipt download, Pay button gone.
Provisional Payment state: "We have your payment details and are confirming them". The Pay button stays visible, because a provisional Payment has not settled the Invoice.

### 3.5 Client-side error and expiry states
Expired or revoked link (edge E7): Agency branding, one plain sentence, and a "request a new link" button. No error code, no login prompt. Any other failure shows the same shape: one sentence plus one action.

---

## 4. Notification surfaces
WhatsApp templates and emails follow §1.9 and reuse the Agency's branding. Every WhatsApp send has an email equivalent. Email subject lines name the Client-visible object first: "Your invoice INV/2026-27/0012 from <Agency>", using the Workspace's configured Invoice prefix. Reminder emails and messages cite the approval date, and never claim a consequence.
