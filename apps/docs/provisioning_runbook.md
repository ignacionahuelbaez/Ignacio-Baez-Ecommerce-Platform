# Provisioning a new client instance (manual runbook)

This is a **manual, repeatable checklist** for standing up one client's instance of the
platform — not an automated pipeline. Automating this is deliberately deferred until
the same steps below have been done by hand a few times for real clients; scripting an
unproven process tends to automate the wrong thing. Follow this list in order; each
step names the file/command it touches.

Each client gets its **own** Postgres database and its own deployed copy of
`apps/server` + `apps/web` — never a shared database between clients (see the
architecture roadmap for why single-tenant-per-client is the current model).

## 1. Database

1. Provision a Postgres instance for this client (managed service in production; the
   root `docker-compose.yml` Postgres container for local development only).
2. Note the connection string and whether the provider requires TLS.

## 2. Server environment (`apps/server/.env`)

Copy `apps/server/.env.example` and fill in, per client:

| Variable | Notes |
|---|---|
| `SECRET` | Unique, long, random. Never reuse across clients. |
| `REFRESH_SECRET` | Unique, long, random, **different from `SECRET`**. |
| `REFRESH_EXPIRES_IN` | Default `7d` unless the client needs something else. |
| `CORS_ORIGIN` | This client's storefront URL(s), comma-separated. |
| `DATABASE_URL` | This client's Postgres connection string. |
| `DATABASE_SSL` | `false` for the local Docker Postgres; `true` for most managed Postgres in production. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `true` unless the provider uses a self-signed cert. |
| `MERCADOPAGO_ACCESS_TOKEN` | This client's Mercado Pago access token (TEST- credentials until they go live). |
| `MERCADOPAGO_CURRENCY` | Defaults to `ARS`. |
| `FRONTEND_URL` | This client's storefront URL — used to build Mercado Pago's return URLs. |
| `API_BASE_URL` | This client's API URL — used to build the Mercado Pago webhook URL. Must be publicly reachable (a local dev tunnel if testing locally). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | This client's first admin account. Generate a real password — never ship the example placeholder. |
| `SEED_CUSTOMER_EMAIL` / `SEED_CUSTOMER_PASSWORD` | Only needed if you want a demo customer account seeded too. |
| `SEED_STORE_NAME` / `SEED_STORE_EMAIL` / `SEED_CURRENCY` / `SEED_CURRENCY_SYMBOL` | Store identity written into the `StoreSetting` table. |

## 3. Run migrations and seed

```bash
cd apps/server
pnpm prisma:migrate   # applies all migrations to the client's database
pnpm prisma:seed      # creates the admin/customer accounts and store settings above
```

Verify before moving on:

```bash
npx prisma migrate status   # must say "Database schema is up to date!"
```

## 4. Web app environment + branding

Run the interactive wizard (preferred over hand-editing):

```bash
pnpm setup:client
```

This regenerates both `apps/web/.env` and `apps/web/config/branding.ts` for the new
client. See `customization.md` for exactly which fields are safe to set this way vs.
which require an actual code change. `branding.ts` is validated at build/start time —
if the wizard (or a manual edit) produces an invalid config, the build fails with a
clear error instead of shipping a broken page.

Set `NEXT_PUBLIC_API_URL` to this client's deployed API URL.

## 5. Mercado Pago webhook

Once the API is deployed at a public URL, register/confirm the webhook URL
(`${API_BASE_URL}/api/payments/webhook`) is reachable — test by creating a real test
payment in Mercado Pago's sandbox and confirming the order transitions to `PAID`.
Signature verification for the webhook is not yet implemented (see
`payments_mercadopago.md`) — treat this integration as "trusted but not yet
hardened" until that's added.

## 6. Deploy and smoke test

1. Deploy `apps/server` and `apps/web`.
2. Log in as the seeded admin and customer accounts.
3. Place one real test order through Mercado Pago's sandbox end-to-end (cart → checkout
   → redirect → webhook → order shows `PAID`).
4. Confirm an authenticated non-admin account gets `403` on an admin-only endpoint
   (e.g. `GET /api/orders/admin/all`) — a quick regression check that RBAC is wired
   correctly for this deployment.

## What's still manual on purpose

- No automated IaC/provisioning script yet (see roadmap: build this once the pattern
  below has been repeated a few times for real clients, not before).
- No self-service admin panel to list/manage all client instances yet — with a small
  number of clients, this runbook plus your own notes is enough.
