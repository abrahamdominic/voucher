import type { Order, Payment } from "@/types/database";

export interface InitializeParams {
  order: Order;
  payment: Pick<Payment, "transaction_ref" | "amount_kobo">;
  callbackUrl: string;
  customer: { email: string; phone: string };
}

export interface InitializeResult {
  ok: boolean;
  /** Where to send the customer to complete payment. */
  authorizationUrl?: string;
  /** Gateway-side reference (may differ from our transaction_ref). */
  providerReference?: string;
  error?: string;
}

export interface VerifyResult {
  status: "successful" | "failed" | "pending";
  amountKobo?: number;
  method?: string;
  channel?: string;
  providerReference?: string;
  raw?: Record<string, unknown>;
  error?: string;
}

/** Normalized webhook payload used by the shared fulfillment pipeline. */
export interface NormalizedWebhook {
  /** Unique event id for idempotency (falls back to transaction reference). */
  eventId: string;
  eventType: string;
  reference?: string;
  amountKobo?: number;
  method?: string;
  channel?: string;
  raw: Record<string, unknown>;
}

export interface RefundResult {
  ok: boolean;
  reference?: string;
  error?: string;
}

/**
 * Payment gateway abstraction. Implementations must never expose secret keys
 * to the client and must support server-side verification + webhook signature
 * validation. Add Flutterwave etc. by implementing this interface.
 */
export interface PaymentProvider {
  readonly name: string;
  initializePayment(params: InitializeParams): Promise<InitializeResult>;
  verifyPayment(providerReference: string): Promise<VerifyResult>;
  /** Validate the authenticity of an inbound webhook request. */
  verifyWebhookSignature(headers: Headers, rawBody: string): boolean;
  /** Map a raw webhook body onto the normalized shape used by fulfillment. */
  extractWebhookEvent(rawBody: string): NormalizedWebhook | null;
  refund?(providerReference: string, amountKobo?: number): Promise<RefundResult>;
}
