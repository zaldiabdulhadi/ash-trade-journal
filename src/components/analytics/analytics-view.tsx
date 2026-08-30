"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MetricCard } from "@/components/dashboard/metric-card";
import { CardShell } from "@/components/ui/card-shell";
import { EquityCurveChart, type EquityPointInput } from "@/components/dashboard/charts";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPnl, formatR, formatPercent, formatDateShort } from "@/lib/formatters";
import {
  buildEquityCurve,
  filterByPeriod,
  summarizePerformance,
  breakdownBySymbol,
  breakdownByStrategy,
  breakdownBySession,
  breakdownByTimeframe,
  breakdownByDirection,
  aggregateByMonth,
  type TradeLike,
  type PeriodLabel,
  type BreakdownRow,
} from "@/lib/calculations/metrics";

export type AnalyticsTrade = {
  ts: number;
  entryPrice: number | null;
  pnl: number | null;
  rMultiple: number | null;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  symbol: string;
  strategy: string | null;
  session: string | null;
  timeframe: string | null;
  direction: "LONG" | "SHORT";
};

const PERIOD_TABS: PeriodLabel[] = ["1M", "3M", "6M", "1Y", "ALL"];

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function AnalyticsView({
  trades,
  currency = "USD",
}: {
  trades: AnalyticsTrade[];
  currency?: string;
}) {
  const [period, setPeriod] = React.useState<PeriodLabel>("ALL");

  const like = React.useCallback((t: AnalyticsTrade): TradeLike => ({ ...t, closedAt: new Date(t.ts) }), []);

  const all = React.useMemo(() => trades.map(like), [trades, like]);
  const filtered = React.useMemo(() => filterByPeriod(all, period), [all, period]);
  const summary = React.useMemo(() => summarizePerformance(filtered), [filtered]);

  const equityPoints = React.useMemo<EquityPointInput[]>(() => {
    return buildEquityCurve(all).map((p, i) => ({
      index: i,
      ts: p.ts,
      label: p.label,
      pnl: p.pnl,
      r: p.r,
    }));
  }, [all]);

  const monthly = React.useMemo(() => {
    const agg = aggregateByMonth(all);
    return agg.map((m) => ({
      label: `${SHORT_MONTHS[m.monthStart.getMonth()]} ${String(m.monthStart.getFullYear()).slice(2)}`,
      r: m.r,
      pnl: m.pnl,
    }));
  }, [all]);

  const sections: { title: string; rows: BreakdownRow[] }[] = React.useMemo(
    () => [
      { title: "By Symbol", rows: breakdownBySymbol(filtered) },
      { title: "By Strategy", rows: breakdownByStrategy(filtered) },
      { title: "By Session", rows: breakdownBySession(filtered) },
      { title: "By Timeframe", rows: breakdownByTimeframe(filtered) },
      { title: "By Direction", rows: breakdownByDirection(filtered) },
    ],
    [filtered]
  );

  const pfDisplay =
    summary.profitFactor == null
      ? summary.grossProfit > 0
        ? "∞"
        : "—"
      : summary.profitFactor.toFixed(2);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {summary.tradeCount} trades ·{" "}
            {summary.bestDay
              ? `Best day ${formatDateShort(summary.bestDay.date)} (${formatR(summary.bestDay.r)})`
              : "No data yet"}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          {PERIOD_TABS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Net P&L" value={formatPnl(summary.totalPnl, currency)} tone={summary.totalPnl >= 0 ? "positive" : "negative"} sub={`${summary.tradeCount} trades`} />
        <MetricCard label="Total R" value={formatR(summary.totalR)} tone={summary.totalR >= 0 ? "positive" : "negative"} sub={summary.expectancyR == null ? "—" : `avg ${formatR(summary.expectancyR)}/trade`} />
        <MetricCard label="Win Rate" value={summary.winRate == null ? "—" : formatPercent(summary.winRate)} sub={`${summary.wins}W · ${summary.losses}L`} />
        <MetricCard label="Profit Factor" value={pfDisplay} sub={summary.grossLoss > 0 ? `gross ${formatCurrency(summary.grossProfit, currency)} / ${formatCurrency(summary.grossLoss, currency)}` : "—"} />
        <MetricCard label="Expectancy" value={formatR(summary.expectancyR)} tone={summary.expectancyR != null && summary.expectancyR >= 0 ? "positive" : "negative"} sub={formatPnl(summary.expectancyPnl, currency)} />
        <MetricCard label="Max Drawdown" value={formatR(-summary.maxDrawdownR)} tone="negative" sub={formatCurrency(summary.maxDrawdown, currency)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CardShell title="Equity Curve" description="Cumulative P&L from journaled trades">
          <EquityCurveChart points={equityPoints} currency={currency} />
        </CardShell>
        <CardShell title="Monthly Performance" description="Aggregated R per month">
          {monthly.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No trades yet</p>
          ) : (
            <div style={{ height: 280 }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a96a8" }} tickLine={false} axisLine={false} dy={4} minTickGap={16} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a96a8" }} tickLine={false} axisLine={false} width={42} tickFormatter={(v: number) => `${Math.round(v)}R`} />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { r?: number; pnl?: number };
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                          <div className="font-medium">{label}</div>
                          <div className="mt-1 tabular-nums">{formatR(d.r)}</div>
                          <div className="tabular-nums text-muted-foreground">{formatPnl(d.pnl ?? 0, currency)}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="r" radius={[4, 4, 0, 0]}>
                    {monthly.map((m, i) => (
                      <Cell key={i} fill={m.r >= 0 ? "#34d399" : "#fb7185"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardShell>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <BreakdownCard key={s.title} title={s.title} rows={s.rows} />
        ))}
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  const totalR = rows.reduce((s, r) => s + r.r, 0);
  return (
    <CardShell title={title} className="h-fit">
      {rows.length === 0 || totalR === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No data</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.slice(0, 6).map((row) => {
            const pct = totalR !== 0 ? (row.r / totalR) * 100 : 0;
            const positive = row.r >= 0;
            return (
              <li key={row.key} className="text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">{row.key}</span>
                  <span className={cn("shrink-0 tabular-nums", positive ? "text-emerald-500" : "text-rose-500")}>
                    {formatR(row.r)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("absolute inset-y-0 left-0 rounded-full", positive ? "bg-emerald-500" : "bg-rose-500")}
                      style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {row.count} trades · {row.winRate == null ? "—" : `${row.winRate.toFixed(0)}%`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}