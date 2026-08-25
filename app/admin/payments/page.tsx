import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExportButton } from "@/components/admin/export-button";
import { PaymentsTable } from "@/components/admin/payments-table";
import { formatNaira } from "@/lib/format";
import type { PaymentStatus } from "@/types/database";

export const metadata = { title: "Payments" };

export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireRole("admin");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status.trim() : "";

  const admin = createAdminClient();
  let query = admin
    .from("payments")
    .select("*, orders(reference, phone)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) {
    const like = `%${q.replace(/[%_,]/g, "")}%`;
    query = query.or(`transaction_ref.ilike.${like},provider_reference.ilike.${like},orders.reference.ilike.${like}`);
  }
  if (status && ["pending", "successful", "failed", "refunded"].includes(status)) {
    query = query.eq("status", status as PaymentStatus);
  }
  const { data: payments } = await query;

  const successfulKobo = (payments ?? [])
    .filter((p) => p.status === "successful")
    .reduce((sum, p) => sum + Number(p.amount_kobo), 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            {(payments ?? []).length} shown · {formatNaira(successfulKobo)} successful on this page
          </p>
        </div>
        <ExportButton type="payments" label="Export CSV" />
      </div>

      <PaymentsTable
        payments={(payments ?? []).map((p) => ({
          id: p.id,
          transaction_ref: p.transaction_ref,
          provider_reference: p.provider_reference,
          order_reference: p.orders?.reference ?? "—",
          customer_phone: p.orders?.phone ?? "—",
          amount_kobo: Number(p.amount_kobo),
          provider: p.provider,
          method: [p.method, p.channel].filter(Boolean).join(" · ") || null,
          status: p.status,
          verified_at: p.verified_at,
          created_at: p.created_at,
        }))}
        currentStatus={status}
      />
    </div>
  );
}
