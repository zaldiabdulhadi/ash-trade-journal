import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AccountDTO, TradeDTO } from "@/lib/types";

export type AccountScope = "all" | string;

const accountSelect = {
  id: true,
  name: true,
  provider: true,
  logoPath: true,
  type: true,
  initialBalance: true,
  currentBalance: true,
  profitTargetPercent: true,
  currency: true,
  status: true,
  isDefault: true,
  createdAt: true,
  _count: { select: { trades: true } },
} satisfies Prisma.TradingAccountSelect;

export function toAccountDTO(
  a: Prisma.TradingAccountGetPayload<{ select: typeof accountSelect }>
): AccountDTO {
  return {
    id: a.id,
    name: a.name,
    provider: a.provider,
    logoUrl: a.logoPath,
    type: a.type,
    initialBalance: a.initialBalance,
    currentBalance: a.currentBalance,
    profitTargetPercent: a.profitTargetPercent,
    currency: a.currency,
    status: a.status,
    isDefault: a.isDefault,
    createdAt: a.createdAt.toISOString(),
    tradeCount: a._count?.trades ?? 0,
  };
}

export async function getAccounts(): Promise<AccountDTO[]> {
  const accounts = await db.tradingAccount.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: accountSelect,
  });
  return accounts.map(toAccountDTO);
}

export async function getAllAccountsIncludingArchived(): Promise<AccountDTO[]> {
  const accounts = await db.tradingAccount.findMany({
    orderBy: [{ status: "asc" }, { isDefault: "desc" }, { createdAt: "asc" }],
    select: accountSelect,
  });
  return accounts.map(toAccountDTO);
}

const tradeInclude = {
  images: true,
  account: {
    select: {
      id: true,
      name: true,
      currency: true,
      provider: true,
      logoPath: true,
    },
  },
} satisfies Prisma.TradeInclude;

export type TradeWithRelations = Prisma.TradeGetPayload<{
  include: typeof tradeInclude;
}>;

export function toTradeDTO(t: TradeWithRelations): TradeDTO {
  return {
    id: t.id,
    accountId: t.accountId,
    symbol: t.symbol,
    direction: t.direction,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    stopLoss: t.stopLoss,
    takeProfit: t.takeProfit,
    riskAmount: t.riskAmount,
    riskPercent: t.riskPercent,
    rr: t.rr,
    rMultiple: t.rMultiple,
    pnl: t.pnl,
    result: t.result,
    strategy: t.strategy,
    setup: t.setup,
    session: t.session,
    timeframe: t.timeframe,
    marketCondition: t.marketCondition,
    emotion: t.emotion,
    mistake: t.mistake,
    confidence: t.confidence,
    notes: t.notes,
    tradePlan: t.tradePlan,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    images: t.images.map((i) => ({ id: i.id, url: i.url, type: i.type })),
  };
}

export interface TradesQuery {
  accountScope?: AccountScope;
  symbol?: string;
  result?: string;
  strategy?: string;
  session?: string;
  from?: Date;
  to?: Date;
  search?: string;
  limit?: number;
}

export async function getTrades(query: TradesQuery = {}): Promise<TradeWithRelations[]> {
  const where: Prisma.TradeWhereInput = {};
  if (query.accountScope && query.accountScope !== "all") {
    where.accountId = query.accountScope;
  }
  if (query.symbol) where.symbol = query.symbol.toUpperCase();
  if (query.result) where.result = query.result as never;
  if (query.strategy) where.strategy = query.strategy;
  if (query.session) where.session = query.session;
  if (query.from || query.to) {
    where.AND = [
      ...(where.AND as Prisma.TradeWhereInput[] | undefined ?? []),
      ...(query.from ? [{ closedAt: { gte: query.from } }] : []),
      ...(query.to ? [{ closedAt: { lte: query.to } }] : []),
    ];
  }
  if (query.search) {
    const term = query.search.trim();
    where.OR = [
      { symbol: { contains: term } },
      { notes: { contains: term } },
      { strategy: { contains: term } },
      { setup: { contains: term } },
      { emotion: { contains: term } },
    ];
  }

  return db.trade.findMany({
    where,
    include: tradeInclude,
    orderBy: { closedAt: "desc" },
    take: query.limit,
  });
}

export async function getTrade(id: string): Promise<TradeWithRelations | null> {
  return db.trade.findUnique({
    where: { id },
    include: tradeInclude,
  });
}

export async function getSymbols(accountScope: AccountScope): Promise<string[]> {
  const rows = await db.trade.findMany({
    where: accountScope === "all" ? {} : { accountId: accountScope },
    select: { symbol: true },
    distinct: ["symbol"],
    orderBy: { symbol: "asc" },
  });
  return rows.map((r) => r.symbol);
}

export interface AppSettings {
  brandName: string;
  brandTagline: string;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  brandName: "Ash Trade Journal",
  brandTagline: "local · personal",
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.appSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    brandName: map.get("brandName") ?? DEFAULT_APP_SETTINGS.brandName,
    brandTagline: map.get("brandTagline") ?? DEFAULT_APP_SETTINGS.brandTagline,
  };
}

export async function getDefaultAccountId(): Promise<string | null> {
  const acc = await db.tradingAccount.findFirst({
    where: { status: "ACTIVE" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return acc?.id ?? null;
}