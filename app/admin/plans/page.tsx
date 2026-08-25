import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlansManager } from "@/components/admin/plans-manager";

export const metadata = { title: "Plans" };

export default async function AdminPlansPage() {
  await requireRole("admin");
  const admin = createAdminClient();
  const { data: plans } = await admin.from("plans").select("*").order("display_order");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Changes appear on the customer site immediately.
        </p>
      </div>
      <PlansManager plans={plans ?? []} />
    </div>
  );
}
