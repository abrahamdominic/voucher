import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-of-network guard for the admin dashboard (Next.js 16 `proxy`, the
 * successor to middleware). This is a cheap presence check only: full session
 * validation and role-based authorization are enforced server-side in the
 * admin layout and every server action.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie =
    request.cookies.has("sb-access-token") ||
    request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  const { pathname } = request.nextUrl;

  // Unauthenticated users hitting admin pages → login.
  if (!hasSessionCookie && pathname !== "/admin/login") {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users on the login page → dashboard.
  if (hasSessionCookie && pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
