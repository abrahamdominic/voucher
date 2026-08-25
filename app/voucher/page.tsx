import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/customer/site-chrome";
import { LookupForm } from "@/components/customer/lookup-form";

export const metadata: Metadata = {
  title: "Check my voucher",
  description: "Retrieve your Wi-Fi voucher and order details.",
  robots: { index: false },
};

export default function VoucherLookupPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Check my voucher</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the phone number you paid with, plus your email address or order reference.
          </p>
          <div className="mt-8">
            <LookupForm />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
