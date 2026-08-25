"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import {
  generateVouchers,
  importVouchersFromCsv,
} from "@/lib/vouchers/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import type { VoucherStatus } from "@/types/database";

export interface VoucherOpState {
  error?: string;
  success?: string;
}

const generateSchema = z.object({
  planId: z.string().uuid("Choose a valid plan"),
  quantity: z.coerce.number().int().min(1).max(1000),
  prefix: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{2,6}$/u, "Prefix must be 2–6 letters/digits"),
  label: z.string().trim().min(1).max(80),
});

export async function generateVouchersAction(
  _prev: VoucherOpState,
  formData: FormData
): Promise<VoucherOpState> {
  const profile = await requireRole("staff");

  const parsed = generateSchema.safeParse({
    planId: formData.get("planId"),
    quantity: formData.get("quantity"),
    prefix: formData.get("prefix"),
    label: formData.get("label"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  // Staff can operate vouchers but generation volume is limited for them.
  const maxQuantity = profile.role === "staff" ? 100 : 1000;

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  const result = await generateVouchers({
    planId: parsed.data.planId,
    quantity: Math.min(parsed.data.quantity, maxQuantity),
    prefix: parsed.data.prefix,
    label: parsed.data.label,
    createdBy: profile.id,
  });

  if (!result.ok) return { error: result.error ?? "Generation failed." };

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "voucher.generated",
    resourceType: "voucher_batch",
    metadata: { quantity: result.created, plan_id: parsed.data.planId, label: parsed.data.label },
    ipAddress: ip,
  });

  revalidatePath("/admin/vouchers");
  revalidatePath("/admin");
  return { success: `${result.created} voucher(s) generated.` };
}

export async function importVouchersAction(
  _prev: VoucherOpState,
  formData: FormData
): Promise<VoucherOpState> {
  const profile = await requireRole("admin");

  let csv = String(formData.get("csv") ?? "");
  const file = formData.get("file");

  if (file instanceof File && file.size > 0) {
    if (file.size > 512 * 1024) return { error: "CSV file is too large (max 512 KB)." };
    csv = await file.text();
  }
  if (!csv.trim()) return { error: "Paste CSV content or choose a file." };

  const label = String(formData.get("label") ?? "").trim() || "CSV import";
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  const result = await importVouchersFromCsv({ csv, label, createdBy: profile.id });

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "voucher.imported",
    resourceType: "voucher_batch",
    metadata: {
      imported: result.imported,
      duplicates: result.duplicates,
      invalid: result.invalid,
      failed: result.failed,
    },
    ipAddress: ip,
  });

  revalidatePath("/admin/vouchers");
  revalidatePath("/admin");

  return {
    success: `Imported ${result.imported}, duplicates ${result.duplicates}, invalid ${result.invalid}, failed ${result.failed}.`,
  };
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  available: ["suspended", "revoked"],
  reserved: ["available", "revoked"],
  issued: ["active", "revoked", "suspended"],
  active: ["suspended", "used"],
  suspended: ["active", "revoked"], // reactivate → active
  revoked: [], // terminal
  used: [],
  expired: [],
};

const statusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(["available", "reserved", "issued", "active", "expired", "suspended", "revoked", "used"]),
});

/**
 * Bulk status updates with transition validation.
 * Revocation also propagates to the Wi-Fi provider abstraction.
 */
export async function updateVoucherStatusAction(
  _prev: VoucherOpState,
  formData: FormData
): Promise<VoucherOpState> {
  const profile = await requireRole("staff");

  const ids = formData.getAll("ids").map(String);
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const parsed = statusSchema.safeParse({ ids, status });
  if (!parsed.success) return { error: "Invalid selection or status." };

  const admin = createAdminClient();
  const { data: current } = await admin.from("vouchers").select("id, code, status").in("id", ids);

  if (!current?.length) return { error: "No matching vouchers." };

  const invalid = current.filter((v) => !ALLOWED_TRANSITIONS[v.status]?.includes(status));
  if (invalid.length > 0 && status !== "revoked" && status !== "suspended") {
    return {
      error: `Cannot move ${invalid.length} voucher(s) from their current state to “${status}”.`,
    };
  }

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  // Provider-side propagation (mock provider persists in DB; real providers
  // push to the hotspot API).
  const { getWifiProvider } = await import("@/lib/wifi");
  const wifiProvider = getWifiProvider();

  let updated = 0;
  for (const voucher of current) {
    if (!ALLOWED_TRANSITIONS[voucher.status]?.includes(status)) continue;
    const opResult =
      status === "revoked"
        ? await wifiProvider.revokeVoucher(voucher.code)
        : status === "suspended"
          ? await wifiProvider.suspendVoucher(voucher.code)
          : { ok: true };

    if (!opResult.ok) continue;

    const { error } = await admin
      .from("vouchers")
      .update({ status: status as VoucherStatus, notes: reason || undefined })
      .eq("id", voucher.id);
    if (!error) updated += 1;
  }

  if (updated === 0) return { error: "No vouchers were updated (provider error or invalid transitions)." };

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: status === "revoked" ? "voucher.revoked" : status === "suspended" ? "voucher.suspended" : "voucher.updated",
    resourceType: "voucher",
    resourceId: null,
    metadata: { count: updated, reason, target_status: status },
    ipAddress: ip,
  });

  revalidatePath("/admin/vouchers");
  revalidatePath("/admin");
  return { success: `${updated} voucher(s) updated.` };
}

/** Deletion is only permitted for unsold inventory (never sold vouchers). */
export async function deleteVouchersAction(_prev: VoucherOpState, formData: FormData): Promise<VoucherOpState> {
  const profile = await requireRole("admin");

  const ids = formData.getAll("ids").map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length === 0) return { error: "Nothing selected." };

  const admin = createAdminClient();
  const { data: deletable } = await admin
    .from("vouchers")
    .select("id")
    .in("id", ids)
    .eq("status", "available")
    .is("order_id", null);

  const safeIds = (deletable ?? []).map((v) => v.id);
  if (safeIds.length === 0) {
    return { error: "None of the selected vouchers are safe to delete (already sold/reserved)." };
  }

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  await admin.from("vouchers").delete().in("id", safeIds);

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "voucher.deleted",
    resourceType: "voucher",
    metadata: { count: safeIds.length },
    ipAddress: ip,
  });

  revalidatePath("/admin/vouchers");
  revalidatePath("/admin");
  return { success: `${safeIds.length} voucher(s) deleted.` };
}
