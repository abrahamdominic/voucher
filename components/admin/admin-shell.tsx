"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  UsersRound,
  Wifi,
} from "lucide-react";

import { logout } from "@/app/admin/actions/auth";
import { GlobalSearch } from "@/components/admin/global-search";
import { BrandLogo } from "@/components/customer/brand-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { canAccess } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

import type { Profile } from "@/types/database";
import type { AdminSection } from "@/lib/auth/types";

const NAV: Array<{ section: AdminSection; label: string; href: string; icon: typeof LayoutDashboard }> = [
  { section: "dashboard", label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { section: "orders", label: "Orders", href: "/admin/orders", icon: ReceiptText },
  { section: "vouchers", label: "Vouchers", href: "/admin/vouchers", icon: Ticket },
  { section: "plans", label: "Plans", href: "/admin/plans", icon: ClipboardList },
  { section: "customers", label: "Customers", href: "/admin/customers", icon: Users },
  { section: "payments", label: "Payments", href: "/admin/payments", icon: CreditCard },
  { section: "wifi", label: "Wi-Fi Settings", href: "/admin/wifi", icon: Wifi },
  { section: "analytics", label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { section: "notifications", label: "Notifications", href: "/admin/notifications", icon: Gauge },
  { section: "staff", label: "Staff", href: "/admin/staff", icon: UsersRound },
  { section: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
  { section: "audit-logs", label: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
};

export function AdminShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((item) => canAccess(profile.role, item.section));

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const initials = (profile.full_name ?? profile.email)
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const navList = (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring",
            isActive(item.href)
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className="size-4 shrink-0" aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-svh w-full bg-muted/30">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar px-3 py-4 lg:flex">
          <Link href="/admin" className="mb-6 flex items-center rounded-lg px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandLogo />
          </Link>
          <div className="flex-1 overflow-y-auto">{navList}</div>
          <div className="mt-4 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{profile.full_name ?? profile.email}</p>
                <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[profile.role]}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <form action={logout}>
                    <Button variant="ghost" size="icon-sm" type="submit" aria-label="Log out">
                      <LogOut />
                    </Button>
                  </form>
                </TooltipTrigger>
                <TooltipContent>Log out</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md sm:px-6">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-3">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="mb-4 px-1.5 pt-1">
                  <BrandLogo />
                </div>
                {navList}
                <form action={logout} className="mt-4 border-t border-border/60 pt-3">
                  <Button variant="ghost" size="sm" type="submit" className="w-full justify-start text-muted-foreground">
                    <LogOut data-icon="inline-start" /> Log out
                  </Button>
                </form>
              </SheetContent>
            </Sheet>

            <GlobalSearch />

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:inline-flex">
                {ROLE_LABEL[profile.role]}
              </span>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
