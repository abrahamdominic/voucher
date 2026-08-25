-- ============================================================================
-- NK Swift DATA — Guest Wi-Fi Voucher Platform
-- Migration 0001: core schema (enums, tables, indexes, constraints)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('super_admin', 'admin', 'staff');
create type public.order_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'successful', 'failed', 'refunded');
create type public.voucher_status as enum (
  'available', 'reserved', 'issued', 'active', 'expired', 'suspended', 'revoked', 'used'
);
create type public.voucher_source as enum ('generated', 'imported');
create type public.notification_type as enum (
  'payment_success', 'voucher_issued', 'voucher_expiring', 'payment_failed', 'voucher_revoked'
);
create type public.notification_channel as enum ('email', 'sms', 'whatsapp', 'telegram');
create type public.notification_status as enum ('pending', 'sent', 'failed');
create type public.wifi_provider_type as enum ('mock', 'mikrotik', 'unifi', 'radius', 'custom');

-- ---------------------------------------------------------------------------
-- profiles — admin/staff users (linked to auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        public.user_role not null default 'staff',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_profiles_role on public.profiles (role);

-- ---------------------------------------------------------------------------
-- plans — purchasable Wi-Fi access plans
-- ---------------------------------------------------------------------------
create table public.plans (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 1 and 100),
  description       text,
  price_kobo        bigint not null check (price_kobo >= 0),
  duration_hours    int not null check (duration_hours > 0),
  data_allowance_mb int check (data_allowance_mb is null or data_allowance_mb > 0),
  speed_mbps        text,
  device_limit      int not null default 1 check (device_limit > 0),
  is_active         boolean not null default true,
  is_popular        boolean not null default false,
  display_order     int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_plans_active_order on public.plans (is_active, display_order);

-- ---------------------------------------------------------------------------
-- customers — aggregated from guest checkout details
-- ---------------------------------------------------------------------------
create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  phone          text not null unique,
  email          text,
  name           text,
  status         text not null default 'active' check (status in ('active', 'blocked')),
  total_orders   int not null default 0,
  total_spent_kobo bigint not null default 0,
  first_seen_at  timestamptz not null default now(),
  last_order_at  timestamptz,
  updated_at     timestamptz not null default now()
);

create index idx_customers_email on public.customers (email);
create index idx_customers_last_order on public.customers (last_order_at desc);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  customer_id        uuid references public.customers (id) on delete set null,
  plan_id            uuid not null references public.plans (id) on delete restrict,
  -- snapshot of plan at purchase time (prices must never change retroactively)
  plan_name          text not null,
  plan_duration_hours int not null,
  amount_kobo        bigint not null check (amount_kobo >= 0),
  phone              text not null,
  email              text not null,
  status             public.order_status not null default 'pending',
  payment_provider   text not null default 'paystack',
  provider_reference text unique,
  voucher_id         uuid,
  metadata           jsonb not null default '{}'::jsonb,
  ip_address         text,
  paid_at            timestamptz,
  cancelled_at       timestamptz,
  refunded_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_orders_status on public.orders (status);
create index idx_orders_customer on public.orders (customer_id);
create index idx_orders_plan on public.orders (plan_id);
create index idx_orders_phone on public.orders (phone);
create index idx_orders_email on public.orders (email);
create index idx_orders_created_at on public.orders (created_at desc);
alter table public.orders add constraint fk_orders_voucher
  foreign key (voucher_id) references public.vouchers (id) on delete set null;

-- ---------------------------------------------------------------------------
-- order_items — line items for an order (extensible for bundles)
-- ---------------------------------------------------------------------------
create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  plan_id         uuid not null references public.plans (id),
  description     text not null,
  quantity        int not null default 1 check (quantity > 0),
  unit_price_kobo bigint not null check (unit_price_kobo >= 0),
  created_at      timestamptz not null default now()
);

create index idx_order_items_order on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete restrict,
  transaction_ref    text not null unique,
  provider           text not null,
  provider_reference text unique,
  amount_kobo        bigint not null check (amount_kobo >= 0),
  currency           text not null default 'NGN',
  method             text,
  channel            text,
  status             public.payment_status not null default 'pending',
  verified_at        timestamptz,
  refunded_at        timestamptz,
  refund_reference   text,
  failure_reason     text,
  raw_response       jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_payments_order on public.payments (order_id);
create index idx_payments_status on public.payments (status);
create index idx_payments_created_at on public.payments (created_at desc);

