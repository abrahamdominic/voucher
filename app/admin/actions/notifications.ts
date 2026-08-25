"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { dispatchPendingNotifications, getChannelSender } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/rate-limit";

export interface NotificationOpState {
  error?: string;
  success?: string;
}

/** Re-send one queued/failed notification immediately. */
export async function resendNotificationAction(
  _prev: NotificationOpState,
  formData: FormData
): Promise<NotificationOpState> {
  const profile = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Invalid notification." };

  const admin = createAdminClient();
  const { data: row } = await admin.from("notifications").select("*").eq("id", id).maybeSingle();
  if (!row) return { error: "Notification not found." };
  if (row.status === "sent") return { error: "Already delivered." };

  try {
    const sender = getChannelSender(row.channel);
    await sender.send({
      recipient: row.recipient,
      subject: row.subject,
      body: row.body,
    });

    const { error } = await admin
      .from("notifications")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
      .eq("id", id);
    if (error) throw new Error(error.message);

    await logAudit({
      actorId: profile.id,
      actorEmail: profile.email,
      action: "notification.resent",
      resourceType: "notification",
      resourceId: id,
      ipAddress: clientIpFromHeaders(await headers()),
    });

    revalidatePath("/admin/notifications");
    return { success: "Message re-sent." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed.";
    console.error("[notifications] resend failed:", message);
    await admin
      .from("notifications")
      .update({ status: "failed", retries: (row.retries ?? 0) + 1, error: message })
      .eq("id", id);
    revalidatePath("/admin/notifications");
    return { error: `Send failed: ${message}` };
  }
}

/** Drain up to N pending notifications through the configured senders. */
export async function drainQueueAction(): Promise<{ sent: number; failed: number }> {
  await requireRole("admin");
  const result = await dispatchPendingNotifications(50);
  revalidatePath("/admin/notifications");
  return result;
}
