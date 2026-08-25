"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/rate-limit";

export interface SettingsOpState {
  error?: string;
  success?: string;
}

async function readSetting(
  admin: ReturnType<typeof createAdminClient>,
  key: "business" | "branding" | "notifications"
): Promise<Record<string, unknown>> {
  const { data } = await admin.from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as Record<string, unknown>) ?? {};
}

export async function saveBusinessSettingsAction(
  _prev: SettingsOpState,
  formData: FormData
): Promise<SettingsOpState> {
  const profile = await requireRole("super_admin");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!name) return { error: "Business name is required." };

  const value = {
    name,
    phone: String(formData.get("phone") ?? "").trim().slice(0, 30),
    email: String(formData.get("email") ?? "").trim().slice(0, 160),
    address: String(formData.get("address") ?? "").trim().slice(0, 300),
    supportInfo: String(formData.get("supportInfo") ?? "").trim().slice(0, 500),
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert({ key: "business", value }, { onConflict: "key" });
  if (error) {
    console.error("[settings] business save failed:", error.message);
    return { error: "Could not save business details." };
  }

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "settings.business_updated",
    resourceType: "setting",
    resourceId: "business",
    ipAddress: clientIpFromHeaders(await headers()),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/connect");
  return { success: "Business details saved." };
}

export async function saveBrandingSettingsAction(
  _prev: SettingsOpState,
  formData: FormData
): Promise<SettingsOpState> {
  const profile = await requireRole("super_admin");

  const websiteTitle = String(formData.get("websiteTitle") ?? "").trim().slice(0, 120);
  if (!websiteTitle) return { error: "Website title is required." };

  const value = {
    websiteTitle,
    logoUrl: String(formData.get("logoUrl") ?? "").trim().slice(0, 300),
    primaryColor: String(formData.get("primaryColor") ?? "").trim(),
    secondaryColor: String(formData.get("secondaryColor") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim().slice(0, 300),
  };

  if (value.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(value.primaryColor)) {
    return { error: "Primary color must be a hex code like #16a34a." };
  }
  if (value.secondaryColor && !/^#[0-9a-fA-F]{6}$/.test(value.secondaryColor)) {
    return { error: "Secondary color must be a hex code like #052e16." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .upsert({ key: "branding", value }, { onConflict: "key" });
  if (error) return { error: "Could not save branding." };

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "settings.branding_updated",
    resourceType: "setting",
    resourceId: "branding",
    ipAddress: clientIpFromHeaders(await headers()),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { success: "Branding saved." };
}

export async function saveNotificationSettingsAction(
  _prev: SettingsOpState,
  formData: FormData
): Promise<SettingsOpState> {
  const profile = await requireRole("super_admin");

  // Preserve existing values for channels whose credentials aren't configured.
  const admin = createAdminClient();
  const current = await readSetting(admin, "notifications");

  const value = {
    emailEnabled: formData.get("emailEnabled") === "on",
    smsEnabled: formData.get("smsEnabled") === "on",
    whatsappEnabled: formData.get("whatsappEnabled") === "on",
    telegramEnabled: formData.get("telegramEnabled") === "on",
    ...(typeof current.adminAlertEmail === "string" ? { adminAlertEmail: current.adminAlertEmail } : {}),
  };

  const { error } = await admin
    .from("settings")
    .upsert({ key: "notifications", value }, { onConflict: "key" });
  if (error) return { error: "Could not save notification preferences." };

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "settings.notifications_updated",
    resourceType: "setting",
    resourceId: "notifications",
    metadata: value,
    ipAddress: clientIpFromHeaders(await headers()),
  });

  revalidatePath("/admin/settings");
  return { success: "Notification preferences saved." };
}
