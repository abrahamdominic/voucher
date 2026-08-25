import { NextResponse } from "next/server";

import { dispatchPendingNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Drains the notification queue (retry failed sends). Intended for a platform
 * scheduler (e.g. Vercel Cron) hitting this route every few minutes.
 *
 * Protect with CRON_SECRET: set the header `Authorization: Bearer ${CRON_SECRET}`.
 * When CRON_SECRET is unset (local dev) requests are allowed.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await dispatchPendingNotifications(50);
    // Opportunistically expire vouchers while a scheduler is around.
    let expired = 0;
    if (!secret || request.headers.get("x-expire-vouchers") === "1") {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      if (admin) {
        const { data } = await admin.rpc("expire_due_vouchers");
        expired = typeof data === "number" ? data : 0;
      }
    }
    return NextResponse.json({ ok: true, ...result, expired });
  } catch (error) {
    console.error("[cron/notifications] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Drain failed" }, { status: 500 });
  }
}
