import type { Metadata } from "next";
import Link from "next/link";

import { getAccounts, getTrades } from "@/lib/data";
import { RecapCanvas, type RecapPayload } from "@/components/recap/recap-canvas";
import { EmptyState } from "@/components/ui/card-shell";
import { cn } from "@/lib/utils";
import { formatDateFull, formatDateShort } from "@/lib/formatters";
import {
  addDays,
  dayKey,
  endOfDay,
  endOfMonth,
  inRange,
  monthKey,
  parseMonthKey,
  startOfDay,
  startOfWeek,
} from "@/lib/dates";
import { aggregateByDay, summarizePerformance } from "@/lib/calculations/metrics";
import { WEEKDAYS_SHORT } from "@/lib/dates";
import { RECAP_TYPES } from "@/lib/constants";

export const metadata: Metadata = { title: "Recap" };
export const dynamic = "force-dynamic";

type RecapTypeValue = "daily" | "weekly" | "monthly";

export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const accountScope =
    typeof sp.account === "string" && sp.account ? sp.account : "all";
  const typeValue =
    typeof sp.type === "string" &&
    (sp.type === "daily" ||
      sp.type === "weekly" ||
      sp.type === "monthly")
      ? (sp.type as RecapTypeValue)
      : "monthly";
  const monthParam =
    typeof sp.month === "string" && sp.month ? sp.month : monthKey(new Date());
  const dayParam = typeof sp.day === "string" ? Number(sp.day) : NaN;

  const monthStart = parseMonthKey(monthParam);

  const anchor =
    Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= 31
      ? new Date(monthStart.getFullYear(), monthStart.getMonth(), dayParam)
      : new Date();

  let rangeStart: Date;
  let rangeEnd: Date;
  if (typeValue === "daily") {
    rangeStart = startOfDay(anchor);
    rangeEnd = endOfDay(anchor);
  } else if (typeValue === "weekly") {
    rangeStart = startOfWeek(anchor);
    rangeEnd = addDays(rangeStart, 7);
  } else {
    rangeStart = monthStart;
    rangeEnd = endOfMonth(monthStart);
  }

  const [accounts, trades] = await Promise.all([
    getAccounts(),
    getTrades({ accountScope }),
  ]);

  const currency =
    accountScope !== "all"
      ? accounts.find((a) => a.id === accountScope)?.currency ?? "USD"
      : accounts[0]?.currency ?? "USD";

  const filtered = trades.filter((t) => inRange(t.closedAt, rangeStart, rangeEnd));
  const summary = summarizePerformance(filtered);

  const scopedAccounts =
    accountScope !== "all"
      ? accounts.filter((a) => a.id === accountScope)
      : accounts;
  let refBalance = 0;
  for (const a of scopedAccounts) {
    let start = a.initialBalance;
    for (const t of trades) {
      if (t.accountId === a.id && t.closedAt.getTime() < rangeStart.getTime()) {
        start += t.pnl ?? 0;
      }
    }
    refBalance += start;
  }
  const returnPct =
    refBalance > 0 ? (summary.totalPnl / refBalance) * 100 : null;

  const byR = [...filtered].sort((a, b) => (b.rMultiple ?? 0) - (a.rMultiple ?? 0));
  const best = byR.find((t) => t.rMultiple != null && t.rMultiple > 0) ?? null;
  const worst = [...byR].reverse().find((t) => t.rMultiple != null && t.rMultiple < 0) ?? null;

  const dailyAggs = new Map(aggregateByDay(filtered).map((a) => [a.key, a]));
  const daily = (() => {
    if (typeValue === "daily") {
      const d = anchor;
      const a = dailyAggs.get(dayKey(d));
      return [
        {
          label: WEEKDAYS_SHORT[d.getDay()],
          r: a?.r ?? 0,
          pnl: a?.pnl ?? 0,
          count: a?.count ?? 0,
        },
      ];
    }
    if (typeValue === "weekly") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(rangeStart, i);
        const a = dailyAggs.get(dayKey(d));
        return {
          label: WEEKDAYS_SHORT[d.getDay()],
          r: a?.r ?? 0,
          pnl: a?.pnl ?? 0,
          count: a?.count ?? 0,
        };
      });
    }
    if (typeValue === "monthly") {
      const n = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      return Array.from({ length: n }, (_, i) => {
        const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1);
        const a = dailyAggs.get(dayKey(d));
        return {
          label: String(i + 1),
          r: a?.r ?? 0,
          pnl: a?.pnl ?? 0,
          count: a?.count ?? 0,
        };
      });
    }
    return [];
  })();

  const account =
    accountScope !== "all"
      ? accounts.find((a) => a.id === accountScope)
      : null;

  const accountName = account?.name ?? (accounts.length === 1 ? accounts[0].name : "All Accounts");
  const provider = account?.provider ?? null;

  const title = RECAP_TYPES.find((t) => t.value === typeValue)?.label ?? "Recap";
  const periodLabel =
    typeValue === "daily"
      ? formatDateFull(anchor)
      : typeValue === "weekly"
        ? `${formatDateShort(rangeStart)} — ${formatDateShort(addDays(rangeStart, 6))}, ${rangeStart.getFullYear()}`
        : `${monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;

  const payload: RecapPayload = {
    type: typeValue,
    title,
    periodLabel: `${periodLabel} · ${title}`,
    accountName,
    provider,
    accountLogo: account?.logoUrl ?? null,
    currency,
    metrics: {
      totalR: summary.totalR,
      totalPnl: summary.totalPnl,
      returnPct,
      winRate: summary.winRate,
      profitFactor: summary.profitFactor,
      expectancyR: summary.expectancyR,
      tradeCount: summary.tradeCount,
      wins: summary.wins,
      losses: summary.losses,
      maxDrawdownR: summary.maxDrawdownR,
      maxDrawdownPnl: summary.maxDrawdown,
    },
    best: best
      ? { symbol: best.symbol, r: best.rMultiple ?? 0, pnl: best.pnl ?? 0 }
      : null,
    worst: worst
      ? { symbol: worst.symbol, r: worst.rMultiple ?? 0, pnl: worst.pnl ?? 0 }
      : null,
    daily,
    trades: filtered.map((t) => ({
      symbol: t.symbol,
      direction: t.direction,
      r: t.rMultiple,
      pnl: t.pnl,
      result: t.result ?? "WIN",
    })),
  };

  const baseParams = new URLSearchParams({ account: accountScope, month: monthParam });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {RECAP_TYPES.map((t) => (
            <Link
              key={t.value}
              href={`/recap?type=${t.value}&${baseParams.toString()}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                typeValue === t.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No trades in this period"
          description="Journal some trades first, then come back to build a recap worth sharing."
        />
      ) : (
        <div className="flex justify-center">
          <RecapCanvas payload={payload} />
        </div>
      )}
    </div>
  );
}