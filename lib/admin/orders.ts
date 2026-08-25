import { createAdminClient } from "@/lib/supabase/admin";

import type { Order, OrderStatus } from "@/types/database";

export interface OrderFilters {
  q?: string;
  status?: string;
  planId?: string;
  from?: string;
  to?: string;
  page: number;
  perPage: number;
}

export const ORDER_STATUSES: OrderStatus[] = ["pending", "paid", "failed", "cancelled", "refunded"];

export function parseOrderFilters(params: Record<string, string | string[] | undefined>): OrderFilters {
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string).trim() : undefined);
  return {
    q: get("q") || undefined,
    status: get("status") || undefined,
    planId: get("plan") || undefined,
    from: get("from") || undefined,
    to: get("to") || undefined,
    page: Math.max(1, Number.parseInt(get("page") ?? "1", 10) || 1),
    perPage: 20,
  };
}

export async function queryOrders(filters: OrderFilters): Promise<{
  orders: (Order & { voucher_code: string | null; plan_display_name: string | null })[];
  total: number;
}> {
  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select(
      "*, vouchers(code), plans(name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((filters.page - 1) * filters.perPage, filters.page * filters.perPage - 1);

  if (filters.status && ORDER_STATUSES.includes(filters.status as OrderStatus)) {
    query = query.eq("status", filters.status as OrderStatus);
  }
  if (filters.planId) query = query.eq("plan_id", filters.planId);
  if (filters.from) query = query.gte("created_at", new Date(filters.from).toISOString());
  if (filters.to) {
    const to = new Date(filters.to);
    to.setHours(23, 59, 59, 999);
    query = query.lte("created_at", to.toISOString());
  }
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_,]/g, "")}%`;
    query = query.or(
      `reference.ilike.${like},phone.ilike.${like},email.ilike.${like},provider_reference.ilike.%${filters.q.replace(/[%_,]/g, "")}%`
    );
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("[orders] query failed:", error.message);
    return { orders: [], total: 0 };
  }

  const rows = (data ?? []).map((row) => {
    const order = row as unknown as Order & {
      vouchers: { code: string } | null;
      plans: { name: string } | null;
    };
    return {
      ...order,
      voucher_code: order.vouchers?.code ?? null,
      plan_display_name: order.plans?.name ?? order.plan_name,
    };
  });

  return { orders: rows, total: count ?? 0 };
}

export interface PlanOption {
  id: string;
  name: string;
}

export async function getPlanOptions(): Promise<PlanOption[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("plans").select("id, name").order("display_order");
  return data ?? [];
}

/** Builds a URL with the given filters preserved. */
export function buildFilterUrl(basePath: string, filters: Partial<OrderFilters>, overrides: Record<string, string> = {}): string {
  const search = new URLSearchParams();
  if (filters.q) search.set("q", filters.q);
  if (filters.status) search.set("status", filters.status);
  if (filters.planId) search.set("plan", filters.planId);
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  for (const [key, value] of Object.entries(overrides)) search.set(key, value);
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
