import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, GaugeCircle, TicketCheck, Wifi, Zap } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/customer/site-chrome";
import { WifiVisual } from "@/components/customer/wifi-visual";
import { PlanCard } from "@/components/customer/plan-card";
import { Button } from "@/components/ui/button";
import { createPublicClient } from "@/lib/supabase/public";

import type { Plan } from "@/types/database";

export const metadata: Metadata = {
  title: "NK Swift DATA — Connect to fast, reliable Wi-Fi",
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: GaugeCircle,
    title: "Fast internet",
    description: "High-speed browsing for streaming, work and study.",
  },
  {
    icon: CreditCard,
    title: "Secure payment",
    description: "Pay with card, transfer or USSD through a trusted gateway.",
  },
  {
    icon: TicketCheck,
    title: "Instant voucher",
    description: "Your access code is issued the moment payment clears.",
  },
  {
    icon: Zap,
    title: "Easy activation",
    description: "Connect to the network, enter your code, start browsing.",
  },
] as const;

async function getActivePlans(): Promise<Plan[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return (data as Plan[]) ?? [];
}

export default async function HomePage() {
  const plans = await getActivePlans();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <WifiVisual />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary sm:text-sm">
              <Wifi className="size-3.5" aria-hidden />
              Fast Wi-Fi
            </p>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              NK Swift DATA
            </h1>
            <p className="mt-3 max-w-xl text-lg font-medium text-muted-foreground sm:text-xl">
              Connect to fast, reliable Wi-Fi
            </p>
            <p className="mt-4 max-w-md text-pretty text-base text-muted-foreground">
              Get connected in under a minute. Choose a plan, pay securely, and receive your access
              voucher instantly.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild className="h-12 rounded-full px-8 text-base shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5">
                <Link href="/connect">
                  Get Connected <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>

            <dl className="mt-14 grid w-full max-w-3xl grid-cols-2 gap-3 text-left sm:grid-cols-4 sm:gap-4">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                >
                  <Icon className="size-5 text-primary" aria-hidden />
                  <dt className="mt-2.5 text-sm font-medium">{title}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Plans preview */}
        {plans.length > 0 && (
          <section className="border-t border-border/60 bg-muted/30 py-16 sm:py-20" aria-labelledby="plans-heading">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
              <div className="mx-auto max-w-xl text-center">
                <h2 id="plans-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Choose your plan
                </h2>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  Simple hourly and daily pricing. No account needed.
                </p>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} selected={false} onSelect={null} />
                ))}
              </div>
              <div className="mt-10 text-center">
                <Button variant="outline" size="lg" asChild className="rounded-full">
                  <Link href="/connect/plans">
                    See all plans <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="py-16 sm:py-20" aria-labelledby="how-heading">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 id="how-heading" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <ol className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-4 sm:gap-4">
              {[
                "Choose a Wi-Fi plan",
                "Pay securely",
                "Receive your voucher instantly",
                "Enter the code and start browsing",
              ].map((step, index) => (
                <li key={step} className="relative flex flex-col items-center gap-3 text-center">
                  <span className="flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
