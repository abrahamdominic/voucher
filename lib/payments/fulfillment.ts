import { createAdminClient } from "@/lib/supabase/admin";

import type { NormalizedWebhook } from "./types";
import type { Payment } from "@/types/database";

export interface FulfillResult {
  ok: boolean;
  voucherCode?: string;
  /** true when the event had already been processed (webhook replay). */
  replay?: boolean;
  error?: string;
}

/**
 * Records a webhook event in the idempotency ledger.
 * Returns false when the event has already been recorded (replay).
 */
export async function recordWebhookEvent(
  provider: string,
  eventRef: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_events")
    .insert({ provider, event_ref: eventRef, payload })
    .select("id")
    .single();

  if (error) {
    // unique_violation → already seen this exact event
    if ((error as { code?: string }).code === "23505") return false;
    throw error;
  }
  return data != null;
}

export async function findPaymentByTransactionRef(
  transactionRef: string
): Promise<Payment | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("payments")
    .select("*")
    .eq("transaction_ref", transactionRef)
    .maybeSingle();
  return data ?? null;
}

/**
 * Runs the atomic fulfillment transaction:
 * payment → successful, order → paid, voucher allocated, notifications queued,
 * audit logged. Idempotent at the DB level.
 */
export async function fulfillSuccessfulPayment(
  paymentId: string,
  meta: { method?: string; channel?: string; providerReference?: string; raw?: Record<string, unknown> } = {}
): Promise<FulfillResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_successful_payment", {
    p_payment_id: paymentId,
    p_method: meta.method ?? null,
    p_channel: meta.channel ?? null,
    p_provider_reference: meta.providerReference ?? null,
    p_raw: meta.raw ?? null,
  });

  if (error) {
    console.error("[fulfillment] process_successful_payment failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, voucherCode: (data as unknown as string) ?? undefined };
}

export async function markPaymentFailed(paymentId: string, reason: string): Promise<void> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .update({
      status: "failed",
      failure_reason: reason.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("status", "pending") // never clobber refunded/successful states
    .select("order_id")
    .single();

  if (!payment) return;

  await admin.from("orders").update({ status: "failed" }).eq("id", payment.order_id).eq("status", "pending");
}

/**
 * Handles a normalized webhook end-to-end with full idempotency:
 *   ledger check → payment lookup → amount validation → fulfillment.
 */
export async function processProviderWebhook(
  providerName: string,
  webhook: NormalizedWebhook
): Promise<{ handled: boolean; status: number; result?: FulfillResult }> {
  const isNew = await recordWebhookEvent(providerName, webhook.eventId, webhook.raw);
  if (!isNew) {
    return { handled: true, status: 200 }; // replay → acknowledge without side effects
  }

  if (!webhook.reference || webhook.eventType !== "charge.success") {
    return { handled: true, status: 200 };
  }

  const payment = await findPaymentByTransactionRef(webhook.reference);
  if (!payment) {
    console.warn(`[webhook] unknown reference ${webhook.reference}`);
    return { handled: true, status: 200 };
  }

  // Amount tamper-check against the gateway's own numbers.
  if (
    typeof webhook.amountKobo === "number" &&
    webhook.amountKobo < payment.amount_kobo
  ) {
    await markPaymentFailed(payment.id, `Amount mismatch: expected ${payment.amount_kobo}, got ${webhook.amountKobo}`);
    console.error(`[webhook] AMOUNT MISMATCH on payment ${payment.id} — flagged`);
    return { handled: true, status: 200 };
  }

  const result = await fulfillSuccessfulPayment(payment.id, {
    method: webhook.method,
    channel: webhook.channel,
    providerReference: webhook.reference,
    raw: webhook.raw,
  });
  return { handled: result.ok, status: 200, result };
}
