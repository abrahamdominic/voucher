import { randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";

import type { Order } from "@/types/database";

/** Human-friendly unique order reference, e.g. NKW-7F3K9Q. */
function generateOrderReference(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("").slice(0, 6);
  return `NKW-${code}`;
}

export interface CreateOrderResult {
  ok: boolean;
  order?: Order;
  error?: string;
}

/**
 * Creates a pending order + payment record.
 * SECURITY: the price is always recomputed server-side from the plan table —
 * the browser never gets to state an amount.
 */
export async function createPendingOrder(params: {
  planId: string;
  phone: string;
  email: string;
  ip?: string;
}): Promise<CreateOrderResult> {
  const admin = createAdminClient();

  // Validate plan still exists and is active; take authoritative price.
  const { data: plan } = await admin.from("plans").select("*").eq("id", params.planId).maybeSingle();
  if (!plan) return { ok: false, error: "This plan is no longer available." };
  if (!plan.is_active) return { ok: false, error: "This plan is currently unavailable." };

  const reference = generateOrderReference();
  const transactionRef = `${reference}-${randomBytes(4).toString("hex")}`;

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      reference,
      plan_id: plan.id,
      plan_name: plan.name,
      plan_duration_hours: plan.duration_hours,
      amount_kobo: plan.price_kobo,
      phone: params.phone,
      email: params.email,
      status: "pending",
      payment_provider: getPaymentProvider().name,
      metadata: {},
      ip_address: params.ip ?? null,
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error("[orders] create failed:", orderError?.message);
    return { ok: false, error: "Could not start your order. Please try again." };
  }

  await admin.from("order_items").insert({
    order_id: order.id,
    plan_id: plan.id,
    description: `${plan.name} Wi-Fi access (${plan.duration_hours}h)`,
    quantity: 1,
    unit_price_kobo: plan.price_kobo,
  });

  const { data: payment } = await admin
    .from("payments")
    .insert({
      order_id: order.id,
      transaction_ref: transactionRef,
      provider: getPaymentProvider().name,
      amount_kobo: plan.price_kobo,
      currency: "NGN",
      status: "pending",
    })
    .select()
    .single();

  if (!payment) {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return { ok: false, error: "Could not start your order. Please try again." };
  }

  return { ok: true, order };
}

export interface InitializeResultOk {
  ok: boolean;
  authorizationUrl?: string;
  error?: string;
}

/**
 * Initializes the gateway transaction for a pending order and stores the
 * provider reference. Idempotent-ish: if already initialized with an auth URL
 * stored in metadata we reuse it to avoid duplicate charges.
 */
export async function initializePaymentForOrder(order: Order): Promise<InitializeResultOk> {
  const admin = createAdminClient();
  const provider = getPaymentProvider();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callbackUrl = `${siteUrl}/success/${order.reference}`;

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("order_id", order.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return { ok: false, error: "No pending payment found for this order." };
  }

  const result = await provider.initializePayment({
    order,
    payment: { transaction_ref: payment.transaction_ref, amount_kobo: payment.amount_kobo },
    callbackUrl,
    customer: { email: order.email, phone: order.phone },
  });

  if (!result.ok || !result.authorizationUrl) {
    return { ok: false, error: result.error ?? "Could not reach the payment gateway." };
  }

  await admin
    .from("payments")
    .update({ provider_reference: result.providerReference ?? payment.provider_reference })
    .eq("id", payment.id);

  await admin
    .from("orders")
    .update({ provider_reference: result.providerReference ?? null })
    .eq("id", order.id);

  return { ok: true, authorizationUrl: result.authorizationUrl };
}

/** Public-safe order lookup by reference (no internal IDs). */
export async function getPublicOrder(reference: string): Promise<{
  order: Order | null;
  voucherCode?: string | null;
}> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("reference", reference.toUpperCase())
    .maybeSingle();

  if (!order) return { order: null };

  let voucherCode: string | null = null;
  if (order.voucher_id) {
    const { data: voucher } = await admin
      .from("vouchers")
      .select("code")
      .eq("id", order.voucher_id)
      .maybeSingle();
    voucherCode = voucher?.code ?? null;
  }
  return { order, voucherCode };
}
