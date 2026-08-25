-- ============================================================================
-- Migration 0002: functions & triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'plans', 'customers', 'orders', 'payments',
    'vouchers', 'wifi_providers', 'wifi_settings'
  ] loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Create a profile for every new auth user.
-- The very first user to sign up becomes super_admin (bootstrap owner).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when (select count(*) from public.profiles) = 0 then 'super_admin'::public.user_role else 'staff'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role helpers (security definer so RLS policies can call them cheaply)
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_profile_role() is not null;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_profile_role() in ('super_admin', 'admin');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_profile_role() = 'super_admin';
$$;

-- ---------------------------------------------------------------------------
-- Secure voucher code generation (crypto-random, unambiguous alphabet)
-- ---------------------------------------------------------------------------
create or replace function public.generate_voucher_code(p_prefix text default 'NK')
returns text
language plpgsql volatile
as $$
declare
  v_alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_len int := length(v_alphabet);
  v_bytes bytea;
  v_part1 text := '';
  v_part2 text := '';
  i int;
begin
  v_bytes := gen_random_bytes(10);
  for i in 0..4 loop
    v_part1 := v_part1 || substr(v_alphabet, floor(get_byte(v_bytes, i) / 256.0 * v_len)::int + 1, 1);
    v_part2 := v_part2 || substr(v_alphabet, floor(get_byte(v_bytes, i + 5) / 256.0 * v_len)::int + 1, 1);
  end loop;
  return upper(p_prefix) || '-' || v_part1 || '-' || v_part2;
end;
$$;

