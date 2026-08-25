import { CreditCard } from "lucide-react";

import { requireRole } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsTabs } from "@/components/admin/settings-tabs";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireRole("super_admin");
  const admin = createAdminClient();

  const [businessRes, brandingRes, notificationsRes] = await Promise.all([
    admin.from("settings").select("value").eq("key", "business").maybeSingle(),
    admin.from("settings").select("value").eq("key", "branding").maybeSingle(),
    admin.from("settings").select("value").eq("key", "notifications").maybeSingle(),
  ]);

  const business = (businessRes.data?.value ?? {}) as Record<string, string>;
  const branding = (brandingRes.data?.value ?? {}) as Record<string, string>;
  const notifications = (notificationsRes.data?.value ?? {}) as Record<string, unknown>;

  const paymentProvider = config.paymentProvider;
  const paystackConfigured = Boolean(process.env.PAYSTACK_SECRET_KEY);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business details, branding and channel preferences used across the site.
        </p>
      </div>

      {/* Payment configuration is env-based by design — read-only here. */}
      <section aria-labelledby="payment-config" className="rounded-xl border border-border/70 bg-card">
        <h2 id="payment-config" className="flex items-center gap-2 border-b border-border/60 px-5 py-4 text-base font-semibold">
          <CreditCard className="size-4 text-muted-foreground" aria-hidden /> Payment configuration
        </h2>
        <div className="space-y-2 p-5 text-sm">
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="text-muted-foreground">Active gateway</span>
            <span className="font-medium capitalize">{paymentProvider}</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="text-muted-foreground">Paystack credentials</span>
            <span className={paystackConfigured ? "font-medium text-primary" : "font-medium"}>
              {paystackConfigured ? "Configured (env)" : "Not set — mock gateway active"}
            </span>
          </div>
          <p className="px-1 pt-1 text-xs text-muted-foreground">
            Gateway keys live in environment variables only (<code className="rounded bg-muted px-1">PAYMENT_PROVIDER</code>,{" "}
            <code className="rounded bg-muted px-1">PAYSTACK_SECRET_KEY</code>) and are never stored in the database or
            shown in full.
          </p>
        </div>
      </section>

      <SettingsTabs
        business={{
          name: business.name ?? "",
          phone: business.phone ?? "",
          email: business.email ?? "",
          address: business.address ?? "",
          supportInfo: business.supportInfo ?? "",
        }}
        branding={{
          websiteTitle: branding.websiteTitle ?? "",
          logoUrl: branding.logoUrl ?? "",
          primaryColor: branding.primaryColor ?? "",
          secondaryColor: branding.secondaryColor ?? "",
          description: branding.description ?? "",
        }}
        notifications={{
          emailEnabled: notifications.emailEnabled === true,
          smsEnabled: notifications.smsEnabled === true,
          whatsappEnabled: notifications.whatsappEnabled === true,
          telegramEnabled: notifications.telegramEnabled === true,
        }}
      />
    </div>
  );
}
