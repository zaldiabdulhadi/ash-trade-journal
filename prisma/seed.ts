import { PrismaClient } from "@prisma/client";
import { calculateRR, calculateRMultiple } from "../src/lib/calculations/metrics";

const prisma = new PrismaClient();

interface SeedTrade {
  daysAgo: number;
  hour: number;
  account: number;
  symbol: string;
  direction: "LONG" | "SHORT";
  entry: number;
  sl: number;
  tp: number;
  riskAmount: number;
  riskPercent: number;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  pnl: number;
  strategy: string;
  session: string;
  timeframe: string;
  marketCondition: string;
  emotion: string;
  notes?: string;
}

const ACCOUNTS = [
  { name: "FTMO $10K", provider: "FTMO", type: "PROP_FIRM", initialBalance: 10000, currency: "USD", profitTargetPercent: 10 },
  { name: "Alpha Funded $5K", provider: "Alpha", type: "FUNDED", initialBalance: 5000, currency: "USD", profitTargetPercent: 8 },
];

// Deterministic pseudo-random source so seed is reproducible.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pluck = <T>(arr: T[], rnd: () => number): T => arr[Math.floor(rnd() * arr.length)];

const STRATEGIES = ["Breakout", "Reversal", "Liquidity", "Trend Follow", "Range", "Order Block", "Sweep"];
const SESSIONS = ["Asia", "London", "New York", "London", "London", "New York"];
const TIMEFRAMES = ["5M", "5M", "15M", "15M", "1H", "4H"];
const CONDITIONS = ["Trending", "Ranging", "Choppy", "Volatile"];
const EMOTIONS_WIN = ["Calm", "Confident", "Patient", "Focused", "Disciplined"];
const EMOTIONS_LOSS = ["Impatient", "FOMO", "Anxious", "Revenge", "Eager"];

function makeTrade(
  rnd: () => number,
  accountIdx: number,
  day: Date,
  hour: number
): SeedTrade {
  const symbol = pluck(["XAUUSD", "EURUSD", "GBPUSD", "NAS100", "USDJPY"], rnd);
  const direction: "LONG" | "SHORT" = rnd() > 0.5 ? "LONG" : "SHORT";
  const base =
    symbol === "XAUUSD"
      ? 3400 + Math.round(rnd() * 1200) / 10
      : symbol === "NAS100"
        ? 21000 + Math.round(rnd() * 1500)
        : symbol === "EURUSD"
          ? 1.1 + Math.round(rnd() * 600) / 10000
          : symbol === "USDJPY"
            ? 150 + Math.round(rnd() * 200) / 10
            : 1.3 + Math.round(rnd() * 400) / 10000;

  const mult = symbol === "XAUUSD" || symbol === "NAS100" ? 1 : 0.00001;
  const scale = Math.max(Math.round(base * mult), 1);
  const riskDist = Math.max(Math.round(scale * (0.0006 + rnd() * 0.0012)), 1);
  const rewardMult = 1 + rnd() * 2.5;

  const win = rnd() > 0.36;
  const result: SeedTrade["result"] = win ? "WIN" : rnd() < 0.12 ? "BREAKEVEN" : "LOSS";

  const entry = base;
  const sl =
    direction === "LONG"
      ? roundPrice(base - riskDist, symbol)
      : roundPrice(base + riskDist, symbol);
  const rrl = calculateRR(entry, sl, null, direction);

  let tp: number;
  if (result === "WIN" && rrl) {
    tp = priceForDist(entry, direction, riskDist * rewardMult, symbol);
  } else {
    // some wins/partial vs target vary
    tp = priceForDist(entry, direction, riskDist * (0.6 + rnd() * 2), symbol);
  }

  // P&L: win ~ reward*risk, loss ~ -risk(minus some partial), be ~ 0
  let pnl: number;
  if (result === "WIN") {
    pnl = riskAmountOf(symbol) * (0.8 + rnd() * 2.2);
  } else if (result === "LOSS") {
    pnl = -riskAmountOf(symbol) * (0.55 + rnd() * 0.45);
  } else {
    pnl = 0;
  }
  pnl = Math.round(pnl * 100) / 100;

  const riskAmount = riskAmountOf(symbol);
  const riskPercent = Math.round((riskAmount / 10000) * 1000) / 1000;

  return {
    daysAgo: 0,
    hour,
    account: accountIdx,
    symbol,
    direction,
    entry,
    sl,
    tp,
    riskAmount,
    riskPercent,
    result,
    pnl,
    strategy: pluck(STRATEGIES, rnd),
    session: pluck(SESSIONS, rnd),
    timeframe: pluck(TIMEFRAMES, rnd),
    marketCondition: pluck(CONDITIONS, rnd),
    emotion: win ? pluck(EMOTIONS_WIN, rnd) : pluck(EMOTIONS_LOSS, rnd),
    notes:
      rnd() > 0.5
        ? pluck(
            [
              "Waited for confirmation before entering.",
              "Clean sweep then reversal. Took the trade with the trend.",
              "Strong reaction at the level. Sizing was correct.",
              "Got in late, market had already moved.",
              "Respected the plan. No hesitation on the exit.",
              "Price came back and stopped me out. Setup invalidated.",
            ],
            rnd
          )
        : undefined,
  };
}

