# NK Swift DATA — Wi-Fi Voucher Sales Platform

A production-ready guest Wi-Fi voucher platform: customers browse plans, pay online, and receive an activation code instantly by email/SMS/WhatsApp/Telegram. Operators get a full admin dashboard covering orders, vouchers, plans, customers, payments, analytics, notifications, Wi-Fi settings, staff, and audit logs.

## Features

**Customer portal**

- Plan catalogue (`/connect/plans`) with live availability
- Checkout with phone + optional email; Paystack (or mock) payment
- Instant voucher code on success page + `/voucher` lookup by phone
- Public receipt at `/receipt/[reference]`; status polling for slow webhooks

**Admin dashboard** (`/admin`)

- Role-based access: `staff` -> orders/vouchers; `admin` -> plus plans/customers/payments/analytics/notifications; `super_admin` -> everything
- Orders: filters, status transitions, refunds
- Vouchers: generate/import/bulk actions/CSV export
- Payments ledger, customer profiles, revenue analytics charts
- Notifications queue with resend + drain; immutable audit log
- Settings: business info, branding, notification channels

**Integrations**

- WhatsApp (Meta Cloud API) and Telegram delivery channels built in
- Pluggable Wi-Fi activation adapter (mock or custom captive-portal REST API)
- Pluggable payment gateway abstraction (mock or Paystack)

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (radix-nova), Supabase (Postgres + Auth + RLS), recharts, zod 4.

## Project layout

```
app/                 routes (customer portal, /admin, API routes)
  admin/actions/     server actions (auth, orders, plans, vouchers, ...)
  api/webhooks/      Paystack webhook
  api/cron/          notification queue drainer
components/          ui/ (shadcn), customer/, admin/
lib/
  payments/          provider abstraction (mock | paystack)
  wifi/              provider abstraction (mock | custom-api)
  notifications/     channel senders + durable queue
  auth/              session guards + client-safe permission matrix
supabase/
  migrations/        0001 schema, 0002 functions/triggers, 0003 RLS
  seed/seed.sql      starter plans + settings
types/database.ts    Database typing for supabase-js
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npx supabase start           # or use a hosted project
npx supabase db reset        # applies migrations + seed
npm run dev                  # http://localhost:3000
```

With `PAYMENT_PROVIDER=mock` a demo gateway at `/pay/mock/[reference]` can complete/cancel/fail payments so the full flow works offline.

All environment variables are documented inline in `.env.example`. Only `NEXT_PUBLIC_*` values reach the browser; `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, and provider tokens must never be exposed client-side or committed.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (or run `npx supabase start` locally).
2. Apply migrations in order:

   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

   `0001_schema.sql` creates tables/enums/indexes; `0002_functions.sql` adds triggers (profile bootstrap, order-number generation, atomic fulfillment RPC, expiry sweep); `0003_rls.sql` locks every table down with row-level security.
3. Seed starter data (optional):

   ```bash
   npx supabase db reset        # local: migrations + seed
   ```

   Seeds four sample plans and the Wi-Fi settings singleton.

### Admin login setup

- The **first user to sign up** at `/admin/login` becomes `super_admin` automatically via a database trigger; later signups land as inactive `staff` until promoted.
- Invite team members from **Admin > Staff** (sends a Supabase invite email, assigns role). Guards prevent demoting/deactivating yourself or the last active super admin.

## Payment gateway setup

Payments are abstracted behind `lib/payments`; choose with `PAYMENT_PROVIDER`:

- `mock` (default): built-in demo gateway, no external account. Completes via `/api/mock-pay/complete`.
- `paystack`: set `PAYSTACK_SECRET_KEY` + `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, then:
  1. Copy keys from your Paystack dashboard.
  2. Add a webhook endpoint pointing to `https://<your-domain>/api/webhooks/paystack`.
  3. The webhook validates the `x-paystack-signature` HMAC; fulfilment runs through an atomic RPC with a payments ledger row per order, so webhook retries are idempotent.
  4. Refunds are issued from Admin > Orders via the Paystack refund API.

## Wi-Fi provider integration

Voucher activation is abstracted behind `lib/wifi` (`WiFiProvider`: activate/suspend/resume/usage):

- `mock` (default): records activations in the database only — ideal for demos.
- `custom`: REST bridge to your captive portal / hotspot controller:

  ```
  WIFI_PROVIDER=custom
  WIFI_API_URL=https://portal.example.com/api
  WIFI_API_KEY=...        # sent as Authorization: Bearer <key>
  WIFI_API_SECRET=...     # optional shared secret
  ```

  See `lib/wifi/custom-api.ts` for endpoints/payloads and adapt them to your router (MikroTik, UniFi, pfSense, ...). Network-wide defaults live under **Admin > Wi-Fi Settings**.

## Notifications: email, SMS, WhatsApp & Telegram

Outbound messages go through a durable queue (`notifications` table) drained by `dispatchPendingNotifications()` — fired post-fulfillment and retried by cron. Channels activate purely via env vars (unset = logs to server console):

- Email: `RESEND_API_KEY`, `EMAIL_FROM`
- SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- WhatsApp (Meta Cloud API): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- Admin alerts: `ADMIN_ALERT_EMAIL`

Because delivery is channel-based, a WhatsApp/Telegram mini app integration is straightforward: deep-link your bot's checkout to `/connect/plans`, then deliver codes through the existing senders.

## Deployment (Vercel)

1. Push the repo to GitHub and import it into Vercel.
2. Set every variable from `.env.example` in Project Settings (production Supabase URL/keys, `NEXT_PUBLIC_SITE_URL`, `PAYMENT_PROVIDER=paystack`, `CRON_SECRET`, channel tokens).
3. `vercel.json` registers a cron that hits `/api/cron/notifications` every 5 minutes to drain the notification queue and expire due vouchers. Vercel sends the required `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set.
4. Add the Paystack webhook URL (`/api/webhooks/paystack`) in the Paystack dashboard.
5. Deploy, then sign up at `/admin/login` — the first account becomes super_admin.

Manual cron test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/notifications
```

## Security notes

- All secrets are env-only; service-role client is used exclusively server-side.
- RLS enabled on every table; admin data flows through server actions guarded by `requireRole`.
- Webhook payloads are HMAC-verified; fulfillment is an atomic DB function (no double-spend of vouchers).
- Audit log is insert-only (no update/delete policies).
