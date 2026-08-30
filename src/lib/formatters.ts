const currencyCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  let fmt = currencyCache.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyCache.set(currency, fmt);
  }
  return fmt;
}

export function formatCurrency(value: number, currency = "USD"): string {
  if (!isFinite(value)) return "—";
  return getCurrencyFormatter(currency).format(value);
}

export function formatPnl(value: number, currency = "USD"): string {
  if (!isFinite(value)) return "—";
  if (value === 0) return getCurrencyFormatter(currency).format(0);
  return `${value > 0 ? "+" : "-"}${getCurrencyFormatter(currency).format(Math.abs(value))}`;
}

export function formatNumber(value: number, maxFractionDigits = 2): string {
  if (!isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value == null || !isFinite(value)) return "—";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value)}%`;
}

/** +6.4% / -2.1% — signed percentage, useful for return on recap cards. */
export function formatSignedPct(value: number | null, digits = 1): string {
  if (value == null || !isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value)}%`;
}

/** +2R / -1.2R / 0R */
export function formatR(value: number | null | undefined, digits = 1): string {
  if (value == null || !isFinite(value)) return "—R";
  const rounded =
    Math.round(value * 10 ** digits) / 10 ** digits;
  const sign = rounded > 0 ? "+" : "";
  const num = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(rounded);
  return `${sign}${num}R`;
}

/** Wraps numeric RR ratio into a display string, e.g. 2 -> "1:2" */
export function formatRR(ratio: number | null | undefined): string {
  if (ratio == null || !isFinite(ratio) || ratio <= 0) return "—";
  const rounded = Math.round(ratio * 10) / 10;
  const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(rounded);
  return `1:${num}`;
}

export function formatPrice(value: number | null | undefined, currency = ""): string {
  if (value == null || !isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : 5;
  const num = value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return currency ? `${currency} ${num}` : num;
}

export function formatCompact(value: number): string {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

const symbolCache = new Map<string, string>();

function currencySymbol(currency: string): string {
  let sym = symbolCache.get(currency);
  if (!sym) {
    try {
      sym =
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          currencyDisplay: "narrowSymbol",
        })
          .formatToParts(0)
          .find((p) => p.type === "currency")?.value ?? "";
    } catch {
      sym = "";
    }
    symbolCache.set(currency, sym);
  }
  return sym;
}

/** +$1.2k / -$850 / $0 — compact signed money for tight calendar cells. */
export function formatShortMoney(value: number, currency = "USD"): string {
  if (!isFinite(value)) return "—";
  const sym = currencySymbol(currency);
  if (value === 0) return `${sym}0`;
  const sign = value > 0 ? "+" : "-";
  const abs = Math.abs(value);
  const body =
    abs >= 1_000_000
      ? `${(abs / 1_000_000).toFixed(1)}M`
      : abs >= 1_000
        ? `${(abs / 1_000).toFixed(1)}k`
        : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(abs);
  return `${sign}${sym}${body}`;
}

export function formatDateShort(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateMedium(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateFull(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDayName(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d);
}

export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateTime(d: Date): string {
  return `${formatDateShort(d)} · ${formatTime(d)}`;
}

export function profitColorClass(value: number): string {
  if (value > 0) return "text-emerald-500";
  if (value < 0) return "text-rose-500";
  return "text-muted-foreground";
}

export function resultColorClass(result: string): string {
  switch (result) {
    case "WIN":
      return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    case "LOSS":
      return "text-rose-500 border-rose-500/30 bg-rose-500/10";
    default:
      return "text-muted-foreground border-border bg-muted/50";
  }
}