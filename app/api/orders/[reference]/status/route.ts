import { NextResponse } from "next/server";

import { getPublicOrder } from "@/lib/orders/service";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public order-status endpoint used by the success page while a payment is
 * confirming / a voucher is being allocated. Returns only safe fields.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/orders/[reference]/status">
) {
  const { reference } = await ctx.params;

  const limited = rateLimit(`status:${reference}`, 120, 300);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { order, voucherCode } = await getPublicOrder(reference);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    reference: order.reference,
    status: order.status,
    planName: order.plan_name,
    amountKobo: order.amount_kobo,
    durationHours: order.plan_duration_hours,
    voucherCode,
  });
}
