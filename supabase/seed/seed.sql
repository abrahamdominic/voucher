-- ============================================================================
-- Seed data — realistic starter configuration
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Plans (prices in kobo)
-- ---------------------------------------------------------------------------
insert into public.plans (name, description, price_kobo, duration_hours, data_allowance_mb, speed_mbps, device_limit, is_active, is_popular, display_order) values
  ('1 Hour',   'Quick browsing for short visits. Perfect for checking emails and social media.', 50000,  1,   null, 'Up to 10 Mbps', 1, true, false, 1),
  ('6 Hours',  'Half-day access for work or study sessions with reliable speed.',               150000, 6,   5120, 'Up to 15 Mbps', 2, true, true,  2),
  ('24 Hours', 'Full-day unlimited-style access. Great for remote work and streaming.',          300000, 24,  null, 'Up to 20 Mbps', 3, true, false, 3),
  ('Weekly',   'Seven days of connectivity. Best value for extended stays.',                     800000, 168, null, 'Up to 25 Mbps', 5, true, false, 4)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Wi-Fi settings singleton
-- ---------------------------------------------------------------------------
insert into public.wifi_settings (
  id, network_name, captive_portal_url, access_point_name, router_identifier,
  auth_method, session_duration_minutes, default_speed_mbps, default_data_limit_mb,
  default_device_limit, instructions
) values (
  1,
  'NK Swift WiFi',
  'https://portal.example.com/login',
  'NK-SWIFT-AP-01',
  'RB4011-MAIN',
  'voucher_code',
  60,
  'Up to 10 Mbps',
  null,
  1,
  E'1. Connect to the Wi-Fi network.\n2. Open the Wi-Fi login page.\n3. Enter your voucher code.\n4. Start browsing.'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Default Wi-Fi provider: mock implementation (replace via env/settings later)
-- ---------------------------------------------------------------------------
insert into public.wifi_providers (name, type, config, is_default, is_active)
values ('Built-in mock provider', 'mock', '{}'::jsonb, true, true);

-- ---------------------------------------------------------------------------
-- Settings: business / branding / payment / notifications
-- ---------------------------------------------------------------------------
insert into public.settings (key, value) values
  ('business', jsonb_build_object(
    'name', 'NK Swift DATA',
    'phone', '+234 800 000 0000',
    'email', 'support@nkswiftdata.com',
    'address', 'Lagos, Nigeria',
    'supportInfo', 'Need help? Chat with us on WhatsApp.'
  )),
  ('branding', jsonb_build_object(
    'logoUrl', '/images/logo.png',
    'primaryColor', '#171717',
    'secondaryColor', '#00c96d',
    'websiteTitle', 'NK Swift DATA — Fast Guest Wi-Fi',
    'description', 'Connect to fast, reliable Wi-Fi. Choose a plan, pay securely and receive your access voucher instantly.'
  )),
  ('payment', jsonb_build_object(
    'provider', 'mock',
    'currency', 'NGN',
    'note', 'API keys are configured through environment variables on the server only.'
  )),
  ('notifications', jsonb_build_object(
    'emailEnabled', true,
    'smsEnabled', true,
    'whatsappEnabled', true,
    'telegramEnabled', true
  ))
on conflict (key) do nothing;