-- ---------------------------------------------------------------------------
-- allocate_voucher_for_order
-- Atomically assigns a paid order its voucher:
--   Mode B — reserve an available imported voucher for the plan (SKIP LOCKED
--            so two customers can never receive the same voucher), else
--   Mode A — generate a fresh unique code.
-- Idempotent: returns the existing voucher when the order already has one.
-- Raises: ORDER_NOT_FOUND / ORDER_NOT_PAID / PLAN_NOT_FOUND / CODE_GEN_FAILED
-- ---------------------------------------------------------------------------
create or replace function public.allocate_voucher_for_order(p_order_id uuid)
returns table (allocated_voucher_id uuid, allocated_voucher_code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_order   public.orders%rowtype;
  v_plan    public.plans%rowtype;
  v_voucher public.vouchers%rowtype;
  v_code    text;
  v_attempts int := 0;
  v_settings record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- already fulfilled → idempotent no-op
  if v_order.voucher_id is not null then
    select * into v_voucher from public.vouchers where id = v_order.voucher_id;
    return query select v_voucher.id, v_voucher.code;
    return;
  end if;

  if v_order.status <> 'paid' then
    raise exception 'ORDER_NOT_PAID';
  end if;

  select * into v_plan from public.plans where id = v_order.plan_id;
  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  -- Mode B: pre-generated/imported inventory first
  select * into v_voucher
  from public.vouchers
  where plan_id = v_plan.id
    and status = 'available'
  order by created_at
  limit 1
  for update skip locked;

  if found then
    update public.vouchers set
      status          = 'issued',
      order_id        = v_order.id,
      customer_phone  = v_order.phone,
      customer_email  = v_order.email,
      updated_at      = now()
    where id = v_voucher.id
    returning * into v_voucher;
  else
    -- Mode A: generate a fresh code (unique-constraint retry loop)
    loop
      v_code := public.generate_voucher_code('NK');
      begin
        insert into public.vouchers (
          code, plan_id, source, status, duration_hours,
          data_allowance_mb, device_limit, order_id,
          customer_phone, customer_email
        ) values (
          v_code, v_plan.id, 'generated', 'issued', v_plan.duration_hours,
          v_plan.data_allowance_mb, v_plan.device_limit, v_order.id,
          v_order.phone, v_order.email
        )
        returning * into v_voucher;
        exit;
      exception when unique_violation then
        v_attempts := v_attempts + 1;
        if v_attempts > 5 then
          raise exception 'CODE_GEN_FAILED';
        end if;
      end;
    end loop;
  end if;

  update public.orders
     set voucher_id = v_voucher.id, updated_at = now()
   where id = p_order_id;

  return query select v_voucher.id, v_voucher.code;
end;
$$;

-- ---------------------------------------------------------------------------
-- process_successful_payment
-- Single-transaction fulfillment for a verified payment:
-- payment → successful, order → paid, voucher allocated, notifications queued,
-- audit log written. Fully idempotent (safe against webhook replays).
-- p_method/p_channel/p_raw are optional enrichment from the provider payload.
-- ---------------------------------------------------------------------------
create or replace function public.process_successful_payment(
  p_payment_id uuid,
  p_method text default null,
  p_channel text default null,
  p_provider_reference text default null,
  p_raw jsonb default null
)
returns text -- voucher code, or existing code when replayed
language plpgsql security definer set search_path = public
as $$
declare
  v_payment   public.payments%rowtype;
  v_order     public.orders%rowtype;
  v_voucher_id uuid;
  v_code      text;
  v_existing  text;
  v_business  text;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  -- idempotency guard: already processed
  if v_payment.status = 'successful' then
    select o.voucher_id into v_voucher_id
      from public.orders o where o.id = v_payment.order_id;
    select code into v_existing from public.vouchers where id = v_voucher_id;
    return v_existing;
  end if;

  if v_payment.status = 'refunded' then
    raise exception 'PAYMENT_REFUNDED';
  end if;

  update public.payments set
    status = 'successful',
    method = coalesce(p_method, method),
    channel = coalesce(p_channel, channel),
    provider_reference = coalesce(provider_reference, p_provider_reference),
    verified_at = now(),
    raw_response = coalesce(p_raw, raw_response),
    updated_at = now()
  where id = p_payment_id;

  select * into v_order from public.orders where id = v_payment.order_id for update;

  update public.orders set
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  where id = v_order.id;

  -- upsert customer aggregate
  insert into public.customers (phone, email, total_orders, total_spent_kobo, last_order_at)
  values (v_order.phone, v_order.email, 1, v_order.amount_kobo, now())
  on conflict (phone) do update set
    email            = excluded.email,
    total_orders     = public.customers.total_orders + 1,
    total_spent_kobo = public.customers.total_spent_kobo + excluded.total_spent_kobo,
    last_order_at    = excluded.last_order_at,
    updated_at       = now();

  -- link order to the aggregated customer row
  update public.orders set customer_id = (
    select c.id from public.customers c where c.phone = v_order.phone
  ) where id = v_order.id and customer_id is null;

  -- allocate the voucher (Mode B inventory first, then Mode A generate)
  select allocated_voucher_id, allocated_voucher_code
    into v_voucher_id, v_code
  from public.allocate_voucher_for_order(v_order.id);

  select coalesce((value ->> 'name'), 'NK Swift DATA') into v_business
    from public.settings where key = 'business';

  -- queue outbound notifications (delivery attempted by notification service)
  insert into public.notifications (type, channel, recipient, subject, body, related_type, related_id) values
    ('payment_success', 'email', v_order.email,
      'Payment received — ' || coalesce(v_business, 'NK Swift DATA'),
      'Your payment of ₦' || (v_order.amount_kobo / 100.0)::text || ' was successful. Order ' || v_order.reference || '. Your voucher: ' || v_code,
      'order', v_order.id),
    ('voucher_issued', 'sms', v_order.phone,
      null,
      coalesce(v_business, 'NK Swift DATA') || ': your Wi-Fi voucher is ' || v_code || '. Valid ' || v_order.plan_duration_hours || 'h after activation.',
      'order', v_order.id),
    ('voucher_issued', 'whatsapp', v_order.phone,
      null,
      coalesce(v_business, 'NK Swift DATA') || ': your Wi-Fi voucher is ' || v_code || '. Valid ' || v_order.plan_duration_hours || 'h after activation.',
      'order', v_order.id);

  insert into public.audit_logs (action, resource_type, resource_id, metadata)
  values ('payment.confirmed', 'payment', p_payment_id::text,
    jsonb_build_object('order_reference', v_order.reference, 'amount_kobo', v_order.amount_kobo));

  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- expire_due_vouchers — lazily flips issued/active vouchers past expiry
-- ---------------------------------------------------------------------------
create or replace function public.expire_due_vouchers()
returns int
language plpgsql security definer set search_path = public
as $$
declare v_count int;
begin
  update public.vouchers
     set status = 'expired', updated_at = now()
   where expires_at is not null
     and expires_at < now()
     and status in ('issued', 'active', 'reserved');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- activate_voucher — called via the WiFiProvider integration path.
-- Sets activated_at/expires_at and transitions status. Idempotent per voucher:
-- activating twice keeps the original expiry window.
-- ---------------------------------------------------------------------------
create or replace function public.activate_voucher(p_code text, p_device_mac text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_voucher public.vouchers%rowtype;
begin
  select * into v_voucher from public.vouchers where upper(code) = upper(p_code) for update;
  if not found then
    raise exception 'VOUCHER_NOT_FOUND';
  end if;

  if v_voucher.status in ('revoked', 'suspended', 'used', 'expired') then
    raise exception 'VOUCHER_NOT_ACTIVE_%', upper(v_voucher.status);
  end if;

  if v_voucher.expires_at is not null and v_voucher.expires_at < now() then
    update public.vouchers set status='expired', updated_at=now() where id = v_voucher.id;
    raise exception 'VOUCHER_EXPIRED';
  end if;

  if v_voucher.status in ('issued', 'reserved') then
    update public.vouchers set
      activated_at = now(),
      expires_at   = now() + (v_voucher.duration_hours || ' hours')::interval,
      status       = 'active',
      usage        = jsonb_set(usage, '{devices}', (((usage ->> 'devices')::int) + 1)::text::jsonb),
      updated_at   = now()
    where id = v_voucher.id;
  elsif p_device_mac is not null then
    -- additional device within limit
    if ((v_voucher.usage ->> 'devices')::int) >= v_voucher.device_limit then
      raise exception 'DEVICE_LIMIT_REACHED';
    end if;
    update public.vouchers set
      usage = jsonb_set(usage, '{devices}', (((v_voucher.usage ->> 'devices')::int) + 1)::text::jsonb),
      updated_at = now()
    where id = v_voucher.id;
  end if;

  insert into public.wifi_sessions (voucher_id, device_mac)
  values (v_voucher.id, p_device_mac);

  select * into v_voucher from public.vouchers where id = v_voucher.id;

  return jsonb_build_object(
    'code', v_voucher.code,
    'status', v_voucher.status,
    'activated_at', v_voucher.activated_at,
    'expires_at', v_voucher.expires_at
  );
end;
$$;
