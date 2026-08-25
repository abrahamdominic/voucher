import { requireRole } from "@/lib/auth/session";
import {
  buildFilterUrl,
  getPlanOptions,
  parseOrderFilters,
  queryOrders,
} from "@/lib/admin/orders";
import { OrdersTable, Pagination } from "@/components/admin/orders-table";
import { OrderFiltersForm } from "@/components/admin/order-filters";
import { ExportButton } from "@/components/admin/export-button";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireRole("staff");
  const params = await searchParams;
  const filters = parseOrderFilters(params);

  const [{ orders, total }, plans] = await Promise.all([queryOrders(filters), getPlanOptions()]);
  const totalPages = Math.max(1, Math.ceil(total / filters.perPage));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} order{total === 1 ? "" : "s"}
          </p>
        </div>
        <ExportButton type="orders" label="Export CSV" />
      </div>

      <OrderFiltersForm
        basePath="/admin/orders"
        filters={filters}
        plans={plans.map((p) => ({ id: p.id, name: p.name }))}
      />

      <OrdersTable orders={orders} />

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        prevHref={buildFilterUrl("/admin/orders", filters, { page: String(filters.page - 1) })}
        nextHref={buildFilterUrl("/admin/orders", filters, { page: String(filters.page + 1) })}
      />
    </div>
  );
}
