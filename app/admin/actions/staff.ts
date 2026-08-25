"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import type { UserRole } from "@/types/database";

export interface StaffOpState {
  error?: string;
  success?: string;
}

const ROLES: UserRole[] = ["staff", "admin", "super_admin"];

/** Invite a teammate by email — sends a Supabase invite; profile row is created by the auth trigger. */
export async function inviteStaffAction(_prev: StaffOpState, formData: FormData): Promise<StaffOpState> {
  const actor = await requireRole("super_admin");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 120);
  const role = String(formData.get("role") ?? "staff");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!ROLES.includes(role as UserRole)) return { error: "Invalid role." };

  const admin = createAdminClient();

  // Already on the team?
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return { error: "That email is already a team member." };

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/login`;
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: fullName || null, requested_role: role },
  });
  if (error) {
    console.error("[staff] invite failed:", error.message);
    return { error: `Invite failed: ${error.message}` };
  }

  // The DB trigger creates the profile with role super_admin only for the very
  // first user; set the intended role for this invite explicitly.
  if (invited.user) {
    await admin
      .from("profiles")
      .update({ role: role as UserRole, full_name: fullName || null })
      .eq("id", invited.user.id);
    if (invited.user.email) {
      await admin
        .from("profiles")
        .update({ role: role as UserRole, full_name: fullName || null })
        .eq("email", invited.user.email);
    }
  }

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "staff.invited",
    resourceType: "profile",
    resourceId: email,
    metadata: { role },
    ipAddress: clientIpFromHeaders(await headers()),
  });

  revalidatePath("/admin/staff");
  return { success: `Invitation sent to ${email}.` };
}

export async function updateStaffAction(_prev: StaffOpState, formData: FormData): Promise<StaffOpState> {
  const actor = await requireRole("super_admin");

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const isActive = String(formData.get("isActive") ?? "true") === "true";

  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Invalid member." };
  if (!ROLES.includes(role)) return { error: "Invalid role." };

  const admin = createAdminClient();

  // Guard rails: never demote or disable your own account.
  if (id === actor.id && (!isActive || role !== actor.role)) {
    return { error: "You cannot change your own role or deactivate yourself." };
  }

  // Keep at least one active super_admin.
  if (!isActive || role !== "super_admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin")
      .eq("is_active", true)
      .neq("id", id);
    if ((count ?? 0) === 0) {
      return { error: "At least one active super admin is required." };
    }
  }

  const { error } = await admin.from("profiles").update({ role, is_active: isActive }).eq("id", id);
  if (error) {
    console.error("[staff] update failed:", error.message);
    return { error: "Could not update this member." };
  }

  // Deactivation also disables their Supabase auth session.
  if (!isActive) {
    try {
      await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" }); // ~100 years
    } catch (error) {
      console.warn("[staff] could not ban auth user:", error instanceof Error ? error.message : error);
    }
  } else {
    try {
      await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
    } catch {
      // Profile may predate an auth user (invite pending); ignore.
    }
  }

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "staff.updated",
    resourceType: "profile",
    resourceId: id,
    metadata: { role, is_active: isActive },
    ipAddress: clientIpFromHeaders(await headers()),
  });

  revalidatePath("/admin/staff");
  return { success: "Team updated." };
}
