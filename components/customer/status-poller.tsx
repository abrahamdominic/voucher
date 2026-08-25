"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the order status endpoint while a payment is confirming or a voucher
 * is being allocated, then refreshes the server-rendered page.
 */
export function StatusPoller({ reference }: { reference: string }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const interval = setInterval(async () => {
      setAttempts((a) => a + 1);
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(reference)}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string; voucherCode?: string | null };
        if (
          data.status === "paid" ||
          data.status === "failed" ||
          data.status === "refunded" ||
          data.voucherCode
        ) {
          done.current = true;
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // keep polling silently
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [reference, router]);

  return (
    <p className="mt-4 text-xs text-muted-foreground" role="status" aria-live="polite">
      {attempts > 6 ? "This is taking longer than usual — you can safely keep this page open." : "Checking automatically…"}
    </p>
  );
}
