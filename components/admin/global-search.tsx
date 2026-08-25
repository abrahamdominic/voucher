"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchAction } from "@/app/admin/actions/search";

const TYPE_LABEL: Record<string, string> = {
  order: "Orders",
  voucher: "Vouchers",
  customer: "Customers",
  payment: "Payments",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchAction>>>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length >= 3) return;
    const timeout = setTimeout(() => setHits([]), 0);
    const debounce = setTimeout(() => {
      startTransition(async () => {
        try {
          setHits(await searchAction(query));
        } catch {
          setHits([]);
        }
      });
    }, 250);
    return () => {
      clearTimeout(timeout);
      clearTimeout(debounce);
    };
  }, [query]);

  const grouped = hits.reduce<Record<string, typeof hits>>((acc, hit) => {
    (acc[hit.type] ??= []).push(hit);
    return acc;
  }, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search orders, vouchers, customers"
        className="flex h-8 w-full max-w-xs items-center gap-2 rounded-lg border border-input bg-input/30 px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-input/50 focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
      >
        <SearchIcon />
        <span className="flex-1 truncate text-left">Search…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Global search"
        description="Search orders, vouchers, customers and payments"
      >
        <CommandInput
          placeholder="Search order ID, voucher code, phone, email…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {pending && query.length >= 3 && (
            <div className="px-4 py-3 text-sm text-muted-foreground" role="status">
              Searching…
            </div>
          )}
          {!pending && query.length >= 3 && hits.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {Object.entries(grouped).map(([type, groupHits], index) => (
            <div key={type}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={TYPE_LABEL[type] ?? type}>
                {groupHits.map((hit) => (
                  <CommandItem
                    key={`${hit.type}-${hit.title}`}
                    value={`${hit.title} ${hit.subtitle}`}
                    onSelect={() => {
                      setOpen(false);
                      router.push(hit.href);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{hit.title}</span>
                    <span className="ml-2 hidden shrink-0 truncate text-xs text-muted-foreground sm:block">
                      {hit.subtitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
