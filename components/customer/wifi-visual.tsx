import { cn } from "@/lib/utils";

/**
 * Decorative Wi-Fi/network visual — concentric arcs with soft gradient,
 * pure SVG so it scales crisply and adds zero network weight.
 */
export function WifiVisual({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <svg
        className="absolute -top-24 right-[-15%] size-[560px] text-primary/10 sm:right-[-8%] lg:size-[720px]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <defs>
          <radialGradient id="wifi-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill="url(#wifi-glow)" />
        {[30, 55, 80].map((r) => (
          <circle key={r} cx="100" cy="118" r={r} stroke="currentColor" strokeWidth="2.5" fill="none" />
        ))}
        <path d="M78 108a32 32 0 0 1 44 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M88 96a18 18 0 0 1 24 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="100" cy="112" r="4.5" fill="currentColor" />
      </svg>
      <div className="absolute bottom-[-40%] left-[-10%] size-[480px] rounded-full bg-primary/5 blur-3xl" />
    </div>
  );
}
