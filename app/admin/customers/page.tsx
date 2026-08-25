import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { CustomerSearch } from "@/components/admin/customer-search";
import { CustomersTable } from "@/components/admin/customers-table";
import { formatDate, formatNaira } from "@/lib/format";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireRole("admin");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const admin = createAdminClient();
  let query = admin
    .from("customers")
    .select("*")
    .order("last_order_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (q) {
    const like = `%${q.replace(/[%_,]/g, "")}%`;
    query = query.or(`phone.ilike.${like},email.ilike.${like},name.ilike.${like}`);
  }
  const { data: customers } = await query;

  // Active voucher indicator per customer
  const phones = (customers ?? []).map((c) => c.phone);
  let activeVoucherByPhone = new Map<string, string>();
  if (phones.length > 0) {
    const { data: activeVouchers } = await admin
      .from("vouchers")
      .select("code, customer_phone")
      .in("status", ["active", "issued"])
      .in("customer_phone", phones)
      .order("created_at", { ascending: false });
    activeVoucherByPhone = new Map(
      (activeVouchers ?? []).map((v) => [v.customer_phone ?? "", v.code])
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          {(customers ?? []).length.toLocaleString()} customer{(customers ?? []).length === 1 ? "" : "s"}
        </p>
      </div>

      <CustomerSearch initialQuery={q} />

      <CustomersTable
        customers={(customers ?? []).map((c) => ({
          id: c.id,
          phone: c.phone,
          email: c.email,
          name: c.name,
          status: c.status,
          total_orders: c.total_orders,
          total_spent_kobo: Number(c.total_spent_kobo),
          last_order_at: c.last_order_at,
          first_seen_at: c.first_seen_at,
          activeVoucherCode: activeVoucherByPhone.get(c.phone) ?? null,
        }))}
      />

      {(customers ?? []).length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing up to 200 most recent · last purchase {formatDate(customers?.[0]?.last_order_at)} · top spend{" "}
          {formatNaira(Math.max(...(customers ?? []).map((c) => Number(c.total_spent_kobo))))}
        </p>
      )}
    </div>
  );
}
