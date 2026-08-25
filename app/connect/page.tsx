import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Timer, WifiHigh } from "lucide-react";

import { BrandLogo } from "@/components/customer/brand-logo";
import { WifiVisual } from "@/components/customer/wifi-visual";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Guest Wi-Fi",
  description: "Fast, reliable Wi-Fi for guests.",
  robots: { index: false },
};

export default function ConnectPage() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-gradient-to-b from-muted/50 to-background">
      <WifiVisual />
      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/80 p-8 text-center shadow-xl shadow-black/5 backdrop-blur-sm sm:p-10">
          <BrandLogo className="justify-center" />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">Legeniwo Wi-Fi</h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            Fast, reliable Wi-Fi for our guests.
          </p>

          <Button size="lg" asChild className="mt-8 h-12 w-full rounded-2xl text-base shadow-lg shadow-primary/25">
            <Link href="/connect/plans">
              Get connected <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>

          <ul className="mt-8 space-y-2.5 text-left text-sm text-muted-foreground">
            <li className="flex items-center gap-2.5">
              <Timer className="size-4 shrink-0 text-primary" aria-hidden /> Connected in under a minute
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden /> Secure payment, instant voucher
            </li>
            <li className="flex items-center gap-2.5">
              <WifiHigh className="size-4 shrink-0 text-primary" aria-hidden /> No account required
            </li>
          </ul>

          <p className="mt-8 border-t border-border/60 pt-5 text-xs text-muted-foreground">
            Already have a code?{" "}
            <Link href="/voucher" className="font-medium text-primary underline-offset-4 hover:underline">
              Check my voucher
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
