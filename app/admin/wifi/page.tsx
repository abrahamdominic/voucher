import { notFound } from "next/navigation";
import { Wifi } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { describeWifiProvider } from "@/lib/wifi";
import { createAdminClient } from "@/lib/supabase/admin";
import { WifiSettingsForm } from "@/components/admin/wifi-settings-form";

export const metadata = { title: "Wi-Fi settings" };

export default async function AdminWifiPage() {
  // Layout guard is staff-level; this page requires super_admin.
  const profile = await requireRole("super_admin");

  const admin = createAdminClient();
  const { data: settings } = await admin.from("wifi_settings").select("*").eq("id", 1).maybeSingle();
  if (!settings) notFound();

  const providerInfo = describeWifiProvider();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wi-Fi settings</h1>
        <p className="text-sm text-muted-foreground">
          Controls the network customers join and how vouchers activate.
        </p>
      </div>

      <Card className="py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="size-4 text-muted-foreground" aria-hidden /> Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 py-4 text-sm">
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="text-muted-foreground">Active adapter</span>
            <span className="font-medium">{providerInfo.label}</span>
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Selected via <code className="rounded bg-muted px-1">WIFI_PROVIDER</code> environment variable
            ({providerInfo.configurable ? "HTTP API mode" : "mock mode"}). Credentials live in env vars only — never in
            this database. Swap adapters by implementing <code className="rounded bg-muted px-1">WiFiProvider</code>.
          </p>
        </CardContent>
      </Card>

      <WifiSettingsForm
        key={settings.updated_at}
        canEdit={profile.role === "super_admin"}
        initial={{
          networkName: settings.network_name,
          captivePortalUrl: settings.captive_portal_url ?? "",
          accessPointName: settings.access_point_name ?? "",
          routerIdentifier: settings.router_identifier ?? "",
          authMethod: settings.auth_method,
          sessionDurationMinutes: settings.session_duration_minutes,
          defaultSpeedMbps: settings.default_speed_mbps ?? "",
          defaultDataLimitMb: settings.default_data_limit_mb ?? "",
          defaultDeviceLimit: settings.default_device_limit,
          instructions: settings.instructions,
        }}
        lastUpdated={formatDate(settings.updated_at)}
      />
    </div>
  );
}
