import Link from "next/link";
import { ShieldCheck, Zap, Clock3 } from "lucide-react";

import { BrandLogo } from "@/components/customer/brand-logo";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="NK Swift DATA home" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandLogo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/voucher">Check my voucher</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/connect">
              <Zap data-icon="inline-start" /> Get Connected
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1">
          <BrandLogo />
          <p className="text-xs text-muted-foreground">
            Fast Wi-Fi vouchers for guests. Pay securely, connect instantly.
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden /> Secure payment
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" aria-hidden /> Instant voucher
          </li>
          <li>
            <Link href="/voucher" className="underline-offset-4 hover:underline">
              Check my voucher
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
