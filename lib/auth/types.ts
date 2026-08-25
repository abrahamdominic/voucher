import type { UserRole } from "@/types/database";/** Dashboard sections that can be guarded. */
export type AdminSection =
  | "dashboard"
  | "orders"
  | "vouchers"
  | "plans"
  | "customers"
  | "payments"
  | "analytics"
  | "wifi"
  | "notifications"
  | "staff"
  | "settings"
  | "audit-logs";

/**
 * Permission matrix from the spec (§27): section → minimum roles allowed.
 * Client-safe: no server-only imports.
 */
export const PERMISSIONS = {
  dashboard: ["staff", "admin", "super_admin"],
  orders: ["staff", "admin", "super_admin"],
  vouchers: ["staff", "admin", "super_admin"],
  plans: ["admin", "super_admin"],
  customers: ["admin", "super_admin"],
  payments: ["admin", "super_admin"],
  analytics: ["admin", "super_admin"],
  wifi: ["super_admin"],
  notifications: ["admin", "super_admin"],
  staff: ["super_admin"],
  settings: ["super_admin"],
  "audit-logs": ["super_admin"],
} as const satisfies Record<AdminSection, readonly UserRole[]>;

/** Client-safe check used by the admin shell to filter navigation. */
export function canAccess(role: UserRole, section: AdminSection): boolean {
  return (PERMISSIONS[section] as readonly UserRole[]).includes(role);
}
