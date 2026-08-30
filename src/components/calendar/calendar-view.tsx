"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Share2, CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { CardShell, EmptyState } from "@/components/ui/card-shell";
import { formatPnl, formatR, formatShortMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  getMonthGrid,
  monthKey,
  monthLabel,
  parseMonthKey,
  shiftMonthKey,
} from "@/lib/dates";
import { summarizePerformance, type TradeLike } from "@/lib/calculations/metrics";

export type CalendarTrade = {
  ts: number;
  pnl: number | null;
  rMultiple: number | null;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  symbol: string;
  direction: "LONG" | "SHORT";
};

const CELL_OPTIONS = [
  { value: "r", label: "R" },
  { value: "pct", label: "%" },
  { value: "pnl", label: "Net P&L" },
] as const;

type CellMetric = (typeof CELL_OPTIONS)[number]["value"];

export function CalendarView({
  trades,
  currency = "USD",
  accountScope = "all",
  initialMonth,
  startBalance = 0,
}: {
  trades: CalendarTrade[];
  currency?: string;
  accountScope?: string;
  initialMonth: string;
  startBalance?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = React.useState(() => parseMonthKey(initialMonth));
  const [cellMetric, setCellMetric] = React.useState<CellMetric>("r");

  const monthStr = monthKey(month);
  const next = shiftMonthKey(monthStr, 1);
  const prev = shiftMonthKey(monthStr, -1);

  const navigate = (key: string) => {
    setMonth(parseMonthKey(key));
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", key);
    router.replace(`/calendar?${params.toString()}`, { scroll: false });
  };

  const monthTrades = React.useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1).getTime();
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    return trades.filter((t) => t.ts >= start && t.ts <= end);
  }, [trades, month]);

  const asLike = (t: CalendarTrade): TradeLike => ({ ...t, closedAt: new Date(t.ts) });

  const summary = React.useMemo(() => summarizePerformance(monthTrades.map(asLike)), [monthTrades]);

  const dayKeyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const dayStartMs = (x: Date | number): number => {
    const d = new Date(x);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  /** Returns the portfolio balance at the very start of a day, given all
   *  trade history + the accounts' initial balances. */
  const balanceBefore = React.useMemo(() => {
    const sorted = [...trades].sort((a, b) => a.ts - b.ts);
    const segs: { start: number; pnl: number }[] = [];
    for (const t of sorted) {
      const start = dayStartMs(t.ts);
      const last = segs[segs.length - 1];
      if (last && last.start === start) last.pnl += t.pnl ?? 0;
      else segs.push({ start, pnl: t.pnl ?? 0 });
    }
    const prefix: number[] = [];
    let run = 0;
    for (const s of segs) {
      prefix.push(run);
      run += s.pnl;
    }
    return (dayStart: number): number => {
      let lo = 0;
      let hi = segs.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (segs[mid].start < dayStart) lo = mid + 1;
        else hi = mid;
      }
      return startBalance + (prefix[lo] ?? 0);
    };
  }, [trades, startBalance]);

  const daily = React.useMemo(() => {
    const days = getMonthGrid(month.getFullYear(), month.getMonth());
    const byKey = new Map<
      string,
      { r: number; pnl: number; count: number; pct: number | null }
    >();
    for (const t of monthTrades) {
      const d = new Date(t.ts);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const cur = byKey.get(key) ?? { r: 0, pnl: 0, count: 0, pct: null };
      cur.r += t.rMultiple ?? 0;
      cur.pnl += t.pnl ?? 0;
      cur.count += 1;
      byKey.set(key, cur);
    }
    for (const cell of days) {
      if (!cell) continue;
      const key = dayKeyOf(cell);
      const stats = byKey.get(key);
      if (!stats) continue;
      const bal = balanceBefore(dayStartMs(cell));
      stats.pct = bal > 0 ? (stats.pnl / bal) * 100 : null;
    }
    return { cells: days, byKey };
  }, [monthTrades, month, balanceBefore]);

  const monthReturnPct = React.useMemo(() => {
    if (summary.totalPnl === 0) return null;
    const bal = balanceBefore(dayStartMs(new Date(month.getFullYear(), month.getMonth(), 1)));
    return summary.totalPnl != null && bal > 0 ? (summary.totalPnl / bal) * 100 : null;
  }, [summary.totalPnl, month, balanceBefore]);

  const maxAbs = React.useMemo(() => {
    let m = 1;
    for (const v of daily.byKey.values()) m = Math.max(m, Math.abs(v.r));
    return m;
  }, [daily]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {summary.tradeCount} trade{summary.tradeCount === 1 ? "" : "s"} this month
            {summary.tradeCount > 0 && (
              <>
                {" · "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatR(summary.totalR)} <span className="text-muted-foreground">({formatPnl(summary.totalPnl, currency)})</span>
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(prev)} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(month)}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(next)} aria-label="Next month">
              <ChevronRight />
            </Button>
          </div>
          <Link href={`/recap?type=monthly&account=${accountScope}&month=${monthStr}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <Share2 data-icon="inline-start" /> Share Month
            </Link>
        </div>
      </header>

      {monthTrades.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title={`No trades in ${monthLabel(month)}`}
          description="Traded days will show up here with their R multiple."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="R Multiple" value={formatR(summary.totalR)} tone={summary.totalR >= 0 ? "positive" : "negative"} />
            <StatCard label="Net P&L" value={formatPnl(summary.totalPnl, currency)} tone={summary.totalPnl >= 0 ? "positive" : "negative"} />
            <StatCard label="Return %" value={monthReturnPct == null ? "—" : formatPct(monthReturnPct)} tone={monthReturnPct == null ? undefined : monthReturnPct >= 0 ? "positive" : "negative"} />
            <StatCard label="Win Rate" value={summary.winRate == null ? "—" : `${summary.winRate.toFixed(1)}%`} />
            <StatCard label="Avg R / Trade" value={formatR(summary.expectancyR)} tone={summary.expectancyR != null && summary.expectancyR >= 0 ? "positive" : "negative"} />
          </div>

          <CardShell
            title="Trading Calendar"
            description={`Color intensity reflects the day's ${cellMetric === "r" ? "R multiple" : cellMetric === "pct" ? "return %" : "net P&L"}`}
            action={
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                {CELL_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setCellMetric(o.value)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      cellMetric === o.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="text-center text-[11px] font-medium text-muted-foreground uppercase">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {daily.cells.map((cell, i) => {
                  if (!cell) return <div key={i} className="h-16 rounded-lg sm:h-24" />;
                  const key = dayKeyOf(cell);
                  const stats = daily.byKey.get(key);
                  const isToday = new Date().toDateString() === cell.toDateString();
                  return (
                    <Link
                      key={i}
                      href={`/recap?type=daily&account=${accountScope}&month=${monthStr}&day=${cell.getDate()}`}
                      className={cn(
                        "flex h-16 flex-col justify-between rounded-lg border border-border p-1.5 transition-transform hover:scale-[1.03] sm:h-24 sm:p-2",
                        isToday && "border-primary"
                      )}
                      style={stats ? dayColor(stats.r, maxAbs) : undefined}
                    >
                      <span className="text-[11px] font-medium tabular-nums">
                        {cell.getDate()}
                      </span>
                      {stats && stats.count > 0 ? (
                        <span className={cn("text-[10px] font-semibold tabular-nums sm:text-xs", toneClass(stats.r))}>
                          {cellMetric === "r"
                            ? `${stats.r >= 0 ? "+" : ""}${stats.r.toFixed(1)}`
                            : cellMetric === "pct"
                              ? stats.pct == null
                                ? "—"
                                : formatPct(stats.pct)
                              : formatShortMoney(stats.pnl, currency)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">·</span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-4 pt-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-sm bg-rose-500/80" /> Losing day
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-sm bg-emerald-500/80" /> Winning day
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-sm bg-muted border border-border" /> Flat
                </span>
              </div>
            </div>
          </CardShell>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-semibold tabular-nums", tone === "positive" && "text-emerald-500", tone === "negative" && "text-rose-500")}>
        {value}
      </div>
    </div>
  );
}

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function dayColor(r: number, maxAbs: number): React.CSSProperties {
  const intensity = 0.08 + (0.55 * Math.min(Math.abs(r), maxAbs)) / maxAbs;
  if (r > 0) return { background: `rgba(52,211,153,${intensity})` };
  if (r < 0) return { background: `rgba(251,113,133,${intensity})` };
  return {};
}

function toneClass(r: number): string {
  if (r > 0) return "text-emerald-500";
  if (r < 0) return "text-rose-500";
  return "text-muted-foreground";
}