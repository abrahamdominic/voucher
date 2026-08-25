import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import type { Profile, UserRole } from "@/types/database";

const ROLE_RANK: Record<UserRole, number> = {
  staff: 1,
  admin: 2,
  super_admin: 3,
};

/** Returns the signed-in profile, or null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) return null;
  return profile;
}

/**
 * Enforces authentication + minimum role for a page/action.
 * Redirects unauthenticated users to login and unauthorized users to /admin.
 */
export async function requireRole(minimumRole: UserRole = "staff"): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/admin/login");
  if (ROLE_RANK[profile.role] < ROLE_RANK[minimumRole]) redirect("/admin");
  return profile;
}

export function hasRole(profile: Profile | null, minimumRole: UserRole): boolean {
  if (!profile) return false;
  return ROLE_RANK[profile.role] >= ROLE_RANK[minimumRole];
}

// Re-export the client-safe permission matrix so existing imports keep working.
export {
  PERMISSIONS,
  canAccess,
  type AdminSection,
} from "./types";