function riskAmountOf(symbol: string): number {
  const baseRisk =
    symbol === "XAUUSD" ? 100 : symbol === "NAS100" ? 150 : symbol === "USDJPY" ? 80 : 60;
  return baseRisk;
}

function roundPrice(p: number, symbol: string): number {
  if (symbol === "XAUUSD" || symbol === "NAS100") return Math.round(p * 10) / 10;
  return Math.round(p * 100000) / 100000;
}

function priceForDist(entry: number, direction: "LONG" | "SHORT", dist: number, symbol: string): number {
  const d = direction === "LONG" ? entry + dist : entry - dist;
  return roundPrice(d, symbol);
}

async function main() {
  console.log("Seeding database…");

  await prisma.$transaction([
    prisma.sharedRecap.deleteMany(),
    prisma.tradeImage.deleteMany(),
    prisma.trade.deleteMany(),
    prisma.tradingAccount.deleteMany(),
  ]);

  const accountIds: string[] = [];
  let balance = 0;
  for (const a of ACCOUNTS) {
    const acc = await prisma.tradingAccount.create({
      data: {
        name: a.name,
        provider: a.provider,
        type: a.type as never,
        initialBalance: a.initialBalance,
        currentBalance: a.initialBalance,
        profitTargetPercent: a.profitTargetPercent,
        currency: a.currency,
        isDefault: balance === 0,
      },
    });
    balance += 1;
    accountIds.push(acc.id);
  }

  const rnd = mulberry32(20260829);
  const trades: SeedTrade[] = [];
  const now = new Date();

  // Trading days over the last ~6 months, 0-4 trades per weekday.
  for (let day = 0; day < 185; day++) {
    const d = new Date(now);
    d.setDate(d.getDate() - day);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    
    // Ensure both accounts get at least 10 trades across different days
    // Each account gets 1-2 trades on most weekdays
    const accountsToday = [Math.floor(rnd() * 2), Math.floor(rnd() * 2)];
    const totalTrades = accountsToday.reduce((a, b) => a + b, 0);
    const count = totalTrades > 0 ? totalTrades : 1;
    
    for (let i = 0; i < count; i++) {
      const hour = [7, 8, 9, 12, 13, 14, 16][Math.floor(rnd() * 7)];
      const accountId = rnd() > 0.5 ? 0 : 1;
      const t = makeTrade(rnd, accountId, d, hour);
      t.daysAgo = day;
      trades.push(t);
    }
  }

  // Always include a few trades today so Today's performance isn't empty.
  trades.push(
    { ...makeTrade(mulberry32(7), 0, now, 9), daysAgo: 0 },
    { ...makeTrade(mulberry32(8), 0, now, 12), daysAgo: 0 },
    { ...makeTrade(mulberry32(9), 1, now, 14), daysAgo: 0 }
  );

  let created = 0;
  for (const t of trades) {
    const closedAt = new Date(now);
    closedAt.setDate(closedAt.getDate() - t.daysAgo);
    closedAt.setHours(t.hour, 30, 0, 0);
    if (closedAt.getTime() > now.getTime()) closedAt.setDate(closedAt.getDate() - 1);

    const openedAt = new Date(closedAt);
    openedAt.setMinutes(openedAt.getMinutes() - 45);

    const rr = calculateRR(t.entry, t.sl, t.tp, t.direction);
    const rMultiple = calculateRMultiple(t.pnl, t.riskAmount);

    const symbol = t.symbol.toUpperCase();

    const trade = await prisma.trade.create({
      data: {
        accountId: accountIds[t.account] ?? accountIds[0],
        symbol,
        direction: t.direction,
        entryPrice: t.entry,
        stopLoss: t.sl,
        takeProfit: t.tp,
        exitPrice:
          t.result === "WIN" ? t.tp : t.result === "LOSS" ? t.sl : null,
        riskAmount: t.riskAmount,
        riskPercent: t.riskPercent,
        rr,
        rMultiple,
        pnl: t.pnl,
        result: t.result,
        strategy: t.strategy,
        session: t.session,
        timeframe: t.timeframe,
        marketCondition: t.marketCondition,
        emotion: t.emotion,
        confidence: 3 + Math.floor(rnd() * 3),
        notes: t.notes ?? null,
        openedAt,
        closedAt,
      },
    });
    await prisma.tradingAccount.update({
      where: { id: trade.accountId },
      data: {
        currentBalance: { increment: t.pnl },
      },
    });
    created++;
  }

  console.log(`Seeded ${created} trades across ${accountIds.length} accounts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });