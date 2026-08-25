import { NextResponse, type NextRequest } from "next/server";

import { getPaymentProvider } from "@/lib/payments";
import { processProviderWebhook } from "@/lib/payments/fulfillment";
import { dispatchPendingNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Payment provider webhook.
 *
 * Security model:
 *  1. HMAC signature verification (x-paystack-signature) against the raw body.
 *  2. Idempotency ledger — replays are acknowledged with 200 but never
 *     re-processed (no duplicate orders/vouchers/charges).
 *  3. Amount validation against the payment record before fulfillment.
 *  4. Fulfillment runs in a single DB transaction (process_successful_payment).
 *
 * Always returns 200 for recognized events so the provider stops retrying;
 * unexpected payloads return 400.
 */
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();

  const rawBody = await request.text();

  if (!provider.verifyWebhookSignature(request.headers, rawBody)) {
    console.warn("[webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = provider.extractWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Unrecognized payload" }, { status: 400 });
  }

  try {
    const result = await processProviderWebhook(provider.name, event);
    if (!result.handled) {
      return NextResponse.json({ error: "Could not process" }, { status: 400 });
    }

    // Best-effort notification drain after successful fulfillment.
    if (result.result?.ok) void dispatchPendingNotifications().catch(() => {});

    return NextResponse.json({ received: true });
  } catch (error) {
    // Return 500 so the gateway retries; the idempotency ledger keeps this safe.
    console.error("[webhook] processing failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
