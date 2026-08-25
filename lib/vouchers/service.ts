import { createAdminClient } from "@/lib/supabase/admin";

import type { Voucher } from "@/types/database";

type VoucherInsert = Partial<Omit<Voucher, "usage">> & { usage?: Voucher["usage"] };

/** Secure alphabet without visually ambiguous characters. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomCode(prefix: string): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const part = (offset: number) =>
    Array.from({ length: 5 }, (_, i) => ALPHABET[bytes[offset + i] % ALPHABET.length]).join("");
  return `${prefix.toUpperCase()}-${part(0)}-${part(5)}`;
}

export interface GenerateResult {
  ok: boolean;
  created?: number;
  error?: string;
}

/**
 * Generates `quantity` unique vouchers for a plan as a named batch.
 * Codes are crypto-random; the unique constraint guarantees no duplicates.
 */
export async function generateVouchers(params: {
  planId: string;
  quantity: number;
  prefix: string;
  label: string;
  createdBy: string | null;
}): Promise<GenerateResult> {
  const admin = createAdminClient();

  const { data: plan } = await admin.from("plans").select("*").eq("id", params.planId).single();
  if (!plan) return { ok: false, error: "Plan not found" };

  const { data: batch } = await admin
    .from("voucher_batches")
    .insert({
      label: params.label,
      mode: "generated",
      plan_id: params.planId,
      quantity: params.quantity,
      created_by: params.createdBy,
    })
    .select("id")
    .single();

  if (!batch) return { ok: false, error: "Could not create batch" };

  const rows: VoucherInsert[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (rows.length < params.quantity && attempts < params.quantity * 10) {
    attempts += 1;
    const code = randomCode(params.prefix);
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({
      code,
      plan_id: params.planId,
      batch_id: batch.id,
      source: "generated",
      status: "available",
      duration_hours: plan.duration_hours,
      data_allowance_mb: plan.data_allowance_mb,
      device_limit: plan.device_limit,
      created_by: params.createdBy,
    });
  }

  const { error, count } = await admin
    .from("vouchers")
    .upsert(rows, { onConflict: "code", count: "exact", ignoreDuplicates: true });

  if (error) {
    // roll back the empty batch marker on hard failure
    await admin.from("voucher_batches").delete().eq("id", batch.id);
    return { ok: false, error: error.message };
  }

  return { ok: true, created: count ?? rows.length };
}

export interface ImportRowResult {
  row: number;
  code: string;
  status: "imported" | "duplicate" | "invalid" | "failed";
  reason?: string;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  invalid: number;
  failed: number;
  details: ImportRowResult[];
}

/** Minimal CSV parser handling quoted fields. */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      current.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[i + 1] === "\n") i++;
      current.push(field);
      field = "";
      if (current.some((c) => c.trim() !== "")) rows.push(current);
      current = [];
    } else {
      field += char;
    }
  }
  current.push(field);
  if (current.some((c) => c.trim() !== "")) rows.push(current);

  return rows;
}

/**
 * Imports vouchers from CSV (`voucher_code,plan_id`).
 * Validates every row and never partially corrupts state.
 */
export async function importVouchersFromCsv(params: {
  csv: string;
  label: string;
  createdBy: string | null;
}): Promise<ImportResult> {
  const admin = createAdminClient();
  const result: ImportResult = { imported: 0, duplicates: 0, invalid: 0, failed: 0, details: [] };

  const rows = parseCsv(params.csv);
  if (rows.length === 0) return result;

  // header detection
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = header.includes("voucher_code");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const codeCol = hasHeader ? header.indexOf("voucher_code") : 0;
  const planCol = hasHeader ? header.indexOf("plan_id") : 1;

  const validPlanIds = new Set(
    (await admin.from("plans").select("id")).data?.map((p) => p.id) ?? []
  );

  const toInsert: VoucherInsert[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowNumber = (hasHeader ? 2 : 1) + i;
    const cells = dataRows[i];
    const rawCode = (cells[codeCol] ?? "").trim();
    const rawPlan = (cells[planCol] ?? "").trim();

    if (!rawCode) {
      result.invalid += 1;
      result.details.push({ row: rowNumber, code: rawCode, status: "invalid", reason: "Empty code" });
      continue;
    }
    if (!/^[A-Za-z0-9-]{4,40}$/.test(rawCode)) {
      result.invalid += 1;
      result.details.push({ row: rowNumber, code: rawCode, status: "invalid", reason: "Invalid characters in code" });
      continue;
    }

    // resolve plan by id or name
    let planId: string | null = null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawPlan)) {
      planId = validPlanIds.has(rawPlan) ? rawPlan : null;
    } else if (rawPlan) {
      const { data: planByName } = await admin
        .from("plans")
        .select("id")
        .ilike("name", rawPlan)
        .maybeSingle();
      planId = planByName?.id ?? null;
    }

    if (!planId) {
      result.invalid += 1;
      result.details.push({ row: rowNumber, code: rawCode, status: "invalid", reason: `Unknown plan "${rawPlan}"` });
      continue;
    }

    toInsert.push({
      code: rawCode.toUpperCase(),
      plan_id: planId,
      source: "imported",
      status: "available",
      notes: `Imported via "${params.label}"`,
      created_by: params.createdBy,
    });
    result.details.push({ row: rowNumber, code: rawCode.toUpperCase(), status: "imported" });
  }

  if (toInsert.length > 0) {
    const inserted = await admin
      .from("vouchers")
      .upsert(toInsert, { onConflict: "code", ignoreDuplicates: true })
      .select("code");

    if (inserted.error) {
      result.failed += toInsert.length;
      for (const d of result.details) if (d.status === "imported") d.status = "failed";
    } else {
      const insertedCodes = new Set(inserted.data?.map((r) => r.code) ?? []);
      for (const detail of result.details) {
        if (detail.status !== "imported") continue;
        if (insertedCodes.has(detail.code)) {
          result.imported += 1;
        } else {
          detail.status = "duplicate";
          detail.reason = "Already exists";
          result.duplicates += 1;
        }
      }
    }
  }

  if (result.imported > 0) {
    await admin.from("voucher_batches").insert({
      label: params.label,
      mode: "imported",
      quantity: result.imported,
      created_by: params.createdBy,
    });
  }

  return result;
}

/** Vouchers that are safe to delete: never sold/assigned to an order. */
export async function isVoucherDeletable(voucherId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vouchers")
    .select("status")
    .eq("id", voucherId)
    .single();
  return data?.status === "available";
}

export type VoucherWithPlan = Voucher & {
  plans: { name: string } | null;
};
