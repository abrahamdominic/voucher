import { config } from "@/lib/config";

import type {
  InitializeParams,
  InitializeResult,
  NormalizedWebhook,
  PaymentProvider,
  RefundResult,
  VerifyResult,
} from "./types";

/**
 * Mock payment provider for local development and demos.
 * - "Gateway" is an internal page (/pay/mock/[reference]) that simulates
 *   success/failure.
 * - Completion flows through the exact same idempotent fulfillment pipeline
 *   (webhook_events ledger + process_successful_payment) as Paystack, so the
 *   production code paths are exercised end-to-end without real money.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async initializePayment({ payment, callbackUrl }: InitializeParams): Promise<InitializeResult> {
    return {
      ok: true,
      authorizationUrl: `/pay/mock/${payment.transaction_ref}?callback=${encodeURIComponent(callbackUrl)}`,
      providerReference: payment.transaction_ref,
    };
  }

  async verifyPayment(): Promise<VerifyResult> {
    // Mock fulfillment happens synchronously through /api/mock-pay/complete;
    // verification therefore reports the current DB state via pending here.
    return { status: "pending" };
  }

  verifyWebhookSignature(_headers: Headers, _rawBody: string): boolean {
    // Only meaningful when the mock provider is explicitly enabled.
    return config.paymentProvider === "mock";
  }

  extractWebhookEvent(rawBody: string): NormalizedWebhook | null {
    try {
      const parsed = JSON.parse(rawBody) as { reference?: string; outcome?: string };
      if (!parsed.reference) return null;
      return {
        eventId: `mock-${parsed.reference}`,
        eventType: parsed.outcome === "success" ? "charge.success" : "charge.failed",
        reference: parsed.reference,
        raw: parsed as unknown as Record<string, unknown>,
      };
    } catch {
      return null;
    }
  }

  async refund(): Promise<RefundResult> {
    // Simulated gateway accepts all refunds; DB state is updated by caller.
    return { ok: true, reference: `MOCK-REFUND-${Date.now()}` };
  }
}
