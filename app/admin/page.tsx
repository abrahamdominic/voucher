import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  OrdersBarChart,
  PopularPlansChart,
  RevenueOrdersChart,
  VoucherStatusPie,
} from "@/components/admin/dashboard-charts";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNaira } from "@/lib/format";
import {
  getDashboardStats,
  getPopularPlans,
  getRevenueTimeseries,
  getVoucherStatusBreakdown,
} from "@/lib/admin/stats";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Dashboard" };

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "3 months" },
  { key: "12m", label: "12 months" },
];

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const range = typeof params.range === "string" ? params.range : "30d";
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const validRange =
    RANGES.some((r) => r.key === range) || range === "custom" ? range : "30d";

  const [stats, series, plans, voucherStatuses] = await Promise.all([
    getDashboardStats(validRange, from, to),
    getRevenueTimeseries(validRange, from, to),
    getPopularPlans(),
    getVoucherStatusBreakdown(),
  ]);

  const admin = createAdminClient();
  const { data: recentOrders } = await admin
    .from("orders")
    .select("reference, plan_name, phone, amount_kobo, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header + range selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Business overview at a glance.</p>
        </div>
        <nav aria-label="Date range" className="flex flex-wrap items-center gap-1.5">
          {RANGES.map((r) => (
            <Button key={r.key} size="sm" variant={validRange === r.key ? "default" : "outline"} asChild className="rounded-full">
              <Link href={`/admin?range=${r.key}`}>{r.label}</Link>
            </Button>
          ))}
          <form action="/admin" method="get" className="ml-1 flex items-center gap-1.5">
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
      </div>

      {/* Stats */}
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 xl:gap-4">
        <StatCard label="Today's Revenue" value={formatNaira(stats.todayRevenueKobo)} />
        <StatCard label="Today's Orders" value={String(stats.todayOrders)} />
        <StatCard label="Active Vouchers" value={String(stats.activeVouchers)} />
        <StatCard label="Available Vouchers" value={String(stats.availableVouchers)} />
        <StatCard label="Expired Vouchers" value={String(stats.expiredVouchers)} />
        <StatCard label="Customers" value={String(stats.customers)} />
      </section>

      {/* Charts row */}
      <section aria-label="Charts" className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueOrdersChart data={series} />
        </div>
        <PopularPlansChart data={plans} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Recent orders */}
          <Card className="py-0">
            <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <h2 className="text-base font-semibold">Recent orders</h2>
              <Button size="sm" variant="ghost" asChild className="gap-1 text-primary">
                <Link href="/admin/orders">
                  View all <ArrowUpRight />
                </Link>
              </Button>
            </header>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead className="hidden sm:table-cell">Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentOrders ?? []).map((o) => (
                  <TableRow key={o.reference}>
                    <TableCell>
                      <Link href={`/admin/orders/${o.reference}`} className="font-mono text-[13px] font-medium underline-offset-4 hover:underline">
                        {o.reference}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{o.plan_name}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{o.phone}</TableCell>
                    <TableCell>{formatNaira(Number(o.amount_kobo))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          o.status === "paid"
                            ? "default"
                            : o.status === "pending"
                              ? "secondary"
                              : o.status === "failed"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {o.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!recentOrders?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No orders yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <OrdersBarChart data={series} />
        </div>

        <div className="space-y-4">
          <VoucherStatusPie data={voucherStatuses} />

          <Card className="py-4">
            <CardContent className="px-4">
              <p className="text-xs font-medium text-muted-foreground">Conversion rate</p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight">{stats.conversionRate}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.conversionRate}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
