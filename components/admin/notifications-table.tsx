"use client";

import { useActionState, useEffect } from "react";
import { Loader2, SendHorizonal } from "lucide-react";
import { toast } from "sonner";

import { resendNotificationAction } from "@/app/admin/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

const statusVariant = {
  sent: "default",
  pending: "secondary",
  failed: "destructive",
} as const;

function ResendButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(resendNotificationAction, {});

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" className="rounded-lg" disabled={pending}>
        {pending ? (
          <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
        ) : (
          <SendHorizonal data-icon="inline-start" aria-hidden />
        )}
        Resend
      </Button>
    </form>
  );
}

export interface NotificationRowView {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  subject: string | null;
  body: string;
  status: string;
  retries: number;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export function NotificationsTable({ notifications }: { notifications: NotificationRowView[] }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No notifications yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((n) => (
            <TableRow key={n.id}>
              <TableCell className="whitespace-nowrap capitalize">{n.type.replace(/_/g, " ")}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{n.channel}</Badge></TableCell>
              <TableCell className="max-w-44 truncate" title={n.recipient}>{n.recipient}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[n.status as keyof typeof statusVariant] ?? "secondary"}>
                  {n.status}{n.retries > 0 && n.status !== "sent" ? ` (${n.retries})` : ""}
                </Badge>
                {n.error && (
                  <span className="mt-1 block max-w-52 truncate text-xs text-destructive" title={n.error}>
                    {n.error}
                  </span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDate(n.created_at)}
                {n.sent_at && n.status === "sent" && (
                  <span className="block">sent {formatDate(n.sent_at)}</span>
                )}
              </TableCell>
              <TableCell>{n.status !== "sent" && <ResendButton id={n.id} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
