import { createAdminClient } from "@/lib/supabase/admin";

export interface SearchHit {
  type: "order" | "voucher" | "customer" | "payment";
  title: string;
  subtitle: string;
  href: string;
}

/**
 * Global admin search across orders, vouchers, customers and payments.
 * Called from the command palette; results are scoped server-side.
 */
export async function globalSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const admin = createAdminClient();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const hits: SearchHit[] = [];

  const [orders, vouchers, customers, payments] = await Promise.all([
    admin
      .from("orders")
      .select("reference, phone, plan_name, status")
      .or(`reference.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
      .limit(5),
    admin
      .from("vouchers")
      .select("code, status, customer_phone")
      .or(`code.ilike.%${q}%,customer_phone.ilike.${like}`)
      .limit(5),
    admin
      .from("customers")
      .select("id, phone, email, name")
      .or(`phone.ilike.${like},email.ilike.${like},name.ilike.${like}`)
      .limit(5),
    admin
      .from("payments")
      .select("transaction_ref, provider_reference, status, amount_kobo")
      .or(`transaction_ref.ilike.${like},provider_reference.ilike.${like}`)
      .limit(4),
  ]);

  orders.data?.forEach((o) =>
    hits.push({
      type: "order",
      title: o.reference,
      subtitle: `${o.plan_name} · ${o.phone} · ${o.status}`,
      href: `/admin/orders/${o.reference}`,
    })
  );
  vouchers.data?.forEach((v) =>
    hits.push({
      type: "voucher",
      title: v.code,
      subtitle: `Voucher · ${v.status}${v.customer_phone ? ` · ${v.customer_phone}` : ""}`,
      href: `/admin/vouchers?q=${encodeURIComponent(v.code)}`,
    })
  );
  customers.data?.forEach((c) =>
    hits.push({
      type: "customer",
      title: c.name ?? c.phone,
      subtitle: [c.email, c.phone].filter(Boolean).join(" · "),
      href: `/admin/customers/${c.id}`,
    })
  );
  payments.data?.forEach((p) =>
    hits.push({
      type: "payment",
      title: p.transaction_ref,
      subtitle: `${p.status.toUpperCase()} · ₦${(Number(p.amount_kobo) / 100).toFixed(2)}`,
      href: `/admin/payments?q=${encodeURIComponent(p.transaction_ref)}`,
    })
  );

  return hits;
}
