"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/rate-limit";

export interface WifiSettingsState {
  error?: string;
  success?: string;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateWifiSettingsAction(
  _prev: WifiSettingsState,
  formData: FormData
): Promise<WifiSettingsState> {
  const profile = await requireRole("super_admin");

  const networkName = str(formData, "networkName");
  if (!networkName || networkName.length > 100) return { error: "Network name is required." };

  const captivePortal = str(formData, "captivePortalUrl");
  if (captivePortal && !/^https?:\/\/.+/.test(captivePortal)) {
    return { error: "Captive portal URL must start with http:// or https://." };
  }

  const sessionMinutes = Number(formData.get("sessionDurationMinutes") ?? 0);
  if (!Number.isInteger(sessionMinutes) || sessionMinutes < 1) return { error: "Session duration must be at least 1 minute." };

  const dataLimitRaw = str(formData, "defaultDataLimitMb");
  const dataLimit = dataLimitRaw ? Number(dataLimitRaw) : null;
  if (dataLimit !== null && (!Number.isFinite(dataLimit) || dataLimit < 0)) return { error: "Data limit must be a number." };

  const deviceLimit = Number(formData.get("defaultDeviceLimit") ?? 0);
  if (!Number.isInteger(deviceLimit) || deviceLimit < 1) return { error: "Device limit must be at least 1." };

  const authMethod = str(formData, "authMethod");
  if (!["voucher_code", "username_password", "mac_address"].includes(authMethod)) {
    return { error: "Invalid authentication method." };
  }

  const admin = createAdminClient();
  const values = {
    network_name: networkName,
    captive_portal_url: captivePortal || null,
    access_point_name: str(formData, "accessPointName") || null,
    router_identifier: str(formData, "routerIdentifier") || null,
    auth_method: authMethod as "voucher_code" | "username_password" | "mac_address",
    session_duration_minutes: sessionMinutes,
    default_speed_mbps: str(formData, "defaultSpeedMbps") || null,
    default_data_limit_mb: dataLimit,
    default_device_limit: deviceLimit,
    instructions: str(formData, "instructions") || "",
  };

  // Singleton row (id = 1 seeded); upsert keeps it robust.
  const { error } = await admin.from("wifi_settings").upsert({ id: 1, ...values });
  if (error) {
    console.error("[wifi-settings] update failed:", error.message);
    return { error: "Could not save Wi-Fi settings." };
  }

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "settings.wifi_updated",
    resourceType: "wifi_settings",
    resourceId: "1",
    metadata: { network_name: values.network_name },
    ipAddress: clientIpFromHeaders(await headers()),
  });

  revalidatePath("/admin/wifi");
  revalidatePath("/connect");
  return { success: "Wi-Fi settings saved." };
}
