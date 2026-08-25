"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  inviteStaffAction,
  updateStaffAction,
  type StaffOpState,
} from "@/app/admin/actions/staff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format";

const initial: StaffOpState = {};

export interface StaffMemberView {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleBadgeVariant = {
  super_admin: "default",
  admin: "secondary",
  staff: "outline",
} as const;

export function StaffManager({
  members,
  currentUserId,
}: {
  members: StaffMemberView[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-5">
      <InviteForm />

      <Card className="py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>
            Deactivating a member also revokes their login. You cannot change your own account.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2">
          <ul className="divide-y divide-border/60">
            {members.map((m) => (
              <MemberRow key={m.id} member={m} isSelf={m.id === currentUserId} />
            ))}
            {members.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">No team members.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteStaffAction, initial);

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a teammate</CardTitle>
        <CardDescription>Sends an email invitation to join the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full space-y-2 sm:max-w-56">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" name="email" type="email" required placeholder="staff@example.com" />
          </div>
          <div className="w-full space-y-2 sm:max-w-44">
            <Label htmlFor="invite-name">Name</Label>
            <Input id="invite-name" name="fullName" maxLength={120} placeholder="Ada Obi" />
          </div>
          <div className="w-full space-y-2 sm:w-40">
            <Label htmlFor="invite-role">Role</Label>
            <Select name="role" defaultValue="staff">
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending} className="rounded-lg">
            {pending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
            ) : (
              <UserPlus data-icon="inline-start" aria-hidden />
            )}
            Invite
          </Button>
        </form>
        {state.error && (
          <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MemberRow({ member, isSelf }: { member: StaffMemberView; isSelf: boolean }) {
  const [state, formAction, pending] = useActionState(updateStaffAction, initial);
  const [role, setRole] = useState(member.role);
  const [isActive, setIsActive] = useState(member.isActive);

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);

  const dirty = role !== member.role || isActive !== member.isActive;

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 py-3.5">
      <input type="hidden" name="id" value={member.id} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="isActive" value={String(isActive)} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.fullName ?? member.email}</p>
        <p className="truncate text-xs text-muted-foreground">
          {member.fullName ? `${member.email} · ` : ""}joined {formatDate(member.createdAt)}
        </p>
      </div>

      <Badge variant={roleBadgeVariant[member.role as keyof typeof roleBadgeVariant] ?? "outline"}>
        {member.role.replace("_", " ")}
      </Badge>

      <Select value={role} onValueChange={setRole} disabled={isSelf || pending}>
        <SelectTrigger size="sm" className="w-36" aria-label={`Role for ${member.email}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="staff">Staff</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="super_admin">Super admin</SelectItem>
        </SelectContent>
      </Select>

      {!isSelf && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={isActive} onCheckedChange={setIsActive} disabled={pending} aria-label="Active" />
          Active
        </label>
      )}

      {dirty && !isSelf && (
        <>
          <Button type="submit" size="sm" className="rounded-lg" disabled={pending}>
            {pending && <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />}
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-lg"
            onClick={() => {
              setRole(member.role);
              setIsActive(member.isActive);
            }}
          >
            Reset
          </Button>
        </>
      )}
    </form>
  );
}
