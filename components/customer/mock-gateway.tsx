"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function MockGatewayClient({ reference }: { reference: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "success" | "failed">(null);

  async function complete(outcome: "success" | "failed") {
    setLoading(outcome);
    try {
      const res = await fetch("/api/mock-pay/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, outcome }),
      });
      if (!res.ok) {
        toast.error("Something went wrong. Please try again.");
        setLoading(null);
        return;
      }
      router.push(`/success/${reference}`);
    } catch {
      toast.error("Network error. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <Button
        className="h-12 w-full rounded-xl text-base"
        disabled={loading !== null}
        onClick={() => complete("success")}
      >
        {loading === "success" ? (
          <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
        ) : (
          <Zap data-icon="inline-start" aria-hidden />
        )}
        Pay now
      </Button>
      <Button
        variant="outline"
        className="w-full rounded-xl"
        disabled={loading !== null}
        onClick={() => complete("failed")}
      >
        <XCircle data-icon="inline-start" aria-hidden /> Simulate failure
      </Button>
    </div>
  );
}
