import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Writes an immutable audit record. Called from server actions after
 * privileged operations. Failures never break the primary operation.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      metadata: entry.metadata ?? {},
      ip_address: entry.ipAddress ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to write audit log:", error instanceof Error ? error.message : error);
  }
}
