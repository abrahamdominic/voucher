"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { getPaymentProvider } from "@/lib/payments";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/rate-limit";

export interface RefundState {
  error?: string;
  success?: string;
}

/**
 * Refund flow (spec §42):
 *  1. Admin-only permission check (staff cannot refund).
 *  2. Gateway refund initiated server-side.
 *  3. Payment + order marked refunded; unused voucher revoked.
 *  4. Active vouchers require explicit confirmation from an authorized admin.
 *  5. Everything is audit logged; never triggered by frontend alone.
 */
export async function refundOrder(_prev: RefundState, formData: FormData): Promise<RefundState> {
  const profile = await requireRole("admin");

  const reference = String(formData.get("reference") ?? "");
  const confirmActive = formData.get("confirmActive") === "on";
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reference) return { error: "Missing order reference." };
  if (reason.length < 3) return { error: "A reason is required." };

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("reference", reference).maybeSingle();
  if (!order) return { error: "Order not found." };
  if (order.status !== "paid") return { error: `Only paid orders can be refunded (current: ${order.status}).` };

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("order_id", order.id)
    .eq("status", "successful")
    .limit(1)
    .maybeSingle();
  if (!payment) return { error: "No successful payment found for this order." };

  // Voucher state guard
  let voucherStatus: string | null = null;
  if (order.voucher_id) {
    const { data: voucher } = await admin
      .from("vouchers")
      .select("status")
      .eq("id", order.voucher_id)
      .single();
    voucherStatus = voucher?.status ?? null;

    if (["active", "used"].includes(voucherStatus ?? "") && !confirmActive) {
      return {
        error:
          "This order's voucher is already in use. Tick “voucher already used” to confirm the refund anyway.",
      };
    }
  }

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  // Gateway-side refund when the provider supports it.
  const provider = getPaymentProvider();
  if (payment.provider_reference && provider.refund) {
    const result = await provider.refund(payment.provider_reference);
    if (!result.ok) {
      return { error: `Gateway refused the refund: ${result.error ?? "unknown error"}` };
    }
    await admin
      .from("payments")
      .update({ refund_reference: result.reference ?? null })
      .eq("id", payment.id);
  }

  // DB updates
  await admin.from("payments").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", payment.id);
  await admin
    .from("orders")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", order.id);

  if (order.voucher_id && ["available", "issued", "reserved"].includes(voucherStatus ?? "")) {
    await admin.from("vouchers").update({ status: "revoked" }).eq("id", order.voucher_id);
  }

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "payment.refunded",
    resourceType: "order",
    resourceId: order.reference,
    metadata: { reason, amount_kobo: order.amount_kobo, voucher_status: voucherStatus },
    ipAddress: ip,
  });

  revalidatePath(`/admin/orders/${reference}`);
  revalidatePath("/admin/orders");
  return { success: "Refund completed." };
}
