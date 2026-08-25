"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { updateWifiSettingsAction } from "@/app/admin/actions/wifi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface WifiSettingsValues {
  networkName: string;
  captivePortalUrl: string;
  accessPointName: string;
  routerIdentifier: string;
  authMethod: string;
  sessionDurationMinutes: number;
  defaultSpeedMbps: string;
  defaultDataLimitMb: string | number;
  defaultDeviceLimit: number;
  instructions: string;
}

export function WifiSettingsForm({
  initial: values,
  canEdit,
  lastUpdated,
}: {
  initial: WifiSettingsValues;
  canEdit: boolean;
  lastUpdated: string;
}) {
  const [state, formAction, pending] = useActionState(updateWifiSettingsAction, {});

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network & defaults</CardTitle>
        <CardDescription>Last updated {lastUpdated}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="networkName">Network name (SSID)</Label>
              <Input id="networkName" name="networkName" defaultValue={values.networkName} required maxLength={100} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessPointName">Access point name</Label>
              <Input id="accessPointName" name="accessPointName" defaultValue={values.accessPointName} disabled={!canEdit} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="captivePortalUrl">Captive portal URL</Label>
              <Input id="captivePortalUrl" name="captivePortalUrl" type="url" placeholder="https://" defaultValue={values.captivePortalUrl} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routerIdentifier">Router identifier</Label>
              <Input id="routerIdentifier" name="routerIdentifier" defaultValue={values.routerIdentifier} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authMethod">Authentication method</Label>
              <Select name="authMethod" defaultValue={values.authMethod} disabled={!canEdit}>
                <SelectTrigger id="authMethod" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voucher_code">Voucher code</SelectItem>
                  <SelectItem value="username_password">Username / password</SelectItem>
                  <SelectItem value="mac_address">MAC address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionDurationMinutes">Session duration (minutes)</Label>
              <Input id="sessionDurationMinutes" name="sessionDurationMinutes" type="number" min={1} defaultValue={values.sessionDurationMinutes} required disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultSpeedMbps">Default speed</Label>
              <Input id="defaultSpeedMbps" name="defaultSpeedMbps" placeholder="Up to 20 Mbps" defaultValue={values.defaultSpeedMbps} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDataLimitMb">Default data limit (MB)</Label>
              <Input id="defaultDataLimitMb" name="defaultDataLimitMb" type="number" min={0} placeholder="empty = unlimited" defaultValue={values.defaultDataLimitMb} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDeviceLimit">Default device limit</Label>
              <Input id="defaultDeviceLimit" name="defaultDeviceLimit" type="number" min={1} defaultValue={values.defaultDeviceLimit} required disabled={!canEdit} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="instructions">Connection instructions shown to customers</Label>
              <Textarea id="instructions" name="instructions" rows={4} defaultValue={values.instructions} disabled={!canEdit} />
            </div>
          </div>
        </CardContent>
        {canEdit && (
          <CardFooter className="justify-end gap-2 border-t border-border/60 py-4">
            <Button type="submit" size="sm" className="rounded-lg" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden /> : <Save data-icon="inline-start" aria-hidden />}
              Save changes
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
