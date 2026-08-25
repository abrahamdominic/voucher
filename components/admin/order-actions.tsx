"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, RefreshCcw, Undo2 } from "lucide-react";

import { refundOrder } from "@/app/admin/actions/refunds";
import { retryVoucherAllocation } from "@/app/admin/actions/orders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function RefundDialog({ reference, amount }: { reference: string; amount: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(refundOrder, {});

  useEffect(() => {
    if (!state.success) return;
    toast.success(state.success);
    const t = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(t);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="rounded-lg">
          <Undo2 data-icon="inline-start" aria-hidden /> Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund {reference}</DialogTitle>
          <DialogDescription>
            This refunds {amount} through the payment gateway and revokes an unused voucher. This
            action is logged.
          </DialogDescription>
        </DialogHeader>

        {state.error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="reference" value={reference} />
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (required)</Label>
            <Input id="reason" name="reason" placeholder="e.g. Customer request — duplicate purchase" required minLength={3} />
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3">
            <input
              type="checkbox"
              id="confirmActive"
              name="confirmActive"
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <Label htmlFor="confirmActive" className="text-xs font-normal leading-relaxed text-muted-foreground">
              The voucher for this order is already active/used and I confirm the refund anyway.
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />}
              Confirm refund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RetryAllocationButton({ reference }: { reference: string }) {
  const [state, formAction, pending] = useActionState(retryVoucherAllocation, {});

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state.error, state.success]);

  return (
    <form action={formAction}>
      <input type="hidden" name="reference" value={reference} />
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="rounded-lg">
        {pending ? (
          <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
        ) : (
          <RefreshCcw data-icon="inline-start" aria-hidden />
        )}
        Retry allocation
      </Button>
    </form>
  );
}
