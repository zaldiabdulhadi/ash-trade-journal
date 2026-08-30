import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { getAccounts, getTrades } from "@/lib/data";
import { CalendarView, type CalendarTrade } from "@/components/calendar/calendar-view";
import { EmptyState } from "@/components/ui/card-shell";
import { monthKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage({
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

  const scopedAccounts =
    accountScope !== "all"
      ? accounts.filter((a) => a.id === accountScope)
      : accounts;
  const startBalance = scopedAccounts.reduce((s, a) => s + a.initialBalance, 0);

  const currency =
    accountScope !== "all"
      ? accounts.find((a) => a.id === accountScope)?.currency ?? "USD"
      : accounts[0]?.currency ?? "USD";

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[22px] font-semibold tracking-tight">Calendar</h1>
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title="No trading accounts yet"
          description="Create an account to start building your trading calendar."
        />
      </div>
    );
  }

  const data: CalendarTrade[] = trades.map((t) => ({
    ts: t.closedAt.getTime(),
    pnl: t.pnl,
    rMultiple: t.rMultiple,
    result: t.result,
    symbol: t.symbol,
    direction: t.direction,
  }));

  return (
    <CalendarView
      trades={data}
      currency={currency}
      accountScope={accountScope}
      initialMonth={monthParam}
      startBalance={startBalance}
    />
  );
}