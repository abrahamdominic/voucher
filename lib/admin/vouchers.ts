import { createAdminClient } from "@/lib/supabase/admin";
import type { VoucherStatus } from "@/types/database";

export interface VoucherRow {
  id: string;
  code: string;
  plan_name: string;
  source: string;
  status: string;
  customer_phone: string | null;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  devices_used: number;
}

export interface VoucherFilters {
  q?: string;
  status?: string;
  page: number;
  perPage: number;
}

export function parseVoucherFilters(params: Record<string, string | string[] | undefined>): VoucherFilters {
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string).trim() : undefined);
  return {
    q: get("q") || get("search") || undefined,
    status: get("status") || undefined,
    page: Math.max(1, Number.parseInt(get("page") ?? "1", 10) || 1),
    perPage: 20,
  };
}

export async function queryVouchers(filters: VoucherFilters): Promise<{ vouchers: VoucherRow[]; total: number }> {
  const admin = createAdminClient();

  let query = admin
    .from("vouchers")
    .select("id, code, status, source, customer_phone, created_at, activated_at, expires_at, usage, plans(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((filters.page - 1) * filters.perPage, filters.page * filters.perPage - 1);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status as VoucherStatus);
  }
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_,]/g, "")}%`;
    query = query.or(`code.ilike.${like},customer_phone.ilike.${like},customer_email.ilike.${like}`);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("[vouchers] query failed:", error.message);
    return { vouchers: [], total: 0 };
  }

  return {
    vouchers: (data ?? []).map((row) => {
      const r = row as unknown as {
        id: string; code: string; status: string; source: string;
        customer_phone: string | null; created_at: string; activated_at: string | null;
        expires_at: string | null; usage: Record<string, unknown>; plans: { name: string } | null;
      };
      return {
        id: r.id,
        code: r.code,
        plan_name: r.plans?.name ?? "—",
        source: r.source,
        status: r.status,
        customer_phone: r.customer_phone,
        created_at: r.created_at,
        activated_at: r.activated_at,
        expires_at: r.expires_at,
        devices_used: Number(r.usage?.devices ?? 0),
      };
    }),
    total: count ?? 0,
  };
}
