import type { Metadata } from "next";
import { Calculator, BookOpen } from "lucide-react";

import { getAccounts, getTrades } from "@/lib/data";
import {
  buildEquityCurve,
  summarizePerformance,
} from "@/lib/calculations/metrics";
import { monthKey } from "@/lib/dates";
import { formatCurrency, formatPnl, formatR, formatPercent } from "@/lib/formatters";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CardShell, EmptyState } from "@/components/ui/card-shell";
import { EquityCurveChart } from "@/components/dashboard/charts";
import { MonthCard, TodayCard, WeekCard } from "@/components/dashboard/performance-cards";
import { AddTradeButton } from "@/components/journal/add-trade-button";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const accountScope =
    typeof sp.account === "string" && sp.account ? sp.account : "all";
  const monthParam =
    typeof sp.month === "string" && sp.month ? sp.month : monthKey(new Date());

  const [accounts, trades] = await Promise.all([
    getAccounts(),
    getTrades({ accountScope }),
  ]);

  const currency =
    accountScope !== "all"
      ? accounts.find((a) => a.id === accountScope)?.currency ?? "USD"
      : accounts[0]?.currency ?? "USD";

  const summary = summarizePerformance(trades);
  const points = buildEquityCurve(trades);

  const equityPoints = points.map((p) => ({
    index: p.index,
    ts: p.ts,
    label: p.label,
    pnl: p.pnl,
    r: p.r,
  }));

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" description="How are you performing?" />
        <EmptyState
          icon={<BookOpen className="size-6" />}
          title="No trading accounts yet."
          description="Your performance will appear here once you create an account and start journaling trades."
          action={
            <AddTradeButton className="opacity-60 pointer-events-none" />
          }
        />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" description="How are you performing?" />
        <EmptyState
          icon={<Calculator className="size-6" />}
          title="Your performance will appear here"
          description="Once you start journaling trades, your P&L, R multiple, win rate and equity curve will show up here."
          action={<AddTradeButton accountId={accountScope === "all" ? undefined : accountScope} />}
        />
      </div>
    );
  }

  const pfDisplay =
    summary.profitFactor == null
      ? summary.grossProfit > 0
        ? "∞"
        : "—"
      : summary.profitFactor.toFixed(2);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Dashboard" description="How are you performing?" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Net P&L"
          value={formatPnl(summary.totalPnl, currency)}
          tone={summary.totalPnl >= 0 ? "positive" : "negative"}
          sub={`${summary.tradeCount} trades`}
        />
        <MetricCard
          label="Total R"
          value={formatR(summary.totalR)}
          tone={summary.totalR >= 0 ? "positive" : "negative"}
          sub={summary.expectancyR == null ? "—" : `avg ${formatR(summary.expectancyR)}/trade`}
        />
        <MetricCard
          label="Win Rate"
          value={summary.winRate == null ? "—" : formatPercent(summary.winRate)}
          sub={`${summary.wins}W · ${summary.losses}L`}
        />
        <MetricCard
          label="Profit Factor"
          value={pfDisplay}
          sub={
            summary.expectancyPnl === 0 && summary.grossProfit === 0
              ? "—"
              : `gross ${syncSign(summary.grossProfit)} / ${formatCurrency(summary.grossLoss, currency)}`
          }
        />
        <MetricCard
          label="Trades"
          value={summary.tradeCount}
          sub={`${summary.breakevens} breakeven`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CardShell title="Equity Curve" description="Cumulative P&L from journaled trades">
            <EquityCurveChart points={equityPoints} currency={currency} />
          </CardShell>
        </div>
        <TodayCard trades={trades} currency={currency} accountScope={accountScope} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthCard
            trades={trades}
            currency={currency}
            accountScope={accountScope}
            monthParam={monthParam}
          />
        </div>
        <WeekCard trades={trades} currency={currency} accountScope={accountScope} />
      </div>
    </div>
  );
}

function syncSign(v: number): string {
  return formatPnl(v, "USD");
}