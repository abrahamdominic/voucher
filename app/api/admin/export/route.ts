import { type NextRequest } from "next/server";

import { getProfile, hasRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOrderFilters } from "@/lib/admin/orders";
import { rateLimit } from "@/lib/rate-limit";
import { formatNaira } from "@/lib/format";
import type { OrderStatus, VoucherStatus } from "@/types/database";

export const dynamic = "force-dynamic";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

const EXPORTABLE = ["orders", "payments", "customers", "vouchers", "analytics"] as const;
type ExportType = (typeof EXPORTABLE)[number];

/** CSV exports for authorized admins; current filters are applied. */
export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  // Staff may export vouchers only (their operational scope).
  const type = (request.nextUrl.searchParams.get("type") ?? "") as ExportType;
  if (!EXPORTABLE.includes(type)) {
    return new Response("Unknown export type", { status: 400 });
  }
  if (type !== "vouchers" && !hasRole(profile, "admin")) {
    return new Response("Forbidden", { status: 403 });
  }

  const ip = request.headers.get("x-real-ip") ?? "unknown";
  const limited = rateLimit(`export:${profile.id}`, 10, 300);
  if (!limited.ok) return new Response("Too many requests", { status: 429 });
  void ip;

  const admin = createAdminClient();
  const sp = request.nextUrl.searchParams;

  let rows: Record<string, unknown>[] = [];

  if (type === "orders") {
    const filters = parseOrderFilters(Object.fromEntries(sp.entries()));
    let q = admin
      .from("orders")
      .select("*, vouchers(code)")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (filters.status) q = q.eq("status", filters.status as OrderStatus);
    if (filters.planId) q = q.eq("plan_id", filters.planId);
    if (filters.from) q = q.gte("created_at", new Date(filters.from).toISOString());
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      q = q.lte("created_at", to.toISOString());
    }
    if (filters.q) {
      const like = `%${filters.q.replace(/[%_,]/g, "")}%`;
      q = q.or(`reference.ilike.${like},phone.ilike.${like},email.ilike.${like}`);
    }
    const { data } = await q;
    rows = (data ?? []).map((o) => ({
      reference: o.reference,
      plan: o.plan_name,
      amount: formatNaira(Number(o.amount_kobo)),
      status: o.status,
      phone: o.phone,
      email: o.email,
      voucher: o.vouchers?.code ?? "",
      created_at: o.created_at,
      paid_at: o.paid_at ?? "",
    }));
  } else if (type === "payments") {
    const { data } = await admin
      .from("payments")
      .select("transaction_ref, provider_reference, provider, method, channel, amount_kobo, currency, status, verified_at, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    rows = (data ?? []).map((p) => ({ ...p, amount_kobo: Number(p.amount_kobo) }));
  } else if (type === "customers") {
    const { data } = await admin
      .from("customers")
      .select("phone, email, name, total_orders, total_spent_kobo, last_order_at, first_seen_at, status")
      .order("last_order_at", { ascending: false })
      .limit(10000);
    rows = (data ?? []).map((c) => ({ ...c, total_spent_kobo: Number(c.total_spent_kobo) }));
  } else if (type === "vouchers") {
    let q = admin
      .from("vouchers")
      .select("code, plans(name), source, status, duration_hours, customer_phone, customer_email, activated_at, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20000);
    const status = sp.get("status");
    if (status) q = q.eq("status", status as VoucherStatus);
    const search = sp.get("q") || sp.get("search");
    if (search) q = q.or(`code.ilike.%${search.replace(/[%_,]/g, "")}%,customer_phone.ilike.${search}`);
    const { data } = await q;
    rows = (data ?? []).map((v) => ({
      code: v.code,
      plan: v.plans?.name ?? "",
      source: v.source,
      status: v.status,
      duration_hours: v.duration_hours,
      customer_phone: v.customer_phone ?? "",
      customer_email: v.customer_email ?? "",
      activated_at: v.activated_at ?? "",
      expires_at: v.expires_at ?? "",
      created_at: v.created_at,
    }));
  } else if (type === "analytics") {
    const { data } = await admin
      .from("orders")
      .select("reference, plan_name, amount_kobo, status, created_at, paid_at")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(10000);
    rows = data ?? [];
  }

  const csv = toCsv(rows);
  const filename = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  await import("@/lib/audit").then(({ logAudit }) =>
    logAudit({
      actorId: profile.id,
      actorEmail: profile.email,
      action: "data.exported",
      resourceType: type,
      metadata: { rows: rows.length },
    })
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
