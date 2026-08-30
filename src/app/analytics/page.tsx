import type { Metadata } from "next";
import { ChartColumnBig } from "lucide-react";

import { getAccounts, getTrades } from "@/lib/data";
import { AnalyticsView, type AnalyticsTrade } from "@/components/analytics/analytics-view";
import { EmptyState } from "@/components/ui/card-shell";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const sp = await searchParams;
  const accountScope =
    typeof sp.account === "string" && sp.account ? sp.account : "all";

  const [accounts, trades] = await Promise.all([
    getAccounts(),
    getTrades({ accountScope }),
  ]);

  const currency =
    accountScope !== "all"
      ? accounts.find((a) => a.id === accountScope)?.currency ?? "USD"
      : accounts[0]?.currency ?? "USD";

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[22px] font-semibold tracking-tight">Analytics</h1>
        <EmptyState
          icon={<ChartColumnBig className="size-6" />}
          title="No trading accounts yet"
          description="Create an account to start tracking your performance."
        />
      </div>
    );
  }

  const data: AnalyticsTrade[] = trades.map((t) => ({
    ts: t.closedAt.getTime(),
    entryPrice: t.entryPrice,
    pnl: t.pnl,
    rMultiple: t.rMultiple,
    result: t.result,
    symbol: t.symbol,
    strategy: t.strategy,
    session: t.session,
    timeframe: t.timeframe,
    direction: t.direction,
  }));

  return (
    <div className="flex flex-col gap-4">
      {data.length === 0 ? (
        <>
          <h1 className="text-[22px] font-semibold tracking-tight">Analytics</h1>
          <EmptyState
            icon={<ChartColumnBig className="size-6" />}
            title="No trades yet"
            description="Once you have journaled trades, your analytics will appear here."
          />
        </>
      ) : (
        <AnalyticsView trades={data} currency={currency} />
      )}
    </div>
  );
}