-- ---------------------------------------------------------------------------
-- voucher_batches — provenance for generated/imported voucher sets
-- ---------------------------------------------------------------------------
create table public.voucher_batches (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  mode       public.voucher_source not null,
  plan_id    uuid references public.plans (id) on delete set null,
  quantity   int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- vouchers
-- ---------------------------------------------------------------------------
create table public.vouchers (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  batch_id          uuid references public.voucher_batches (id) on delete set null,
  plan_id           uuid not null references public.plans (id) on delete restrict,
  order_id          uuid references public.orders (id) on delete set null,
  source            public.voucher_source not null default 'generated',
  status            public.voucher_status not null default 'available',
  duration_hours    int not null check (duration_hours > 0),
  data_allowance_mb int check (data_allowance_mb is null or data_allowance_mb > 0),
  device_limit      int not null default 1 check (device_limit > 0),
  customer_phone    text,
  customer_email    text,
  activated_at      timestamptz,
  expires_at        timestamptz,
  usage             jsonb not null default '{"bytes_in": 0, "bytes_out": 0, "devices": 0}'::jsonb,
  notes             text,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint chk_voucher_code_format check (code ~* '^[A-Z0-9]{2,8}(-[A-Z0-9]{3,10}){1,3}$')
);

create index idx_vouchers_plan on public.vouchers (plan_id);
create index idx_vouchers_status on public.vouchers (status);
create index idx_vouchers_order on public.vouchers (order_id);
create index idx_vouchers_expires on public.vouchers (expires_at);
create index idx_vouchers_batch on public.vouchers (batch_id);
create index idx_vouchers_phone on public.vouchers (customer_phone);

-- ---------------------------------------------------------------------------
-- wifi_providers — external network infrastructure integrations
-- config contains credentials: never exposed to clients (RLS denies reads)
-- ---------------------------------------------------------------------------
create table public.wifi_providers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       public.wifi_provider_type not null default 'mock',
  config     jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- wifi_settings — singleton captive-portal / network configuration
-- ---------------------------------------------------------------------------
create table public.wifi_settings (
  id                       int primary key default 1 check (id = 1),
  network_name             text not null default 'NK Swift WiFi',
  captive_portal_url       text,
  access_point_name        text,
  router_identifier        text,
  auth_method              text not null default 'voucher_code'
                           check (auth_method in ('voucher_code', 'username_password', 'mac_address')),
  session_duration_minutes int not null default 60 check (session_duration_minutes > 0),
  default_speed_mbps       text,
  default_data_limit_mb    int,
  default_device_limit     int not null default 1 check (default_device_limit > 0),
  instructions             text not null default 'Connect to the Wi-Fi network and enter your voucher code.',
  updated_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- wifi_sessions — live/historical sessions opened with a voucher
-- ---------------------------------------------------------------------------
create table public.wifi_sessions (
  id           uuid primary key default gen_random_uuid(),
  voucher_id   uuid not null references public.vouchers (id) on delete cascade,
  device_mac   text,
  ip_address   text,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  bytes_in     bigint not null default 0,
  bytes_out    bigint not null default 0,
  status       text not null default 'active' check (status in ('active', 'ended', 'terminated'))
);

create index idx_wifi_sessions_voucher on public.wifi_sessions (voucher_id);

-- ---------------------------------------------------------------------------
-- voucher_usage — per-device usage rows reported by the network provider
-- ---------------------------------------------------------------------------
create table public.voucher_usage (
  id          uuid primary key default gen_random_uuid(),
  voucher_id  uuid not null references public.vouchers (id) on delete cascade,
  session_id  uuid references public.wifi_sessions (id) on delete set null,
  device_mac  text,
  bytes_in    bigint not null default 0,
  bytes_out   bigint not null default 0,
  recorded_at timestamptz not null default now()
);

create index idx_voucher_usage_voucher on public.voucher_usage (voucher_id);

-- ---------------------------------------------------------------------------
-- webhook_events — idempotency ledger for payment provider callbacks
-- ---------------------------------------------------------------------------
create table public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,
  event_ref    text not null,
  payload      jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (provider, event_ref)
);

-- ---------------------------------------------------------------------------
-- notifications — outbound message queue (email / sms / whatsapp / telegram)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  type          public.notification_type not null,
  channel       public.notification_channel not null,
  recipient     text not null,
  subject       text,
  body          text not null,
  status        public.notification_status not null default 'pending',
  retries       int not null default 0,
  error         text,
  related_type  text,
  related_id    uuid,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_notifications_status on public.notifications (status, created_at desc);
create index idx_notifications_type on public.notifications (type);

-- ---------------------------------------------------------------------------
-- audit_logs — immutable trail of administrative actions
-- no update/delete policies exist anywhere: records cannot be silently edited
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid,
  actor_email   text,
  action        text not null,
  resource_type text not null,
  resource_id   text,
  metadata      jsonb not null default '{}'::jsonb,
  ip_address    text,
  created_at    timestamptz not null default now()
);

create index idx_audit_logs_action on public.audit_logs (action);
create index idx_audit_logs_actor on public.audit_logs (actor_id);
create index idx_audit_logs_created_at on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- settings — key/value store for business, branding & notification config
-- IMPORTANT: secrets (API keys) are stored in environment variables only.
-- ---------------------------------------------------------------------------
create table public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint chk_settings_keys check (key in ('business', 'branding', 'payment', 'wifi', 'notifications'))
);
