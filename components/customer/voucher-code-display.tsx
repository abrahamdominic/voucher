"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function VoucherCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Voucher code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please write the code down.");
    }
  }

  return (
    <div className="mt-8 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-5 py-6">
      <p className="text-xs font-medium uppercase tracking-widest text-primary/80">Voucher code</p>
      <p
        aria-label={`Voucher code ${code}`}
        className="mt-2 select-all break-all font-mono text-3xl font-bold tracking-wider sm:text-4xl"
      >
        {code}
      </p>
      <Button onClick={copy} variant={copied ? "secondary" : "default"} size="lg" className="mt-5 h-11 w-full max-w-xs rounded-xl text-base">
        {copied ? <Check data-icon="inline-start" aria-hidden /> : <Copy data-icon="inline-start" aria-hidden />}
        {copied ? "Copied!" : "Copy code"}
      </Button>
    </div>
  );
}
