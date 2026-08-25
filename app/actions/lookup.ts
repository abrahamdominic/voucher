"use server";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { lookupSchema } from "@/lib/validation";

export interface LookupResultOrder {
  reference: string;
  planName: string;
  amountKobo: number;
  status: string;
  createdAt: string;
  voucherCode: string | null;
}

export interface LookupState {
  error?: string;
  orders?: LookupResultOrder[];
}

/**
 * Customer order lookup. Scoped to BOTH phone and (email or order reference)
 * so one customer can never surface another's orders. Strictly rate limited.
 */
export async function lookupOrders(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const parsed = lookupSchema.safeParse({
    phone: formData.get("phone"),
    identifier: formData.get("identifier"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);
  const limited = rateLimit(`lookup:${ip}`, 5, 600);
  if (!limited.ok) {
    return { error: `Too many attempts. Try again in ${limited.retryAfterSeconds}s.` };
  }

  const { phone, identifier } = parsed.data;
  const admin = createAdminClient();

  const identifierUpper = identifier.toUpperCase();
  const isReference = /^[A-Z0-9-]{4,40}$/.test(identifierUpper);
  const isEmail = identifier.includes("@");

  // Identifier must be either a plausible reference or an email.
  const base = admin
    .from("orders")
    .select("reference, plan_name, amount_kobo, status, created_at, voucher_id")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(10);

  let response;
  if (isReference) {
    response = await base.or(`reference.eq.${identifierUpper}${isEmail ? `,email.eq.${identifier}` : ""}`);
  } else {
    response = await base.eq("email", identifier);
  }

  const { data: orders, error } = response;
  if (error) {
    console.error("[lookup] failed:", error.message);
    return { error: "Lookup is unavailable right now. Please try again." };
  }
  if (!orders || orders.length === 0) {
    // Do not reveal whether the phone or identifier failed.
    return { orders: [] };
  }

  const voucherIds = orders.map((o) => o.voucher_id).filter((id): id is string => id != null);
  const codeById = new Map<string, string>();
  if (voucherIds.length > 0) {
    const { data: vouchers } = await admin
      .from("vouchers")
      .select("id, code")
      .in("id", voucherIds);
    vouchers?.forEach((v) => codeById.set(v.id, v.code));
  }

  return {
    orders: orders.map((o) => ({
      reference: o.reference,
      planName: o.plan_name,
      amountKobo: o.amount_kobo,
      status: o.status,
      createdAt: o.created_at,
      voucherCode: o.voucher_id ? codeById.get(o.voucher_id) ?? null : null,
    })),
  };
}
