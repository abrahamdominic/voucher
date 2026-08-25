import { createHmac, timingSafeEqual } from "node:crypto";

import { config } from "@/lib/config";

import type {
  InitializeParams,
  InitializeResult,
  NormalizedWebhook,
  PaymentProvider,
  RefundResult,
  VerifyResult,
} from "./types";

const PAYSTACK_BASE = "https://api.paystack.co";

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string; // success | failed | abandoned | pending
    reference: string;
    amount: number; // kobo
    channel?: string;
    authorization?: { channel?: string; card_type?: string; bank?: string; last4?: string } | null;
    currency: string;
  };
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.paystackSecretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return (await res.json()) as T;
}

export class PaystackProvider implements PaymentProvider {
  readonly name = "paystack";

  async initializePayment({
    order,
    payment,
    callbackUrl,
  }: InitializeParams): Promise<InitializeResult> {
    try {
      const data = await paystackFetch<PaystackInitResponse>("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: order.email,
          amount: payment.amount_kobo, // Paystack expects kobo
          currency: "NGN",
          reference: payment.transaction_ref,
          callback_url: callbackUrl,
          metadata: {
            order_reference: order.reference,
            plan_name: order.plan_name,
            phone: order.phone,
          },
        }),
      });

      if (!data.status || !data.data?.authorization_url) {
        return { ok: false, error: data.message || "Payment initialization failed" };
      }

      return {
        ok: true,
        authorizationUrl: data.data.authorization_url,
        providerReference: data.data.reference,
      };
    } catch (error) {
      console.error("[paystack] initialize failed:", error instanceof Error ? error.message : error);
      return { ok: false, error: "Payment provider is unreachable. Please try again." };
    }
  }

  async verifyPayment(reference: string): Promise<VerifyResult> {
    try {
      const data = await paystackFetch<PaystackVerifyResponse>(
        `/transaction/verify/${encodeURIComponent(reference)}`
      );

      if (!data.status) {
        return { status: "pending", error: data.message };
      }

      const d = data.data;
      const method =
        d.authorization?.card_type ??
        d.authorization?.bank ??
        undefined;

      if (d.status === "success") {
        return {
          status: "successful",
          amountKobo: d.amount,
          method,
          channel: d.channel,
          providerReference: d.reference,
          raw: d as unknown as Record<string, unknown>,
        };
      }
      if (d.status === "failed") {
        return {
          status: "failed",
          amountKobo: d.amount,
          providerReference: d.reference,
          raw: d as unknown as Record<string, unknown>,
        };
      }
      // abandoned / ongoing / pending
      return { status: "pending", providerReference: d.reference };
    } catch (error) {
      console.error("[paystack] verify failed:", error instanceof Error ? error.message : error);
      return { status: "pending", error: "Verification temporarily unavailable" };
    }
  }

  /**
   * Webhook authenticity: x-paystack-signature is an HMAC-SHA512 of the raw
   * request body keyed with the secret key.
   */
  verifyWebhookSignature(headers: Headers, rawBody: string): boolean {
    const signature = headers.get("x-paystack-signature");
    if (!signature || !config.paystackSecretKey) return false;

    const expected = createHmac("sha512", config.paystackSecretKey)
      .update(rawBody)
      .digest("hex");

    const a = Buffer.from(signature, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  extractWebhookEvent(rawBody: string): NormalizedWebhook | null {
    let parsed: {
      event?: string;
      data?: {
        reference?: string;
        amount?: number;
        id?: number;
        channel?: string;
        authorization?: { channel?: string; card_type?: string; bank?: string };
      };
    };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (!parsed.event || !parsed.data) return null;

    return {
      eventId: String(parsed.data.id ?? parsed.data.reference ?? crypto.randomUUID()),
      eventType: parsed.event,
      reference: parsed.data.reference,
      amountKobo: parsed.data.amount,
      method:
        parsed.data.authorization?.card_type ?? parsed.data.authorization?.bank ?? undefined,
      channel: parsed.data.authorization?.channel ?? parsed.data.channel,
      raw: parsed as unknown as Record<string, unknown>,
    };
  }

  async refund(providerReference: string, _amountKobo?: number): Promise<RefundResult> {
    try {
      const data = await paystackFetch<{ status: boolean; message: string; data?: { id?: number } }>(
        "/refund",
        { method: "POST", body: JSON.stringify({ transaction: providerReference }) }
      );
      if (!data.status) return { ok: false, error: data.message };
      return { ok: true, reference: data.data?.id != null ? String(data.data.id) : undefined };
    } catch (error) {
      console.error("[paystack] refund failed:", error instanceof Error ? error.message : error);
      return { ok: false, error: "Refund request failed" };
    }
  }
}
