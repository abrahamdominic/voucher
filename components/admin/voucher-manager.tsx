"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  PauseCircle,
  PlusCircle,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteVouchersAction,
  generateVouchersAction,
  importVouchersAction,
  updateVoucherStatusAction,
  type VoucherOpState,
} from "@/app/admin/actions/vouchers";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

import type { VoucherRow, VoucherFilters } from "@/lib/admin/vouchers";

const initialOp: VoucherOpState = {};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  available: "secondary",
  issued: "default",
  active: "default",
  suspended: "outline",
  expired: "outline",
  revoked: "destructive",
  used: "outline",
  reserved: "secondary",
};

export function VoucherManager({
  vouchers,
  plans,
  filters,
  canDelete,
}: {
  vouchers: VoucherRow[];
  plans: { id: string; name: string }[];
  filters: VoucherFilters;
  canDelete: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const allSelected = vouchers.length > 0 && vouchers.every((v) => selected.has(v.id));
  const exportQs = searchParams.toString();
  const exportHref = `/api/admin/export?type=vouchers${exportQs ? `&${exportQs}` : ""}`;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(vouchers.map((v) => v.id)));
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/admin/vouchers?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <form
          method="get"
          action="/admin/vouchers"
          role="search"
          aria-label="Search vouchers"
          className="relative flex-1 sm:max-w-sm"
        >
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={filters.q ?? ""} placeholder="Search code or customer…" className="pl-8" />
        </form>

        <Select defaultValue={filters.status ?? "all"} onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Status filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["available", "reserved", "issued", "active", "expired", "suspended", "revoked", "used"].map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <GenerateDialog plans={plans} />
          <ImportDialog />
          <Button variant="outline" size="sm" asChild className="rounded-lg">
            <a href={exportHref} download>
              <Download data-icon="inline-start" aria-hidden /> Export
            </a>
          </Button>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <BulkStatusForm ids={selectedIds} status="revoked" label="Revoke" icon={<Ban data-icon="inline-start" />} />
          <BulkStatusForm ids={selectedIds} status="suspended" label="Suspend" icon={<PauseCircle data-icon="inline-start" />} />
          <BulkStatusForm ids={selectedIds} status="active" label="Reactivate" icon={<CheckCircle2 data-icon="inline-start" />} />
          {canDelete && (
            <DeleteSelectedDialog ids={selectedIds} onDone={() => setSelected(new Set())} />
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="size-4 accent-[var(--primary)]"
                />
              </th>
              <th scope="col" className="px-4 py-3 font-medium">Code</th>
              <th scope="col" className="px-4 py-3 font-medium">Plan</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Customer</th>
              <th scope="col" className="px-4 py-3 font-medium">Created</th>
              <th scope="col" className="px-4 py-3 font-medium">Activated</th>
              <th scope="col" className="px-4 py-3 font-medium">Expiry</th>
              <th scope="col" className="px-4 py-3 font-medium">Usage</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(v.id)}
                    onChange={() => toggle(v.id)}
                    aria-label={`Select ${v.code}`}
                    className="size-4 accent-[var(--primary)]"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-[13px] font-medium">{v.code}</td>
                <td className="px-4 py-3">{v.plan_name}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[v.status] ?? "secondary"}>{v.status}</Badge>
                </td>
                <td className="max-w-36 truncate px-4 py-3">{v.customer_phone ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDate(v.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {v.activated_at ? formatDate(v.activated_at) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {v.expires_at ? formatDate(v.expires_at) : "—"}
                </td>
                <td className="px-4 py-3 text-xs">{v.devices_used} device{v.devices_used === 1 ? "" : "s"}</td>
              </tr>
            ))}
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                  No vouchers match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** One self-contained form per bulk operation; posts ids + target status to the server action. */
function BulkStatusForm({
  ids,
  status,
  label,
  icon,
}: {
  ids: string[];
  status: string;
  label: string;
  icon: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(updateVoucherStatusAction, initialOp);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="status" value={status} />
      {ids.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="rounded-lg bg-background">
        {pending ? <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden /> : icon}
        {label}
      </Button>
    </form>
  );
}

export function GenerateDialog({ plans }: { plans: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(generateVouchersAction, initialOp);

  useEffect(() => {
    if (!state.success) return;
    toast.success(state.success);
    const t = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-lg">
          <PlusCircle data-icon="inline-start" aria-hidden /> Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate vouchers</DialogTitle>
          <DialogDescription>
            Secure random codes are created for the chosen plan and become available inventory.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="gen-plan">Plan</Label>
            <Select name="planId" required>
              <SelectTrigger id="gen-plan" className="w-full">
                <SelectValue placeholder="Choose plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gen-qty">Quantity</Label>
              <Input id="gen-qty" name="quantity" type="number" min={1} max={1000} defaultValue={10} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen-prefix">Prefix</Label>
              <Input id="gen-prefix" name="prefix" placeholder="NK" defaultValue="NK" required pattern="[A-Za-z0-9]{2,6}" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gen-label">Batch label</Label>
            <Input id="gen-label" name="label" placeholder="e.g. Café counter batch — August" required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const CSV_PLACEHOLDER = `voucher_code,plan_id
DS-ABC123,<plan uuid or name>
DS-XYZ789,<plan uuid or name>`;

export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [state, formAction, pending] = useActionState(importVouchersAction, initialOp);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (!state.success) return;
    toast.success(state.success);
    const t = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-lg">
          <FileUp data-icon="inline-start" aria-hidden /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import vouchers</DialogTitle>
          <DialogDescription>
            Upload pre-generated codes from your Wi-Fi system. Duplicates, unknown plans and empty
            codes are rejected automatically.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state.success && (
            <p role="status" className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{state.success}</p>
          )}
          {state.error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="import-file">CSV file</Label>
            <Input
              id="import-file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
            {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-csv">…or paste CSV</Label>
            <Textarea id="import-csv" name="csv" rows={6} placeholder={CSV_PLACEHOLDER} className="font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-label">Batch label</Label>
            <Input id="import-label" name="label" placeholder="MikroTik export — August" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />}
              Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSelectedDialog({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteVouchersAction, initialOp);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (!state.success) return;
    toast.success(state.success);
    const t = setTimeout(() => {
      onDone();
      setOpen(false);
    }, 0);
    return () => clearTimeout(t);
  }, [state, onDone]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" className="rounded-lg">
          <Trash2 data-icon="inline-start" aria-hidden /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {ids.length} voucher(s)?</DialogTitle>
          <DialogDescription>
            Only unsold vouchers can be deleted. Sold or reserved vouchers are protected.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {ids.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />}
              Delete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
