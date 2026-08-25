/** Server-side configuration from environment variables. */

export const config = {
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  },
  get paymentProvider(): string {
    return (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();
  },
  get paystackSecretKey() {
    return process.env.PAYSTACK_SECRET_KEY ?? "";
  },
  get paystackPublicKey() {
    return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
  },
  get wifiProvider(): string {
    return (process.env.WIFI_PROVIDER ?? "mock").toLowerCase();
  },
  get wifiApiUrl() {
    return process.env.WIFI_API_URL ?? "";
  },
  get wifiApiKey() {
    return process.env.WIFI_API_KEY ?? "";
  },
  get wifiApiSecret() {
    return process.env.WIFI_API_SECRET ?? "";
  },
  /** Comma-separated list of email addresses that receive admin failure alerts. */
  get adminAlertEmail() {
    return process.env.ADMIN_ALERT_EMAIL ?? "";
  },
  get siteUrl() {
    return (
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    );
  },
} as const;

export const APP_NAME = "NK Swift DATA";
export const CURRENCY = "NGN";
