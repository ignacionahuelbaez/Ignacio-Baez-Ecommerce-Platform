# Technical identity audit (relevamiento, not a rename)

This is a survey of every place the codebase still carries the identity of the
original open-source boilerplate this platform started from, done to inform a future
renaming pass — **nothing in this document has been renamed yet**. Per the roadmap,
renaming is intentionally sequenced after security/payments, and done incrementally
rather than all at once, to avoid an avoidable break during a period where getting
security and payments right matters more.

## What already has real identity vs. what's still the boilerplate's

- The GitHub remote is already `ecommerce-platform` (`git remote -v`), but the local
  directory, root `package.json` `name`, and every internal package still say
  `react-ecommerce` / `@react-shop/*`. This drift — repo renamed, code not yet — is
  itself worth resolving deliberately rather than letting it linger.
- `apps/web/config/branding.ts` already carries a **placeholder** brand ("Berzerk")
  that a real client's `pnpm setup:client` run would replace — this is expected and
  fine; it's a template default, not the platform's own identity.

## Inventory

### 1. Internal package names (`@react-shop/*`)

Declared in 3 `package.json` files:
- `apps/server/package.json` → `@react-shop/api`
- `packages/design-system/package.json` → `@react-shop/design-system`
- `packages/sdk/package.json` → `@react-shop/sdk`

Referenced via `@react-shop/...` imports in **64 source files** across `apps/` and
`packages/` — this is the highest-blast-radius rename in the codebase, since every one
of those import statements (plus each package's own internal path aliases in
`tsconfig.json` files) would need to change together.

### 2. "Berzerk" placeholder brand

- `apps/web/config/branding.ts` — the default `branding` export (store name, tagline,
  logo, contact email, theme color). Intentional placeholder; gets overwritten per
  client by `pnpm setup:client`. Low priority to touch — arguably fine to keep as an
  obviously-fake example brand rather than rename it to the company's own.
- `apps/storybook/stories/Layout/Logo.stories.tsx` — a Storybook story presumably using
  the same placeholder for the Logo component demo.

### 3. Repository / product name ("react-ecommerce" / "React Ecommerce")

- Root `package.json` `name: "react-ecommerce"` (drives the local folder name and any
  place a package manager prints the workspace root's name).
- `docker-compose.yml` → `container_name: react-ecommerce-db`.
- `apps/server/prisma/.env.example` (via `seed.ts` default) → `SEED_STORE_NAME="React
  Ecommerce Store"` fallback when a client's own `SEED_STORE_NAME` isn't set.
- Referenced as a product/project name across ~15+ markdown files, including the root
  `README.md`, `apps/docs/README.md` and `apps/docs/_summary.md` ("React Ecommerce
  Boilerplate"), `apps/APPS_ARCHITECTURE.md`, `apps/server/README.md`,
  `packages/sdk/README.md`, `packages/design-system/README.md`, `docs/FEATURES.md`,
  `docs/CONTRIBUTING.md`, `docs/QUICK_START.md`, and others. These are all
  documentation text, not code — the lowest-risk, lowest-priority group to update,
  since getting one wrong breaks nothing at runtime.

### 4. `apps/admin`

Not a naming issue, but adjacent: `apps/admin` contains only a `FEATURES.md` and no
actual application code, despite sitting alongside real apps in the monorepo. Worth a
decision (remove the empty placeholder, or note clearly what it's reserved for) the
next time the monorepo structure gets touched — otherwise a future reader will assume
it's a real, functioning app.

## Suggested renaming order (for when this is actually executed)

Lowest risk to highest, so an interruption partway through leaves the repo in a
coherent state rather than half-renamed:

1. Documentation text (`.md` files) — no functional impact, purely cosmetic.
2. `docker-compose.yml` container name + root `package.json` name — cosmetic, no
   consumers depend on these strings programmatically.
3. Seed default store name — one string, already overridden per client via
   `SEED_STORE_NAME`.
4. `@react-shop/*` package names — the real one: touches 3 `package.json` files, every
   `tsconfig.json` path alias, and 64 import sites. Do this in one dedicated pass with
   a full `pnpm install` + typecheck + build verification after, not incrementally
   file-by-file (a half-renamed package graph would be broken, not just ugly).
5. "Berzerk" placeholder brand — arguably never needs to change; it's doing its job as
   an obviously-fake example. Revisit only if it's ever confusing in practice.
