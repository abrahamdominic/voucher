import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-of-network guard for the admin dashboard (Next.js 16 `proxy`, the
 * successor to middleware). This is a cheap presence check only: full session
 * validation and role-based authorization are enforced server-side in the
 * admin layout and every server action.
 *
 * IMPORTANT: /admin/login is ALWAYS passed through — even if a session cookie
 * exists.  The server-side auth in the login page handles redirecting
 * authenticated users.  This avoids a redirect loop when a stale/invalid
 * cookie is present (proxy → /admin → requireRole → /admin/login → proxy …).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow /admin/login through — never redirect it.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // For all other /admin routes, check for a session cookie.
  // @supabase/ssr sets cookies named sb-<project-ref>-auth-token.
  const hasSessionCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && (c.name.includes("auth-token") || c.name.includes("access-token")),
  );

  if (!hasSessionCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
