"use client";

import { useState } from "react";
import { Wifi, WifiHigh } from "lucide-react";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  /** Renders the icon mark without the wordmark (used in the admin sidebar). */
  markOnly?: boolean;
}

/**
 * Renders /images/logo.png when available (drop your file in public/images/)
 * and gracefully falls back to an inline Wi-Fi mark if it is missing.
 */
export function BrandLogo({ className, compact = false, markOnly = false }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.png"
          alt="NK Swift DATA logo"
          className="h-8 w-auto object-contain"
          onError={() => setFailed(true)}
        />
        {!markOnly && !compact && <span className="sr-only">NK Swift DATA</span>}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        {compact ? <WifiHigh className="size-4" aria-hidden /> : <Wifi className="size-4.5" aria-hidden />}
      </span>
      {!markOnly && (
        <span className="text-[15px] font-semibold tracking-tight">
          NK Swift <span className="text-primary">DATA</span>
        </span>
      )}
    </span>
  );
}
