# Payments (Mercado Pago, Checkout Pro)

Mercado Pago is the only payment gateway integrated, chosen for the company's initial
client base in Argentina. It uses **Checkout Pro** (hosted, redirect-based checkout) —
the server never touches card data, which keeps it out of PCI scope. Deliberately no
multi-gateway abstraction exists yet; add one only when a second gateway is a real
requirement, not speculatively.

## Flow

```
1. Customer completes checkout → POST /api/orders creates an Order (status PENDING)
2. Web app calls POST /api/orders/:id/payment-preference
   → PaymentService creates a Mercado Pago preference, and a Payment row (status PENDING)
   → returns { initPoint } — the URL to Mercado Pago's hosted checkout
3. Browser redirects to initPoint (full page navigation, apps/web/.../CheckoutScreen.tsx)
4. Customer pays on Mercado Pago's site
5. Mercado Pago redirects back to {FRONTEND_URL}/checkout/result?orderId=...&status=...
   (apps/web/.../CheckoutResultScreen.tsx) — this page shows a best-effort status based
   on the order's CURRENT status, which may not reflect the payment yet if the webhook
   hasn't arrived (shows "payment pending" in that case, not a false success/failure)
6. Independently, Mercado Pago POSTs to {API_BASE_URL}/api/payments/webhook
   → PaymentService re-fetches the payment BY ID from Mercado Pago's API (never trusts
     the webhook body's own status field) and updates the Order + Payment accordingly
```

Order status mapping from Mercado Pago's payment status:

| Mercado Pago `status` | Order status | Payment status |
|---|---|---|
| `approved` | `PAID` | `COMPLETED` |
| `pending` / `in_process` | `PAYMENT_PENDING` | `PENDING` |
| `rejected` / `cancelled` | unchanged (stays `PENDING`, customer can retry) | `FAILED` |
| `refunded` / `charged_back` | `REFUNDED` | `REFUNDED` |

Every order status change (including ones driven by this webhook) is recorded in
`OrderStatusHistory` — see `database_schema.md`.

## Required environment variables

See `apps/server/.env.example`: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_CURRENCY`,
`FRONTEND_URL`, `API_BASE_URL`, `MERCADOPAGO_WEBHOOK_URL` (override, rarely needed).

Get credentials from https://www.mercadopago.com.ar/developers — use `TEST-...`
credentials in every environment except production.

## Local development limitation

`API_BASE_URL` must be **publicly reachable** for Mercado Pago to call the webhook —
`localhost` is not reachable from Mercado Pago's servers. To test the webhook locally,
expose the local API through a tunnel (e.g. ngrok) and set `API_BASE_URL` /
`MERCADOPAGO_WEBHOOK_URL` to that tunnel's URL. Without a tunnel, the payment
preference and redirect still work, but the order will never automatically move past
`PENDING`/`PAYMENT_PENDING` since the webhook can't reach the server.

## Known gap: webhook signature verification

`PaymentService.handleWebhook` re-fetches the payment from Mercado Pago's API by ID
before trusting anything, which blocks the obvious forgery (an attacker can't fake an
arbitrary payment's approval status without controlling a real Mercado Pago payment).
It does **not** yet verify Mercado Pago's `x-signature` webhook header (an HMAC proving
the notification itself wasn't tampered with in transit). Add that before relying on
this integration for a live store handling real money — see Mercado Pago's
["Webhooks" docs](https://www.mercadopago.com.ar/developers) for the signature spec.

## What's intentionally not built yet

- Refunds (the `Payment` model has the fields for it; no service method calls Mercado
  Pago's refund API yet).
- A second payment gateway or any gateway-abstraction layer.
- Retrying/reconciling payments whose webhook never arrived (today, a customer can
  manually retry from `/checkout/result` if the order is still `PENDING`).
