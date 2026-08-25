"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";

import { lookupOrders, type LookupState } from "@/app/actions/lookup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatNaira } from "@/lib/format";

const initialState: LookupState = {};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  cancelled: "outline",
  refunded: "outline",
};

export function LookupForm() {
  const [state, formAction, pending] = useActionState(lookupOrders, initialState);

  return (
    <div className="space-y-6">
      <form action={formAction} noValidate>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier">Email or order reference</Label>
              <Input id="identifier" name="identifier" placeholder="you@example.com or NKW-XXXXXX" required />
            </div>

            <Button type="submit" disabled={pending} className="h-11 w-full rounded-xl">
              {pending ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden /> Searching…
                </>
              ) : (
                <>
                  <Search data-icon="inline-start" aria-hidden /> Find my orders
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {state.orders && state.orders.length === 0 && (
        <p className="text-center text-sm text-muted-foreground" role="status">
          No orders found for those details.
        </p>
      )}

      {state.orders && state.orders.length > 0 && (
        <ul className="space-y-3" aria-label="Your orders">
          {state.orders.map((order) => (
            <li key={order.reference}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-medium">{order.reference}</span>
                      <Badge variant={statusVariant[order.status] ?? "secondary"}>{order.status}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {order.planName} · {formatNaira(order.amountKobo)} · {formatDate(order.createdAt)}
                    </p>
                    {order.voucherCode && (
                      <p className="font-mono text-sm font-semibold text-primary select-all">{order.voucherCode}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild className="shrink-0 self-start rounded-lg sm:self-auto">
                    <Link href={`/receipt/${order.reference}`}>View receipt</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
