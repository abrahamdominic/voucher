import { createAdminClient } from "@/lib/supabase/admin";

export interface DashboardStats {
  todayRevenueKobo: number;
  todayOrders: number;
  activeVouchers: number;
  availableVouchers: number;
  expiredVouchers: number;
  customers: number;
  conversionRate: number; // paid / all orders %
}

export interface TimeSeriesPoint {
  label: string;
  revenue: number; // naira
  orders: number;
}

export interface PlanSlice {
  name: string;
  count: number;
}

export type StatsRange = "today" | "7d" | "30d" | "90d" | "12m" | "custom";

export function rangeToInterval(range: string, from?: string, to?: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "7d":
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case "90d":
      start.setMonth(start.getMonth() - 3);
      break;
    case "12m":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "custom":
      return {
        start: from ? new Date(from) : new Date(Date.now() - 30 * 86400_000),
        end: to ? new Date(to) : end,
      };
    default:
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

/** Lazily flips expired vouchers so counts stay honest. */
async function expireDue(): Promise<void> {
  try {
    await createAdminClient().rpc("expire_due_vouchers");
  } catch {
    // non-fatal
  }
}

export async function getDashboardStats(range: string, from?: string, to?: string): Promise<DashboardStats> {
  await expireDue();
  const admin = createAdminClient();
  const { start } = rangeToInterval(range, from, to);
  const startIso = start.toISOString();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [ordersToday, vouchersByStatus, customersCount, totalOrders] = await Promise.all([
    admin
      .from("orders")
      .select("amount_kobo")
      .eq("status", "paid")
      .gte("paid_at", todayStart.toISOString()),
    admin.from("vouchers").select("status"),
    admin.from("customers").select("id", { count: "exact", head: true }),
    admin
      .from("orders")
      .select("status", { count: "exact", head: true })
      .gte("created_at", startIso),
  ]);

  const statuses = new Map<string, number>();
  vouchersByStatus.data?.forEach((v) => statuses.set(v.status, (statuses.get(v.status) ?? 0) + 1));

  const { count: paidInRange } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .gte("created_at", startIso);

  const total = totalOrders.count ?? 0;
  const paid = paidInRange ?? 0;

  return {
    todayRevenueKobo: ordersToday.data?.reduce((sum, o) => sum + Number(o.amount_kobo), 0) ?? 0,
    todayOrders: ordersToday.data?.length ?? 0,
    activeVouchers: statuses.get("active") ?? 0,
    availableVouchers: (statuses.get("available") ?? 0) + (statuses.get("issued") ?? 0),
    expiredVouchers: statuses.get("expired") ?? 0,
    customers: customersCount.count ?? 0,
    conversionRate: total > 0 ? Math.round((paid / total) * 100) : 0,
  };
}

export async function getRevenueTimeseries(range: string, from?: string, to?: string): Promise<TimeSeriesPoint[]> {
  const admin = createAdminClient();
  const { start, end } = rangeToInterval(range, from, to);

  const { data: paidOrders } = await admin
    .from("orders")
    .select("paid_at, amount_kobo")
    .eq("status", "paid")
    .gte("paid_at", start.toISOString())
    .lte("paid_at", end.toISOString())
    .limit(20000);

  if (!paidOrders) return [];

  // Bucket by day.
  const buckets = new Map<string, { revenue: number; orders: number }>();
  const cursor = new Date(start);
  while (cursor <= end) {
    buckets.set(cursor.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const order of paidOrders) {
    if (!order.paid_at) continue;
    const day = order.paid_at.slice(0, 10);
    const bucket = buckets.get(day);
    if (bucket) {
      bucket.revenue += Number(order.amount_kobo) / 100;
      bucket.orders += 1;
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({
      label: label.slice(5),
      ...v,
    }));
}

export async function getPopularPlans(limit = 5): Promise<PlanSlice[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("plan_name")
    .eq("status", "paid")
    .limit(10000);

  if (!data) return [];
  const counts = new Map<string, number>();
  data.forEach((o) => counts.set(o.plan_name, (counts.get(o.plan_name) ?? 0) + 1));
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getVoucherStatusBreakdown(): Promise<{ name: string; value: number }[]> {
  await expireDue();
  const admin = createAdminClient();
  const { data } = await admin.from("vouchers").select("status");
  if (!data) return [];
  const counts = new Map<string, number>();
  data.forEach((v) => counts.set(v.status, (counts.get(v.status) ?? 0) + 1));
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}
