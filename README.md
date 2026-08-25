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
- WhatsApp and Telegram chatbot webhooks for customer self-service
- Pluggable Wi-Fi activation adapter (mock or custom captive-portal REST API)
- Pluggable payment gateway abstraction (mock or Paystack)

**Chatbots (WhatsApp & Telegram)**

Customers can interact with your bot to check order status and voucher validity:

- `/start` — welcome message
- `/status <REFERENCE>` — look up an order by reference
- `/voucher <CODE>` — check voucher validity and expiry
- `/help` — list available commands
- Send a reference or voucher code directly — auto-detected

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (radix-nova), Supabase (Postgres + Auth + RLS), recharts, zod 4.

## Project layout

```
app/                 routes (customer portal, /admin, API routes)
  admin/actions/     server actions (auth, orders, plans, vouchers, ...)
  api/webhooks/      Paystack, WhatsApp, Telegram webhooks
  api/cron/          notification queue drainer
components/          ui/ (shadcn), customer/, admin/
lib/
  payments/          provider abstraction (mock | paystack)
  wifi/              provider abstraction (mock | custom-api)
  notifications/     channel senders + durable queue
  bot/               shared chatbot handler (WhatsApp + Telegram)
  auth/              session guards + client-safe permission matrix
supabase/
  migrations/        0001 schema, 0002 functions/triggers, 0003 RLS
  seed/seed.sql      starter plans + settings
types/database.ts    Database typing for supabase-js
```

## Local development

```bash
npm install
cp .env.example .env   # fill in values (see below)
npx supabase start     # or use a hosted project
npx supabase db reset  # applies migrations + seed
npm run dev            # http://localhost:3000
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

  See `lib/wifi/index.ts` for endpoints/payloads and adapt them to your router (MikroTik, UniFi, pfSense, ...). Network-wide defaults live under **Admin > Wi-Fi Settings**.

## Notifications: email, SMS, WhatsApp & Telegram

Outbound messages go through a durable queue (`notifications` table) drained by `dispatchPendingNotifications()` — fired post-fulfillment and retried by cron. Channels activate purely via env vars (unset = logs to server console):

- Email: `RESEND_API_KEY`, `EMAIL_FROM`
- SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- WhatsApp (Meta Cloud API): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- Admin alerts: `ADMIN_ALERT_EMAIL`

## WhatsApp & Telegram chatbots

Both platforms have interactive bot webhooks that let customers check order status and voucher validity without logging in.

### WhatsApp bot setup

1. Create a Meta app at [developers.facebook.com](https://developers.facebook.com) and enable the WhatsApp product.
2. Generate a permanent access token and phone number ID.
3. Set environment variables:

   ```
   WHATSAPP_TOKEN=your-permanent-access-token
   WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
   WHATSAPP_VERIFY_TOKEN=any-random-string-for-webhook-verification
   ```

4. In Meta for Developers → WhatsApp → Configuration → Webhook:
   - **Callback URL**: `https://<your-domain>/api/webhooks/whatsapp`
   - **Verify token**: the same string you set in `WHATSAPP_VERIFY_TOKEN`
5. Subscribe to the **messages** field.

### Telegram bot setup

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram and copy the token.
2. Set environment variables:

   ```
   TELEGRAM_BOT_TOKEN=your-bot-token
   TELEGRAM_BOT_SECRET=any-random-string-for-webhook-security
   ```

3. Set the webhook URL:

   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
     -d "url=https://<your-domain>/api/webhooks/telegram" \
     -H "Content-Type: application/json"
   ```

4. Optional: set `TELEGRAM_BOT_SECRET` and configure the same secret in BotFather's webhook settings for additional security.

### Bot commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/status <REF>` | Look up order status by reference |
| `/status` | Look up your latest voucher (by phone) |
| `/voucher <CODE>` | Check voucher validity and expiry |
| `/help` | List available commands |

Plain text messages are auto-detected as order references or voucher codes.

## Deployment

### Netlify (recommended)

1. Push the repo to GitHub and import it into Netlify.
2. The `@netlify/plugin-nextjs` runtime is auto-detected — no manual plugin installation needed.
3. Set every variable from `.env.example` in Site Settings (production Supabase URL/keys, `NEXT_PUBLIC_SITE_URL=https://your-domain.netlify.app`, `PAYMENT_PROVIDER=paystack`, `CRON_SECRET`, channel tokens).
4. Add the Paystack webhook URL (`/api/webhooks/paystack`) in the Paystack dashboard.
5. Set up WhatsApp and Telegram webhook URLs (see sections above).
6. Deploy, then sign up at `/admin/login` — the first account becomes super_admin.

### Vercel

1. Push the repo to GitHub and import it into Vercel.
2. Set every variable from `.env.example` in Project Settings.
3. `vercel.json` registers a cron that hits `/api/cron/notifications` every 5 minutes to drain the notification queue and expire due vouchers.
4. Add the Paystack webhook URL (`/api/webhooks/paystack`) in the Paystack dashboard.
5. Deploy, then sign up at `/admin/login` — the first account becomes super_admin.

### Manual cron test

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/notifications
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only, starts with `eyJ...`) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Production URL for redirects and password reset |
| `PAYMENT_PROVIDER` | No | `mock` (default) or `paystack` |
| `PAYSTACK_SECRET_KEY` | If Paystack | Paystack secret key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | If Paystack | Paystack public key |
| `WIFI_PROVIDER` | No | `mock` (default) or `custom` |
| `WIFI_API_URL` | If custom WiFi | Captive portal REST API base URL |
| `WIFI_API_KEY` | If custom WiFi | API key for captive portal |
| `WIFI_API_SECRET` | No | Optional API secret for captive portal |
| `RESEND_API_KEY` | If email | Resend API key for transactional email |
| `EMAIL_FROM` | If email | Sender address (default: onboarding@resend.dev) |
| `TWILIO_ACCOUNT_SID` | If SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | If SMS | Twilio auth token |
| `TWILIO_FROM_NUMBER` | If SMS | Twilio phone number |
| `WHATSAPP_TOKEN` | If WhatsApp | Meta Cloud API permanent access token |
| `WHATSAPP_PHONE_NUMBER_ID` | If WhatsApp | Meta phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | No | Webhook verification token for Meta |
| `TELEGRAM_BOT_TOKEN` | If Telegram | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | If Telegram | Default chat ID for notifications |
| `TELEGRAM_BOT_SECRET` | No | Webhook secret for Telegram |
| `ADMIN_ALERT_EMAIL` | No | Receives failure alerts |
| `CRON_SECRET` | No | Protects the cron drain endpoint |

## Security notes

- All secrets are env-only; service-role client is used exclusively server-side.
- RLS enabled on every table; admin data flows through server actions guarded by `requireRole`.
- Webhook payloads are HMAC-verified; fulfillment is an atomic DB function (no double-spend of vouchers).
- Audit log is insert-only (no update/delete policies).
- The admin proxy (`proxy.ts`) is a fast cookie-presence check only — full session validation happens server-side in `lib/auth/session.ts`.
