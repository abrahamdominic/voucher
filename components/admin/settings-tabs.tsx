"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import {
  saveBrandingSettingsAction,
  saveBusinessSettingsAction,
  saveNotificationSettingsAction,
  type SettingsOpState,
} from "@/app/admin/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const initial: SettingsOpState = {};

function useSettingsToast(state: SettingsOpState) {
  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" size="sm" className="rounded-lg" disabled={pending}>
      {pending ? (
        <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
      ) : (
        <Save data-icon="inline-start" aria-hidden />
      )}
      Save
    </Button>
  );
}

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  );
}

export function SettingsTabs({
  business,
  branding,
  notifications,
}: {
  business: { name: string; phone: string; email: string; address: string; supportInfo: string };
  branding: { websiteTitle: string; logoUrl: string; primaryColor: string; secondaryColor: string; description: string };
  notifications: { emailEnabled: boolean; smsEnabled: boolean; whatsappEnabled: boolean; telegramEnabled: boolean };
}) {
  return (
    <Tabs defaultValue="business">
      <TabsList>
        <TabsTrigger value="business">Business</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      <BusinessTab values={business} />
      <BrandingTab values={branding} />
      <NotificationsTab values={notifications} />
    </Tabs>
  );
}

function BusinessTab({ values }: { values: { name: string; phone: string; email: string; address: string; supportInfo: string } }) {
  const [state, formAction, pending] = useActionState(saveBusinessSettingsAction, initial);
  useSettingsToast(state);

  return (
    <TabsContent value="business">
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>Shown on receipts and the customer site.</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <ErrorNote error={state.error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="biz-name">Name</Label>
                <Input id="biz-name" name="name" defaultValue={values.name} required maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-phone">Support phone</Label>
                <Input id="biz-phone" name="phone" type="tel" defaultValue={values.phone} maxLength={30} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-email">Support email</Label>
                <Input id="biz-email" name="email" type="email" defaultValue={values.email} maxLength={160} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="biz-address">Address</Label>
                <Input id="biz-address" name="address" defaultValue={values.address} maxLength={300} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="biz-support-info">Support info / hours</Label>
                <Textarea id="biz-support-info" name="supportInfo" rows={3} defaultValue={values.supportInfo} maxLength={500} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t border-border/60 py-4">
            <SubmitButton pending={pending} />
          </CardFooter>
        </form>
      </Card>
    </TabsContent>
  );
}

function BrandingTab({
  values,
}: {
  values: { websiteTitle: string; logoUrl: string; primaryColor: string; secondaryColor: string; description: string };
}) {
  const [state, formAction, pending] = useActionState(saveBrandingSettingsAction, initial);
  useSettingsToast(state);

  return (
    <TabsContent value="branding">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Logo path (place the file at public/images/logo.png), colors and site copy.</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <ErrorNote error={state.error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="brand-title">Website title</Label>
                <Input id="brand-title" name="websiteTitle" defaultValue={values.websiteTitle} required maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-logo">Logo URL or path</Label>
                <Input id="brand-logo" name="logoUrl" placeholder="/images/logo.png" defaultValue={values.logoUrl} maxLength={300} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-primary">Primary color</Label>
                <Input id="brand-primary" name="primaryColor" placeholder="#16a34a" defaultValue={values.primaryColor} maxLength={7} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-secondary">Secondary color</Label>
                <Input id="brand-secondary" name="secondaryColor" placeholder="#052e16" defaultValue={values.secondaryColor} maxLength={7} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="brand-desc">Homepage description</Label>
                <Textarea id="brand-desc" name="description" rows={3} defaultValue={values.description} maxLength={300} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t border-border/60 py-4">
            <SubmitButton pending={pending} />
          </CardFooter>
        </form>
      </Card>
    </TabsContent>
  );
}

function NotificationsTab({
  values,
}: {
  values: { emailEnabled: boolean; smsEnabled: boolean; whatsappEnabled: boolean; telegramEnabled: boolean };
}) {
  const [state, formAction, pending] = useActionState(saveNotificationSettingsAction, initial);
  useSettingsToast(state);

  const channels = [
    { id: "emailEnabled", label: "Email", hint: "Resend (RESEND_API_KEY)" },
    { id: "smsEnabled", label: "SMS", hint: "Twilio (TWILIO_*)" },
    { id: "whatsappEnabled", label: "WhatsApp", hint: "Meta Cloud API (WHATSAPP_*)" },
    { id: "telegramEnabled", label: "Telegram", hint: "Bot API (TELEGRAM_*)" },
  ] as const;

  return (
    <TabsContent value="notifications">
      <Card>
        <CardHeader>
          <CardTitle>Customer notifications</CardTitle>
          <CardDescription>
            Choose which channels receive payment/voucher messages. Unconfigured providers log to the server console.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-3">
            <ErrorNote error={state.error} />
            {channels.map((c) => (
              <label
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-3 py-3"
              >
                <span>
                  <span className="block text-sm font-medium">{c.label}</span>
                  <span className="block text-xs text-muted-foreground">{c.hint}</span>
                </span>
                <Switch name={c.id} defaultChecked={values[c.id]} disabled={pending} />
              </label>
            ))}
          </CardContent>
          <CardFooter className="justify-end border-t border-border/60 py-4">
            <SubmitButton pending={pending} />
          </CardFooter>
        </form>
      </Card>
    </TabsContent>
  );
}
