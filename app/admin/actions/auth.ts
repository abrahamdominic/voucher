"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { logAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export interface AuthState {
  error?: string;
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  // Brute-force protection: 8 attempts / 10 minutes per IP+email.
  const limited = rateLimit(`login:${ip}:${email}`, 8, 600);
  if (!limited.ok) {
    return { error: "Too many attempts. Please try again later." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid credentials." };
  }

  // Verify the account is an active staff/admin profile.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "This account is not authorized. Contact your administrator." };
  }

  await logAudit({
    actorId: data.user.id,
    actorEmail: email,
    action: "admin.login",
    resourceType: "profile",
    resourceId: data.user.id,
    ipAddress: ip,
  });

  redirect(nextPath.startsWith("/admin") && nextPath !== "/admin/login" ? nextPath : "/admin");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "admin.logout",
      resourceType: "profile",
      resourceId: user.id,
      ipAddress: ip,
    });
  }

  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * Sends a Supabase password-reset email. Always reports success to avoid
 * leaking which addresses exist.
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders);
  const limited = rateLimit(`reset:${ip}`, 5, 900);
  if (!limited.ok) return { error: "Too many requests. Try again later." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/login`,
  });

  return {};
}
