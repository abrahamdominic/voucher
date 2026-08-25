import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · NK Swift DATA Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Server-side authorization — the proxy cookie check is only a fast pre-filter.
  const profile = await requireRole("staff");

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
