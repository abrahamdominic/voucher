"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { login, requestPasswordReset, type AuthState } from "@/app/admin/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialAuth: AuthState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/admin";

  const [mode, setMode] = useState<"login" | "reset">("login");
  const [loginState, loginAction, loginPending] = useActionState(login, initialAuth);
  const [resetState, resetAction, resetPending] = useActionState(requestPasswordReset, initialAuth);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>{mode === "login" ? "Sign in" : "Reset password"}</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Access the NK Swift DATA dashboard."
            : "We'll email you a secure reset link."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode === "login" ? (
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            {loginState.error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{loginState.error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" placeholder="admin@nkswiftdata.com" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" disabled={loginPending} className="h-10 w-full rounded-xl">
              {loginPending && <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />}
              Sign in
            </Button>
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot your password?
            </button>
          </form>
        ) : (
          <form action={resetAction} className="space-y-4">
            {resetState.error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{resetState.error}</AlertDescription>
              </Alert>
            )}
            {!resetState.error && !resetPending && (
              <p aria-live="polite" className="text-sm text-muted-foreground">
                If an account exists for that address, a reset link is on its way.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" name="email" type="email" required />
            </div>
            <Button type="submit" disabled={resetPending} className="h-10 w-full rounded-xl">
              {resetPending && <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />}
              Send reset link
            </Button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
