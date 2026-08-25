import { NextResponse, type NextRequest } from "next/server";

import { getPublicOrder } from "@/lib/orders/service";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

/**
 * Queues an email receipt for an order. Scoped by requiring the reference to
 * exist; the recipient is always the email captured on the order — never a
 * client-supplied address.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit(`receipt-email:${ip}`, 5, 600);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { reference?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const { order } = await getPublicOrder(body.reference);
  if (!order || order.status !== "paid") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { error } = await admin.from("notifications").insert({
    type: "payment_success",
    channel: "email",
    recipient: order.email,
    subject: `Receipt for order ${order.reference}`,
    body: `Thank you for your purchase.\n\nOrder: ${order.reference}\nPlan: ${order.plan_name}\nAmount: ₦${(order.amount_kobo / 100).toFixed(2)}\nStatus: Paid\nDate: ${new Date(order.created_at).toLocaleString("en-NG")}`,
    related_type: "order",
    related_id: order.id,
  });

  if (error) {
    console.error("[receipt-email] queue failed:", error.message);
    return NextResponse.json({ error: "Could not queue email" }, { status: 500 });
  }

  void import("@/lib/notifications").then((m) => m.dispatchPendingNotifications()).catch(() => {});

  return NextResponse.json({ ok: true });
}
