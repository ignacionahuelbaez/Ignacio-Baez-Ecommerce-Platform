# Customizing a client instance

This project is the company's core platform, not a per-client fork. Every client store
is a deployment of this same codebase, configured differently — not a copy that
diverges from it. This doc draws the line between what a new client should change via
**configuration** and what genuinely requires touching **code**, so that line stays
clear as more clients are onboarded.

## 1. Configuration (safe to change per client, no code review of business logic needed)

Everything here lives in `apps/web/config/branding.ts` and is validated at build/start
time by a Zod schema in that same file — an invalid value fails immediately with a
clear error instead of silently breaking a page at runtime.

| Section | Controls |
|---|---|
| `store` | Name, tagline, description, logo text/abbreviation/URL |
| `contact` | Support email, phone, address |
| `locale` | Language, currency code |
| `shipping` | Fees, free-shipping threshold, delivery time copy |
| `policies` | Return window, refund timing copy |
| `social` | Facebook/Twitter/Instagram links (rendered in the footer) |
| `features` | Toggle newsletter/reviews/wishlist/dark mode |
| `theme` | Primary color (light/dark) |

Environment variables (`apps/server/.env`, `apps/web/.env`) also count as configuration:
secrets, database connection, CORS origin, payment gateway credentials, seed
admin/customer identity. See `apps/server/.env.example` and
`provisioning_runbook.md` for the full list.

`pnpm setup:client` runs an interactive wizard over these same fields — use it instead
of hand-editing `branding.ts` when onboarding a new client, so nothing is missed.

## 2. Code changes (touches the shared core — needs review, affects every future client)

Anything not covered by the table above is code:

- New pages, new checkout steps, new admin capabilities
- Changing business rules (tax calculation, discount logic, shipping cost formula)
- A different payment gateway or a second one alongside Mercado Pago
- New Prisma models/migrations
- Anything in `packages/design-system` or `packages/sdk` — these are shared by every
  client instance; a change here ships to all of them the next time they update.

## 3. The grey area: per-client visual/behavioral tweaks that aren't full features

This is deliberately **not yet solved with a generic plugin/override system** — see the
roadmap's reasoning for why building that now, before a second real customization
request exists to learn from, would be guessing at the wrong abstraction. Until then:

- A client asking for a different **home page layout** or a different **checkout step
  order** is the kind of request that should turn into a real, tracked extension point
  (e.g. a component-swap slot) the next time it comes up — not a silent fork of
  `apps/web`.
- If you find yourself editing a shared component (`packages/design-system`,
  `apps/web/app/modules/*`) to special-case one client, stop and either (a) make it
  config-driven via `branding.ts` if it's genuinely cosmetic, or (b) flag it for a
  proper extension point instead of an `if (client === 'x')` branch.

## Related

- `provisioning_runbook.md` — steps to stand up a new client instance
- `authentication.md` — auth/RBAC implementation (shared code, not configuration)
- `database_schema.md` — Prisma models (shared code, not configuration)
