"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SESSIONS,
  STRATEGIES,
  RESULT_OPTIONS,
} from "@/lib/constants";

export interface JournalFilterState {
  q?: string;
  session?: string;
  result?: string;
  symbol?: string;
  strategy?: string;
  sort?: string;
}

export function JournalToolbar({
  symbols = [],
  filters,
}: {
  symbols?: string[];
  filters: JournalFilterState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(filters.q ?? "");

  const setParam = React.useCallback(
    (changes: JournalFilterState) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === undefined || v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Debounced search
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (filters.q ?? "")) setParam({ q: q || undefined });
    }, 300);
    return () => clearTimeout(t);
  }, [q, filters.q, setParam]);

  const activeCount =
    (filters.session ? 1 : 0) +
    (filters.result ? 1 : 0) +
    (filters.symbol ? 1 : 0) +
    (filters.strategy ? 1 : 0) +
    (filters.q ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search symbol, notes, strategy…"
          className="h-8 w-56 pl-8 pr-8"
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setParam({ q: undefined });
            }}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <FilterSelect
        value={filters.result ?? ""}
        options={[{ value: "", label: "Result" }, ...RESULT_OPTIONS]}
        onChange={(v) => setParam({ result: v || undefined })}
      />

      <FilterSelect
        value={filters.session ?? ""}
        options={[
          { value: "", label: "Session" },
          ...SESSIONS.map((s) => ({ value: s, label: s })),
        ]}
        onChange={(v) => setParam({ session: v || undefined })}
      />

      {symbols.length > 0 && (
        <FilterSelect
          value={filters.symbol ?? ""}
          options={[
            { value: "", label: "Symbol" },
            ...symbols.map((s) => ({ value: s, label: s })),
          ]}
          onChange={(v) => setParam({ symbol: v || undefined })}
        />
      )}

      <FilterSelect
        value={filters.strategy ?? ""}
        options={[
          { value: "", label: "Strategy" },
          ...STRATEGIES.map((s) => ({ value: s, label: s })),
        ]}
        onChange={(v) => setParam({ strategy: v || undefined })}
      />

      <FilterSelect
        value={filters.sort ?? "date-desc"}
        options={[
          { value: "date-desc", label: "Newest" },
          { value: "date-asc", label: "Oldest" },
          { value: "pnl-desc", label: "Best P&L" },
          { value: "pnl-asc", label: "Worst P&L" },
          { value: "r-desc", label: "Best R" },
          { value: "r-asc", label: "Worst R" },
        ]}
        onChange={(v) => setParam({ sort: v || "date-desc" })}
      />

      {activeCount > 0 && (
        <button
          onClick={() => setParam({ q: undefined, session: undefined, result: undefined, symbol: undefined, strategy: undefined })}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger size="sm" className="max-w-40">
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}