import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { DrainQueueButton } from "@/components/admin/drain-queue-button";
import { NotificationsTable, type NotificationRowView } from "@/components/admin/notifications-table";
import type { NotificationStatus } from "@/types/database";

export const metadata = { title: "Notifications" };

export default async function AdminNotificationsPage({ searchParams }: PageProps<"/admin/notifications">) {
  await requireRole("admin");
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";

  const admin = createAdminClient();
  let query = admin
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);
  if (["pending", "sent", "failed"].includes(status)) {
    query = query.eq("status", status as NotificationStatus);
  }
  const { data: rows } = await query;

  const pendingCount = (rows ?? []).filter((r) => r.status === "pending").length;
  const failedCount = (rows ?? []).filter((r) => r.status === "failed").length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Delivery queue for emails, SMS, WhatsApp and Telegram · {pendingCount} pending · {failedCount} failed
          </p>
        </div>
        <DrainQueueButton disabled={(rows ?? []).length === 0} />
      </div>

      <NotificationsTable
        notifications={
          (rows ?? []).map(
            (r): NotificationRowView => ({
              id: r.id,
              type: r.type,
              channel: r.channel,
              recipient: r.recipient,
              subject: r.subject,
              body: r.body,
              status: r.status,
              retries: r.retries,
              error: r.error,
              sent_at: r.sent_at,
              created_at: r.created_at,
            })
          )
        }
      />
    </div>
  );
}
