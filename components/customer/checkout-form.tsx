"use client";

import { useActionState } from "react";
import { Loader2, Lock } from "lucide-react";

import { initiateCheckout, type CheckoutState } from "@/app/actions/checkout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CheckoutState = {};

export function CheckoutForm({ planId }: { planId: string }) {
  const [state, formAction, pending] = useActionState(initiateCheckout, initialState);

  return (
    <form action={formAction} className="mt-6" noValidate>
      <input type="hidden" name="planId" value={planId} />

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          {state.error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="080X XXX XXXX"
              required
              aria-describedby="phone-hint"
            />
            <p id="phone-hint" className="text-xs text-muted-foreground">
              Your voucher is linked to this number.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              aria-describedby="email-hint"
            />
            <p id="email-hint" className="text-xs text-muted-foreground">
              We&apos;ll send your receipt here.
            </p>
          </div>

          {/* Secure payment section */}
          <fieldset className="rounded-xl border border-border/70 bg-muted/40 p-4">
            <legend className="px-1.5 text-xs font-medium text-muted-foreground">Secure payment</legend>
            <div className="flex items-center gap-2.5 text-sm">
              <Lock className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="text-muted-foreground">
                You&apos;ll complete payment on our secure gateway. Cards, transfers and USSD are supported.
              </span>
            </div>
          </fieldset>

          <Button type="submit" size="lg" disabled={pending} className="h-12 w-full rounded-2xl text-base font-semibold">
            {pending ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
                Processing…
              </>
            ) : (
              "Pay now"
            )}
          </Button>

          <p aria-live="polite" className="sr-only">
            {pending ? "Processing payment" : state.error ?? ""}
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
