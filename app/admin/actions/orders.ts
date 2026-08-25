"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { dispatchPendingNotifications } from "@/lib/notifications";

export interface RetryState {
  error?: string;
  success?: string;
}

/**
 * Manually retries voucher allocation for a paid order whose fulfillment
 * failed (e.g. Wi-Fi provider outage). Idempotent: allocation is skipped when
 * the order already has a voucher.
 */
export async function retryVoucherAllocation(_prev: RetryState, formData: FormData): Promise<RetryState> {
  const profile = await requireRole("admin");

  const reference = String(formData.get("reference") ?? "");
  if (!reference) return { error: "Missing order reference." };

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("reference", reference).maybeSingle();
  if (!order) return { error: "Order not found." };

  if (order.status === "pending") return { error: "Payment is still pending — cannot allocate." };
  if (order.status !== "paid") return { error: `Order is ${order.status}; only paid orders can be fulfilled.` };
  if (order.voucher_id) return { success: "A voucher is already allocated." };

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  const { data, error: rpcError } = await admin.rpc("allocate_voucher_for_order", {
    p_order_id: order.id,
  });

  if (rpcError || !data?.length) {
    console.error("[orders] manual allocation failed:", rpcError?.message);
    await logAudit({
      actorId: profile.id,
      actorEmail: profile.email,
      action: "voucher.allocation_retry_failed",
      resourceType: "order",
      resourceId: reference,
      metadata: { error: rpcError?.message ?? "unknown" },
      ipAddress: ip,
    });
    return { error: "Allocation failed again. The team has been notified." };
  }

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "voucher.allocation_retried",
    resourceType: "order",
    resourceId: reference,
    metadata: { voucher_code: data[0]?.allocated_voucher_code },
    ipAddress: ip,
  });
  void dispatchPendingNotifications().catch(() => {});

  revalidatePath(`/admin/orders/${reference}`);
  return { success: `Voucher ${data[0]?.allocated_voucher_code} allocated.` };
}
