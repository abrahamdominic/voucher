"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createPendingOrder, initializePaymentForOrder } from "@/lib/orders/service";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validation";

export interface CheckoutState {
  error?: string;
}

export async function initiateCheckout(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse({
    planId: formData.get("planId"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  // Rate-limit checkout attempts per IP: 10 per 5 minutes.
  const limited = rateLimit(`checkout:${ip}`, 10, 300);
  if (!limited.ok) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const { planId, phone, email } = parsed.data;

  // Server-side price recalculation & pending order creation.
  const created = await createPendingOrder({ planId, phone, email, ip });
  if (!created.ok || !created.order) {
    return { error: created.error ?? "Could not start your order." };
  }

  // Initialize the gateway transaction.
  const initialized = await initializePaymentForOrder(created.order);
  if (!initialized.ok || !initialized.authorizationUrl) {
    return { error: initialized.error ?? "Payment could not be started. Please try again." };
  }

  redirect(initialized.authorizationUrl);
}
