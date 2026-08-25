import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { VoucherManager } from "@/components/admin/voucher-manager";
import { parseVoucherFilters, queryVouchers } from "@/lib/admin/vouchers";

export const metadata = { title: "Vouchers" };

export default async function AdminVouchersPage({ searchParams }: PageProps<"/admin/vouchers">) {
  const profile = await requireRole("staff");
  const params = await searchParams;
  const filters = parseVoucherFilters(params);

  const admin = createAdminClient();
  const [{ vouchers, total }, { data: plans }] = await Promise.all([
    queryVouchers(filters),
    admin.from("plans").select("id, name").order("display_order"),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vouchers</h1>
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} voucher{total === 1 ? "" : "s"} · generate, import and manage inventory
        </p>
      </div>

      <VoucherManager
        vouchers={vouchers}
        plans={(plans ?? []).map((p) => ({ id: p.id, name: p.name }))}
        filters={filters}
        canDelete={profile.role !== "staff"}
      />
    </div>
  );
}
