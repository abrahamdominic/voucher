import { config } from "@/lib/config";

import { MockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./types";
import { PaystackProvider } from "./paystack";

/**
 * Resolves the configured payment provider from PAYMENT_PROVIDER env var.
 * Falls back to the mock provider so local development works out of the box.
 */
export function getPaymentProvider(): PaymentProvider {
  switch (config.paymentProvider) {
    case "paystack":
      if (!config.paystackSecretKey) {
        console.warn("[payments] PAYMENT_PROVIDER=paystack but PAYSTACK_SECRET_KEY missing — using mock.");
        return new MockPaymentProvider();
      }
      return new PaystackProvider();
    case "mock":
    default:
      return new MockPaymentProvider();
  }
}

export type { PaymentProvider } from "./types";
