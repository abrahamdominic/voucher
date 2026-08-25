import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  OrdersBarChart,
  PopularPlansChart,
  RevenueOrdersChart,
  VoucherStatusPie,
} from "@/components/admin/dashboard-charts";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { formatNaira } from "@/lib/format";
import {
  getDashboardStats,
  getPopularPlans,
  getRevenueTimeseries,
  getVoucherStatusBreakdown,
} from "@/lib/admin/stats";

export const metadata = { title: "Analytics" };

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "3 months" },
  { key: "12m", label: "12 months" },
];

export default async function AdminAnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireRole("admin");
  const params = await searchParams;
  const range = typeof params.range === "string" ? params.range : "30d";
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const validRange = RANGES.some((r) => r.key === range) || range === "custom" ? range : "30d";

  const [stats, series, plans, voucherStatuses] = await Promise.all([
    getDashboardStats(validRange, from, to),
    getRevenueTimeseries(validRange, from, to),
    getPopularPlans(),
    getVoucherStatusBreakdown(),
  ]);

  const rangeRevenueKobo = series.reduce((s, p) => s + p.revenue * 100, 0);
  const rangeOrders = series.reduce((s, p) => s + p.orders, 0);
  const issued = voucherStatuses
    .filter((v) => !["available", "reserved"].includes(v.name))
    .reduce((s, v) => s + v.value, 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/admin">
          <ArrowLeft data-icon="inline-start" /> Dashboard
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Sales performance and inventory health over time.</p>
      </div>

      {/* Range selector (same convention as the dashboard) */}
      <nav aria-label="Date range" className="flex flex-wrap items-center gap-1.5">
        {RANGES.map((r) => (
          <Button key={r.key} size="sm" variant={validRange === r.key ? "default" : "outline"} asChild className="rounded-full">
            <Link href={`/admin/analytics?range=${r.key}`}>{r.label}</Link>
          </Button>
        ))}
        <form action="/admin/analytics" method="get" className="ml-1 flex items-center gap-1.5">
          <input type="hidden" name="range" value="custom" />
          <input
            type="date"
            name="from"
            aria-label="From date"
            className="h-8 rounded-lg border border-input bg-input/30 px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            type="date"
            name="to"
            aria-label="To date"
            className="h-8 rounded-lg border border-input bg-input/30 px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button size="sm" variant="secondary" type="submit" className="rounded-full">
            Apply
          </Button>
        </form>
      </nav>

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={`Revenue (${validRange})`} value={formatNaira(Math.round(rangeRevenueKobo))} />
        <StatCard label={`Orders (${validRange})`} value={rangeOrders.toLocaleString()} />
        <StatCard label="Customers" value={stats.customers.toLocaleString()} />
        <StatCard label="Conversion rate" value={`${stats.conversionRate}%`} />
        <StatCard
          label="Vouchers issued"
          value={issued.toLocaleString()}
          hint={`${stats.availableVouchers.toLocaleString()} available · ${stats.expiredVouchers.toLocaleString()} expired`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueOrdersChart data={series} />
        </div>
        <PopularPlansChart data={plans} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OrdersBarChart data={series} />
        </div>
        <div className="space-y-4">
          <VoucherStatusPie data={voucherStatuses} />
          <p className="px-1 text-xs text-muted-foreground">
            {issued.toLocaleString()} vouchers issued to date · {stats.availableVouchers.toLocaleString()} available ·{" "}
            {stats.expiredVouchers.toLocaleString()} expired.
          </p>
        </div>
      </section>
    </div>
  );
}
