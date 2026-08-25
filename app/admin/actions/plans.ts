"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { planSchema } from "@/lib/validation";

export interface PlanOpState {
  error?: string;
  success?: string;
}

function formDataToPlan(formData: FormData) {
  return planSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    durationHours: formData.get("durationHours"),
    dataAllowanceMb: formData.get("dataAllowanceMb") || undefined,
    speedMbps: formData.get("speedMbps") ?? "",
    deviceLimit: formData.get("deviceLimit"),
    isActive: formData.get("isActive") === "on",
    isPopular: formData.get("isPopular") === "on",
    displayOrder: formData.get("displayOrder"),
  });
}

export async function createPlanAction(_prev: PlanOpState, formData: FormData): Promise<PlanOpState> {
  const profile = await requireRole("admin");
  const parsed = formDataToPlan(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const admin = createAdminClient();
  const d = parsed.data;

  const { error } = await admin.from("plans").insert({
    name: d.name,
    description: d.description || null,
    price_kobo: Math.round(d.price * 100),
    duration_hours: d.durationHours,
    data_allowance_mb: d.dataAllowanceMb || null,
    speed_mbps: d.speedMbps || null,
    device_limit: d.deviceLimit,
    is_active: d.isActive,
    is_popular: d.isPopular,
    display_order: d.displayOrder,
  });

  if (error) {
    console.error("[plans] create failed:", error.message);
    return { error: "Could not create the plan." };
  }

  const requestHeaders = await headers();
  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "plan.created",
    resourceType: "plan",
    resourceId: d.name,
    metadata: { price_kobo: Math.round(d.price * 100) },
    ipAddress: clientIpFromHeaders(requestHeaders),
  });

  revalidatePath("/admin/plans");
  revalidatePath("/connect/plans");
  revalidatePath("/");
  return { success: "Plan created." };
}

export async function updatePlanAction(_prev: PlanOpState, formData: FormData): Promise<PlanOpState> {
  const profile = await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Invalid plan." };

  const parsed = formDataToPlan(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const admin = createAdminClient();
  const d = parsed.data;

  const { error } = await admin
    .from("plans")
    .update({
      name: d.name,
      description: d.description || null,
      price_kobo: Math.round(d.price * 100),
      duration_hours: d.durationHours,
      data_allowance_mb: d.dataAllowanceMb || null,
      speed_mbps: d.speedMbps || null,
      device_limit: d.deviceLimit,
      is_active: d.isActive,
      is_popular: d.isPopular,
      display_order: d.displayOrder,
    })
    .eq("id", id);

  if (error) {
    console.error("[plans] update failed:", error.message);
    return { error: "Could not update the plan." };
  }

  const requestHeaders = await headers();
  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "plan.edited",
    resourceType: "plan",
    resourceId: id,
    metadata: { price_kobo: Math.round(d.price * 100), active: d.isActive },
    ipAddress: clientIpFromHeaders(requestHeaders),
  });

  revalidatePath("/admin/plans");
  revalidatePath("/connect/plans");
  revalidatePath("/");
  return { success: "Plan updated." };
}

export async function duplicatePlanAction(_prev: PlanOpState, formData: FormData): Promise<PlanOpState> {
  const profile = await requireRole("admin");
  const id = String(formData.get("id") ?? "");

  const admin = createAdminClient();
  const { data: source } = await admin.from("plans").select("*").eq("id", id).single();
  if (!source) return { error: "Plan not found." };

  const { data: existing } = await admin
    .from("plans")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.display_order ?? 0) + 1;

  const { error } = await admin.from("plans").insert({
    name: `${source.name} (copy)`,
    description: source.description,
    price_kobo: Number(source.price_kobo),
    duration_hours: source.duration_hours,
    data_allowance_mb: source.data_allowance_mb,
    speed_mbps: source.speed_mbps,
    device_limit: source.device_limit,
    is_active: false,
    is_popular: false,
    display_order: nextOrder,
  });

  if (error) return { error: "Could not duplicate the plan." };

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "plan.created",
    resourceType: "plan",
    resourceId: `copy of ${id}`,
    ipAddress: clientIpFromHeaders(await headers()),
  });

  revalidatePath("/admin/plans");
  return { success: "Plan duplicated (inactive)." };
}

export async function togglePlanActiveAction(_prev: PlanOpState, formData: FormData): Promise<PlanOpState> {
  const profile = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  const admin = createAdminClient();
  const { error } = await admin.from("plans").update({ is_active: !active }).eq("id", id);
  if (error) return { error: "Could not update the plan." };

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: active ? "plan.deactivated" : "plan.activated",
    resourceType: "plan",
    resourceId: id,
    ipAddress: clientIpFromHeaders(await headers()),
  });

  revalidatePath("/admin/plans");
  revalidatePath("/connect/plans");
  revalidatePath("/");
  return {};
}

export async function deletePlanAction(_prev: PlanOpState, formData: FormData): Promise<PlanOpState> {
  const profile = await requireRole("admin");
  const id = String(formData.get("id") ?? "");

  const admin = createAdminClient();

  // Archive semantics: refuse hard delete when orders reference the plan.
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await admin.from("plans").update({ is_active: false }).eq("id", id);
    if (error) return { error: "Could not archive the plan." };
    await logAudit({
      actorId: profile.id,
      actorEmail: profile.email,
      action: "plan.archived",
      resourceType: "plan",
      resourceId: id,
      ipAddress: clientIpFromHeaders(await headers()),
    });
    revalidatePath("/admin/plans");
    revalidatePath("/connect/plans");
    return { success: "Plan has sales history — archived instead of deleted." };
  }

  // Also detach inventory vouchers before delete.
  const { error } = await admin.from("plans").delete().eq("id", id);
  if (error) {
    console.error("[plans] delete failed:", error.message);
    return { error: "Could not delete the plan." };
  }

  await logAudit({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "plan.deleted",
    resourceType: "plan",
    resourceId: id,
    ipAddress: clientIpFromHeaders(await headers()),
  });

  revalidatePath("/admin/plans");
  revalidatePath("/connect/plans");
  return { success: "Plan deleted." };
}

export async function reorderPlansAction(_prev: PlanOpState, formData: FormData): Promise<PlanOpState> {
  await requireRole("admin");

  const orderParam = String(formData.get("order") ?? "");
  let ids: string[];
  try {
    ids = JSON.parse(orderParam) as string[];
  } catch {
    return { error: "Invalid order payload." };
  }
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((i) => /^[0-9a-f-]{36}$/i.test(i))) {
    return { error: "Invalid order payload." };
  }

  const admin = createAdminClient();
  await Promise.all(
    ids.map((id, index) => admin.from("plans").update({ display_order: index }).eq("id", id))
  );

  revalidatePath("/admin/plans");
  revalidatePath("/connect/plans");
  revalidatePath("/");
  return { success: "Order saved." };
}
