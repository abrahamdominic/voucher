import { differenceInSeconds } from "date-fns";

/** Format kobo as Naira: 150000 -> ₦1,500 */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG", { maximumFractionDigits: naira % 1 === 0 ? 0 : 2 })}`;
}

/** Human duration from hours: 24 -> "24 hours", 168 -> "7 days" */
export function formatDuration(hours: number): string {
  if (hours % 168 === 0 && hours >= 168) {
    const weeks = hours / 168;
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (hours % 24 === 0 && hours >= 24) {
    const days = hours / 24;
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

export function formatData(mb: number | null | undefined): string {
  if (mb == null) return "Unlimited data";
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function relativeExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "Starts on activation";
  const seconds = differenceInSeconds(new Date(expiresAt), new Date());
  if (seconds <= 0) return "Expired";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
