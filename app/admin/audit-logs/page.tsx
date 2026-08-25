import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Audit logs" };

const PAGE_SIZE = 50;

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("delete") || action.includes("revoke") || action.includes("refund")) return "destructive";
  if (action.includes("create") || action.includes("generate") || action.includes("invite")) return "default";
  if (action.includes("login")) return "secondary";
  return "outline";
}

export default async function AdminAuditLogsPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  await requireRole("super_admin");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const admin = createAdminClient();
  let query = admin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (q) {
    const like = `%${q.replace(/[%_,]/g, "")}%`;
    query = query.or(`action.ilike.${like},actor_email.ilike.${like},resource_type.ilike.${like},resource_id.ilike.${like}`);
  }
  const { data: logs } = await query;

  const hasMore = (logs ?? []).length === PAGE_SIZE;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/admin">
          <ArrowLeft data-icon="inline-start" /> Dashboard
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ScrollText className="size-5 text-muted-foreground" aria-hidden /> Audit logs
          </h1>
          <p className="text-sm text-muted-foreground">Append-only record of every sensitive action.</p>
        </div>
        <form action="/admin/audit-logs" method="get" role="search" className="w-full sm:max-w-xs">
          <Input name="q" defaultValue={q} placeholder="Filter by action, actor or resource…" />
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(logs ?? []).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                <TableCell className="max-w-44 truncate text-sm" title={log.actor_email ?? ""}>
                  {log.actor_email ?? log.actor_id?.slice(0, 8) ?? "system"}
                </TableCell>
                <TableCell>
                  <Badge variant={actionVariant(log.action)} className="font-mono text-[11px]">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-40 truncate font-mono text-xs text-muted-foreground" title={log.resource_id ?? ""}>
                  {log.resource_type}
                  {log.resource_id ? ` · ${log.resource_id}` : ""}
                </TableCell>
                <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                  {Object.keys(log.metadata ?? {}).length > 0 ? JSON.stringify(log.metadata) : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{log.ip_address ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!logs?.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No matching entries.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <nav aria-label="Pagination" className="flex items-center justify-center gap-3 text-sm">
        {page > 1 && (
          <Button variant="outline" size="sm" asChild className="rounded-lg">
            <Link href={`/admin/audit-logs?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}>Previous</Link>
          </Button>
        )}
        <span>Page {page}</span>
        {hasMore && (
          <Button variant="outline" size="sm" asChild className="rounded-lg">
            <Link href={`/admin/audit-logs?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}>Next</Link>
          </Button>
        )}
      </nav>
    </div>
  );
}
