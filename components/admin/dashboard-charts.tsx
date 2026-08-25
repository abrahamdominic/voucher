"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}

export function RevenueOrdersChart({ data }: { data: RevenuePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue over time</CardTitle>
        <CardDescription>Paid orders per day</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={56} />
            <ChartTooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              formatter={(value, name) =>
                name === "revenue"
                  ? [`₦${Number(value).toLocaleString()}`, "Revenue"]
                  : [value, "Orders"]
              }
            />
            <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#rev-fill)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function OrdersBarChart({ data }: { data: RevenuePoint[] }) {
  const withOrders = data.filter((d) => d.orders > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orders over time</CardTitle>
        <CardDescription>Daily order volume</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={withOrders.length > 0 ? withOrders : data.slice(-14)} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={40} />
            <ChartTooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="orders" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PopularPlansChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Most popular plans</CardTitle>
        <CardDescription>By paid orders</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        {data.length === 0 ? (
          <p className="pt-16 text-center text-sm text-muted-foreground">No sales yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <ChartTooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function VoucherStatusPie({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Voucher usage</CardTitle>
        <CardDescription>{total.toLocaleString()} total vouchers</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        {data.length === 0 ? (
          <p className="pt-16 text-center text-sm text-muted-foreground">No vouchers yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                {data.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <ChartTooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {data.map((d, i) => (
            <li key={d.name} className="inline-flex items-center gap-1.5 capitalize">
              <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
              {d.name} ({d.value})
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
