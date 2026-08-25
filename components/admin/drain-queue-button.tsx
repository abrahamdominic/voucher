"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { drainQueueAction } from "@/app/admin/actions/notifications";
import { Button } from "@/components/ui/button";

export function DrainQueueButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="secondary"
      className="rounded-lg"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await drainQueueAction();
          if (result.sent + result.failed === 0) toast.info("Queue is empty.");
          else {
            toast.success(
              `Drained queue: ${result.sent} sent${result.failed ? `, ${result.failed} failed` : ""}.`
            );
          }
          router.refresh();
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : ""} data-icon="inline-start" aria-hidden />
      Process queue now
    </Button>
  );
}
