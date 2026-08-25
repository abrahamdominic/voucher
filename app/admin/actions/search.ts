"use server";

import { globalSearch } from "@/lib/search";
import { requireRole } from "@/lib/auth/session";

/** Server-side search entry point for the admin command palette. */
export async function searchAction(query: string) {
  await requireRole("staff");
  return globalSearch(query);
}
