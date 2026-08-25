-- ============================================================================
-- Migration 0003: Row Level Security
--
-- Principles:
--  * Anonymous users may ONLY read active plans and public Wi-Fi/business info.
--  * All transactional tables (orders, payments, vouchers, customers, …) are
--    completely closed to anon/authenticated clients. The Next.js server uses
--    the service-role key for these, behind authenticated server actions.
--  * Staff/admin/super_admin get scoped read access through helper functions
--    so dashboards can also query via the anon key where convenient.
--  * audit_logs are insert-only: no role can update or delete them.
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.plans             enable row level security;
alter table public.customers         enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.payments          enable row level security;
alter table public.vouchers          enable row level security;
alter table public.voucher_batches   enable row level security;
alter table public.wifi_providers    enable row level security;
alter table public.wifi_settings     enable row level security;
alter table public.wifi_sessions     enable row level security;
alter table public.voucher_usage     enable row level security;
alter table public.webhook_events    enable row level security;
alter table public.notifications     enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.settings          enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: staff read all"
  on public.profiles for select
  using (public.is_staff());

create policy "profiles: super admin manage all"
  on public.profiles for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- self-update limited to name only is handled in app layer; direct updates by
-- non-super-admins are denied (no policy).

-- ---------------------------------------------------------------------------
-- plans — public catalog
-- ---------------------------------------------------------------------------
create policy "plans: public read active"
  on public.plans for select
  using (is_active = true);

create policy "plans: staff read all"
  on public.plans for select
  using (public.is_staff());

create policy "plans: admins write"
  on public.plans for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- settings — public business/branding info readable, secrets live in env vars
-- ---------------------------------------------------------------------------
create policy "settings: public read"
  on public.settings for select
  using (true);

create policy "settings: admins write"
  on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- wifi_settings — instructions shown on customer site
-- ---------------------------------------------------------------------------
create policy "wifi_settings: public read"
  on public.wifi_settings for select
  using (true);

create policy "wifi_settings: admins write"
  on public.wifi_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- customers / orders / order_items / payments — service-role + staff read
-- ---------------------------------------------------------------------------
create policy "customers: staff read"
  on public.customers for select
  using (public.is_staff());

create policy "orders: staff read own-linked"
  on public.orders for select
  using (public.is_staff());

create policy "order_items: staff read"
  on public.order_items for select
  using (public.is_staff());

create policy "payments: staff read"
  on public.payments for select
  using (public.is_staff());

-- writes to these tables happen exclusively via the server (service role),
-- which bypasses RLS. No insert/update/delete policies → blocked for clients.

-- ---------------------------------------------------------------------------
-- vouchers / batches / usage / sessions — same model
-- ---------------------------------------------------------------------------
create policy "vouchers: staff read"
  on public.vouchers for select
  using (public.is_staff());

create policy "voucher_batches: staff read"
  on public.voucher_batches for select
  using (public.is_staff());

create policy "voucher_usage: staff read"
  on public.voucher_usage for select
  using (public.is_staff());

create policy "wifi_sessions: staff read"
  on public.wifi_sessions for select
  using (public.is_staff());

-- voucher mutations occur via RPC/security-definer functions & service role.

-- ---------------------------------------------------------------------------
-- wifi_providers — contains credentials; staff may read rows but never the
-- config blob (column-level privilege revoke below).
-- ---------------------------------------------------------------------------
create policy "wifi_providers: staff read meta"
  on public.wifi_providers for select
  using (public.is_staff());

revoke select (config) on public.wifi_providers from anon, authenticated;

create policy "wifi_providers: super admin write"
  on public.wifi_providers for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- webhook_events — fully private (service role only)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create policy "notifications: staff read"
  on public.notifications for select
  using (public.is_staff());

create policy "notifications: admins write"
  on public.notifications for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- audit_logs — read by staff, written by security-definer functions/service
-- role only. No update/delete policies exist at all: records are immutable.
-- ---------------------------------------------------------------------------
create policy "audit_logs: staff read"
  on public.audit_logs for select
  using (public.is_staff());
