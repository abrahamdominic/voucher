"use client";

import { useActionState, useEffect, useState } from "react";
import { Copy, Loader2, Pencil, PlusCircle, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createPlanAction,
  deletePlanAction,
  duplicatePlanAction,
  togglePlanActiveAction,
  updatePlanAction,
  type PlanOpState,
} from "@/app/admin/actions/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatData, formatDuration, formatNaira } from "@/lib/format";

import type { Plan } from "@/types/database";

const initial: PlanOpState = {};

export function PlansManager({ plans }: { plans: Plan[] }) {
  const [editing, setEditing] = useState<Plan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-lg">
              <PlusCircle data-icon="inline-start" aria-hidden /> New plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create plan</DialogTitle>
              <DialogDescription>Define the plan customers can purchase.</DialogDescription>
            </DialogHeader>
            <PlanForm
              action={createPlanAction}
              onDone={() => setCreateOpen(false)}
              submitLabel="Create plan"
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{plan.name}</h2>
                  <p className="text-xs text-muted-foreground">{formatDuration(plan.duration_hours)}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Badge variant={plan.is_active ? "default" : "outline"}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {plan.is_popular && <Badge variant="secondary">Popular</Badge>}
                </div>
              </div>

              <p className="mt-3 text-xl font-semibold">{formatNaira(Number(plan.price_kobo))}</p>
              <ul className="mt-2 flex-1 space-y-1 text-sm text-muted-foreground">
                {plan.description && <li className="line-clamp-2">{plan.description}</li>}
                <li>{plan.data_allowance_mb ? formatData(plan.data_allowance_mb) : "Unlimited data"}</li>
                {plan.speed_mbps && <li>{plan.speed_mbps}</li>}
                <li>{plan.device_limit} device{plan.device_limit === 1 ? "" : "s"}</li>
              </ul>

              <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
                <Button size="sm" variant="outline" onClick={() => setEditing(plan)} className="rounded-lg">
                  <Pencil data-icon="inline-start" aria-hidden /> Edit
                </Button>
                <DuplicateButton id={plan.id} />
                <ToggleActiveButton id={plan.id} active={plan.is_active} />
                <DeleteButton id={plan.id} name={plan.name} />
              </div>
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No plans yet — create your first one.
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
            <DialogDescription>Updates go live on the customer site immediately.</DialogDescription>
          </DialogHeader>
          {editing && (
            <PlanForm
              key={editing.id}
              plan={editing}
              action={updatePlanAction}
              onDone={() => setEditing(null)}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanForm({
  plan,
  action,
  onDone,
  submitLabel,
}: {
  plan?: Plan;
  action: (prev: PlanOpState, formData: FormData) => Promise<PlanOpState>;
  onDone?: () => void;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.success || state.error) {
      if (state.success) {
        toast.success(state.success);
        onDone?.();
      }
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {plan && <input type="hidden" name="id" value={plan.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={plan?.name ?? ""} required maxLength={100} placeholder="24 Hours" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={plan?.description ?? ""} maxLength={500} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="price">Price (₦)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min={0}
            defaultValue={plan ? Number(plan.price_kobo) / 100 : ""}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationHours">Duration (hours)</Label>
          <Input
            id="durationHours"
            name="durationHours"
            type="number"
            min={1}
            defaultValue={plan?.duration_hours ?? 24}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataAllowanceMb">Data limit (MB)</Label>
          <Input
            id="dataAllowanceMb"
            name="dataAllowanceMb"
            type="number"
            min={0}
            placeholder="empty = unlimited"
            defaultValue={plan?.data_allowance_mb ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deviceLimit">Device limit</Label>
          <Input id="deviceLimit" name="deviceLimit" type="number" min={1} defaultValue={plan?.device_limit ?? 1} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="speedMbps">Speed</Label>
          <Input id="speedMbps" name="speedMbps" placeholder="Up to 20 Mbps" defaultValue={plan?.speed_mbps ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" name="displayOrder" type="number" min={0} defaultValue={plan?.display_order ?? 0} required />
        </div>
      </div>

      <div className="flex gap-6 rounded-lg bg-muted/50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch name="isActive" defaultChecked={plan?.is_active ?? true} />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch name="isPopular" defaultChecked={plan?.is_popular ?? false} />
          Popular badge
        </label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending} className="rounded-lg">
          {pending && <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DuplicateButton({ id }: { id: string }) {
  const [, formAction, pending] = useActionState(duplicatePlanAction, initial);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button size="sm" variant="ghost" title="Duplicate" disabled={pending}>
        <Copy />
      </Button>
    </form>
  );
}

function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const [, formAction, pending] = useActionState(togglePlanActiveAction, initial);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(active)} />
      <Button size="sm" variant="ghost" title={active ? "Deactivate" : "Activate"} disabled={pending}>
        <Power className={active ? "text-destructive" : "text-primary"} />
      </Button>
    </form>
  );
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [, formAction, pending] = useActionState(deletePlanAction, initial);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" title="Delete / archive" onClick={() => setConfirming(true)}>
        <Trash2 />
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <span className="whitespace-nowrap text-[11px] text-muted-foreground">Delete “{name}”?</span>
      <Button size="xs" type="submit" variant="destructive" disabled={pending}>
        Yes
      </Button>
      <Button size="xs" type="button" variant="outline" onClick={() => setConfirming(false)}>
        No
      </Button>
    </form>
  );
}
