import Link from "next/link";
import { ChevronLeft, ChevronRight, Share2, ArrowUpRight, ArrowDownRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TradeWithRelations } from "@/lib/data";
import {
  aggregateByDay,
  summarizePerformance,
  type TradeLike,
} from "@/lib/calculations/metrics";
import {
  endOfDay,
  endOfMonth,
  monthKey,
  monthLabel,
  parseMonthKey,
  shiftMonthKey,
  startOfDay,
  startOfWeek,
  inRange,
  WEEKDAYS_SHORT,
} from "@/lib/dates";
import { formatPnl, formatR, formatDayName, formatTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { DailyRChart, type DailyRPoint } from "@/components/dashboard/charts";

function fmtR(v: number | null, digits = 1): string {
  return formatR(v, digits);
}

export function TodayCard({
  trades,
  currency,
  accountScope,
}: {
  trades: TradeWithRelations[];
  currency: string;
  accountScope: string;
}) {
  const now = new Date();
  const todayTrades = trades.filter((t) =>
    inRange(t.closedAt, startOfDay(now), endOfDay(now))
  );
  const summary = summarizePerformance(todayTrades as TradeLike[]);

  return (
    <PerformanceFrameBase
      title="Today's Performance"
      href={`/recap?type=daily&account=${accountScope}`}
    >
      <div className="flex items-baseline gap-4">
        <div>
          <div className={pnlClass(summary.totalPnl) + " text-2xl font-semibold tabular-nums"}>
            {fmtR(summary.totalR)}
          </div>
          <div className={pnlClass(summary.totalPnl) + " text-sm tabular-nums"}>
            {formatPnl(summary.totalPnl, currency)}
          </div>
        </div>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex gap-3">
            <span className="text-emerald-500">{summary.wins} win{summary.wins === 1 ? "" : "s"}</span>
            <span className="text-rose-500">{summary.losses} loss{summary.losses === 1 ? "" : "es"}</span>
          </div>
          <div>
            {summary.tradeCount} trade{summary.tradeCount === 1 ? "" : "s"} ·{" "}
            {summary.winRate == null ? "—" : `${summary.winRate.toFixed(0)}% win rate`}
          </div>
        </div>
      </div>

      {todayTrades.length > 0 ? (
        <ul className="mt-3 flex flex-col divide-y divide-border/60">
          {todayTrades.slice(0, 5).map((t) => (
            <li key={t.id}>
              <Link
                href={`/journal/${t.id}`}
                className="flex items-center gap-2 py-2 text-sm transition-colors hover:text-foreground/80"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {t.direction === "LONG" ? (
                    <ArrowUpRight className="size-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="size-3.5 shrink-0 text-rose-500" />
                  )}
                  <span className="truncate font-medium">{t.symbol}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(t.closedAt)}
                  </span>
                </span>
                <span className={cn("w-14 text-right font-medium tabular-nums", pnlClass(t.pnl ?? 0))}>
                  {fmtR(t.rMultiple)}
                </span>
                <span className={cn("w-20 text-right tabular-nums", pnlClass(t.pnl ?? 0))}>
                  {formatPnl(t.pnl ?? 0, currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No trades today yet.</p>
      )}
    </PerformanceFrameBase>
  );
}

export function WeekCard({
  trades,
  currency,
  accountScope,
}: {
  trades: TradeWithRelations[];
  currency: string;
  accountScope: string;
}) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekTrades = trades.filter((t) => t.closedAt.getTime() >= weekStart.getTime());
  const summary = summarizePerformance(weekTrades as TradeLike[]);

  const daily = aggregateByDay(weekTrades as TradeLike[]);
  const days: DailyRPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const agg = daily.find((x) => x.date.getTime() === d.getTime());
    days.push({
      label: WEEKDAYS_SHORT[d.getDay()].slice(0, 2),
      r: agg?.r ?? 0,
      isToday: d.getTime() === startOfDay(now).getTime(),
    });
  }
  const bestDay = summary.bestDay;
  const worstDay = summary.worstDay;

  return (
    <PerformanceFrameBase
      title="This Week"
      href={`/recap?type=weekly&account=${accountScope}&month=${monthKey(now)}`}
    >
      <div className="flex items-baseline gap-4">
        <div>
          <div className={pnlClass(summary.totalPnl) + " text-2xl font-semibold tabular-nums"}>
            {fmtR(summary.totalR)}
          </div>
          <div className={pnlClass(summary.totalPnl) + " text-sm tabular-nums"}>
            {formatPnl(summary.totalPnl, currency)}
          </div>
        </div>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div>
            {summary.tradeCount} trades ·{" "}
            {summary.winRate == null ? "—" : `${summary.winRate.toFixed(1)}% win rate`}
          </div>
          {bestDay && (
            <div>
              Best day{" "}
              <span className="font-medium text-emerald-500">
                {formatDayName(bestDay.date)} {fmtR(bestDay.r)}
              </span>
            </div>
          )}
          {worstDay && (
            <div>
              Worst day{" "}
              <span className="font-medium text-rose-500">
                {formatDayName(worstDay.date)} {fmtR(worstDay.r)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3">
        <DailyRChart days={days} />
      </div>
    </PerformanceFrameBase>
  );
}

export function MonthCard({
  trades,
  currency,
  accountScope,
  monthParam,
}: {
  trades: TradeWithRelations[];
  currency: string;
  accountScope: string;
  monthParam: string;
}) {
  const monthStart = parseMonthKey(monthParam);
  const monthEnd = endOfMonth(monthStart);
  const monthTrades = trades.filter((t) =>
    inRange(t.closedAt, monthStart, monthEnd)
  );
  const summary = summarizePerformance(monthTrades as TradeLike[]);
  const daily = aggregateByDay(monthTrades as TradeLike[]);

  const prevMonth = shiftMonthKey(monthParam, -1);
  const nextMonth = shiftMonthKey(monthParam, 1);
  const q = (m: string) => new URLSearchParams({ account: accountScope, month: m }).toString();

  const maxDays = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0
  ).getDate();
  const days: DailyRPoint[] = [];
  for (let day = 1; day <= maxDays; day++) {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const agg = daily.find((x) => x.date.getTime() === d.getTime());
    days.push({ label: String(day), r: agg?.r ?? 0 });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={`/?${q(prevMonth)}`} aria-label="Previous month" scroll={false} className="p-1 hover:bg-accent rounded">
            <ChevronLeft />
          </Link>
          <h2 className="text-sm font-semibold">{monthLabel(monthStart)}</h2>
          <Link href={`/?${q(nextMonth)}`} aria-label="Next month" scroll={false} className="p-1 hover:bg-accent rounded">
            <ChevronRight />
          </Link>
        </div>
        <Link href={`/recap?type=monthly&account=${accountScope}&month=${monthParam}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Share2 data-icon="inline-start" /> Share Recap
        </Link>
      </header>

      <div className="flex items-baseline gap-4">
        <div>
          <div className={pnlClass(summary.totalPnl) + " text-2xl font-semibold tabular-nums"}>
            {fmtR(summary.totalR)}
          </div>
          <div className={pnlClass(summary.totalPnl) + " text-sm tabular-nums"}>
            {formatPnl(summary.totalPnl, currency)}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{summary.tradeCount} trades</span>
          <span>
            {summary.winRate == null ? "—" : `${summary.winRate.toFixed(1)}% win rate`}
          </span>
          <span>
            Profit factor{" "}
            {summary.profitFactor == null
              ? summary.grossProfit > 0
                ? "∞"
                : "—"
              : summary.profitFactor.toFixed(2)}
          </span>
          {summary.maxDrawdownR !== 0 && (
            <span className="text-rose-500/80">
              Max drawdown {fmtR(-summary.maxDrawdownR)}
            </span>
          )}
        </div>
      </div>

      {monthTrades.length > 0 && (
        <div className="mt-1">
          <DailyRChart days={days} />
        </div>
      )}
    </section>
  );
}

function PerformanceFrameBase({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-card">
      <header className="flex items-center justify-between pb-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Share2 data-icon="inline-start" /> Recap
          </Link>
        )}
      </header>
      <div className="pt-1">{children}</div>
    </section>
  );
}

function pnlClass(v: number): string {
  if (v > 0) return "text-emerald-500";
  if (v < 0) return "text-rose-500";
  return "text-foreground";
}
