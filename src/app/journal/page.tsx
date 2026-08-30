import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { getAccounts, getSymbols, getTrades, toTradeDTO } from "@/lib/data";
import { EmptyState } from "@/components/ui/card-shell";
import { PageHeader } from "@/components/ui/page-header";
import { JournalToolbar, type JournalFilterState } from "@/components/journal/journal-toolbar";
import { TradeTable, type JournalRow } from "@/components/journal/trade-table";
import { AddTradeButton } from "@/components/journal/add-trade-button";
import JournalPageClient from "@/app/journal/journal-page-client";

export const metadata: Metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const accountScope =
    typeof sp.account === "string" && sp.account ? sp.account : "all";

  const take = (key: string) => (typeof sp[key] === "string" ? sp[key] : undefined);
  const filters: JournalFilterState = {
    q: take("q"),
    session: take("session"),
    result: take("result"),
    symbol: take("symbol"),
    strategy: take("strategy"),
    sort: take("sort"),
  };

  const [accounts, symbols, trades] = await Promise.all([
    getAccounts(),
    getSymbols(accountScope),
    getTrades({
      accountScope,
      search: filters.q,
      session: filters.session,
      result: filters.result,
      symbol: filters.symbol,
      strategy: filters.strategy,
    }),
  ]);

  const sort = filters.sort ?? "date-desc";
  const sorted = [...trades].sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return a.closedAt.getTime() - b.closedAt.getTime();
      case "pnl-desc":
        return (b.pnl ?? 0) - (a.pnl ?? 0);
      case "pnl-asc":
        return (a.pnl ?? 0) - (b.pnl ?? 0);
      case "r-desc":
        return (b.rMultiple ?? 0) - (a.rMultiple ?? 0);
      case "r-asc":
        return (a.rMultiple ?? 0) - (b.rMultiple ?? 0);
      default:
        return b.closedAt.getTime() - a.closedAt.getTime();
    }
  });

  const rows: JournalRow[] = sorted.map((t) => ({
    id: t.id,
    ts: t.closedAt.getTime(),
    symbol: t.symbol,
    direction: t.direction,
    type: t.direction === "LONG" ? "Long" : "Short",
    session: t.session ?? "",
    result: t.result ?? "WIN",
    pnl: t.pnl,
    r: t.rMultiple,
    rr: t.rr,
    currency: t.account.currency,
    strategy: t.strategy ?? "",
    accountName: t.account.name,
    trade: toTradeDTO(t),
  }));

  // Client-side features
  return (
    <JournalPageClient
      initialRows={rows}
      accounts={accounts}
      symbols={symbols}
      filters={filters}
      accountScope={accountScope}
    />
  );
}
