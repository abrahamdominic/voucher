import { NextResponse, type NextRequest } from "next/server";

import {
  findPaymentByTransactionRef,
  markPaymentFailed,
  processProviderWebhook,
} from "@/lib/payments/fulfillment";
import { config } from "@/lib/config";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

/**
 * Mock-gateway completion endpoint.
 * Only active while PAYMENT_PROVIDER=mock. It flows through the exact same
 * idempotent fulfillment pipeline (webhook ledger + process_successful_payment)
 * as a real provider webhook, so dev/demo behaves like production.
 */
export async function POST(request: NextRequest) {
  if (config.paymentProvider !== "mock") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit(`mock-pay:${ip}`, 30, 300);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { reference?: string; outcome?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const reference = body.reference;
  const outcome = body.outcome === "success" ? "success" : "failed";
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  // Route through the shared webhook pipeline for full parity + idempotency.
  await processProviderWebhook("mock", {
    eventId: `mock-${reference}`,
    eventType: outcome === "success" ? "charge.success" : "charge.failed",
    reference,
    raw: { reference, outcome },
  });

  const payment = await findPaymentByTransactionRef(reference);
  if (!payment) {
    return NextResponse.json({ error: "Unknown reference" }, { status: 404 });
  }

  if (outcome === "failed" && payment.status === "pending") {
    await markPaymentFailed(payment.id, "Customer cancelled / simulated failure");
  }

  // Fire-and-forget notification dispatch.
  void import("@/lib/notifications").then((m) => m.dispatchPendingNotifications()).catch(() => {});

  return NextResponse.json({ ok: true, status: outcome });
}
