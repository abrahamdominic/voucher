import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffManager } from "@/components/admin/staff-manager";

export const metadata = { title: "Staff" };

export default async function AdminStaffPage() {
  const profile = await requireRole("super_admin");
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("profiles")
    .select("*")
    .order("role")
    .order("created_at");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <p className="text-sm text-muted-foreground">
          Roles control dashboard access. At least one active super admin is always required.
        </p>
      </div>
      <StaffManager
        currentUserId={profile.id}
        members={(members ?? []).map((m) => ({
          id: m.id,
          email: m.email,
          fullName: m.full_name,
          role: m.role,
          isActive: m.is_active,
          createdAt: m.created_at,
        }))}
      />
    </div>
  );
}
