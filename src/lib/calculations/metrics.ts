import type { Direction, TradeResult } from "@prisma/client";

/**
 * Calculation layer — the single source of truth for all trading metrics.
 * Every view (Dashboard, Analytics, Calendar, Recap) consumes these functions.
 * Do NOT compute metrics inline in components.
 */

export interface TradeLike {
  direction: Direction;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  exitPrice?: number | null;
  riskAmount?: number | null;
  riskPercent?: number | null;
  rr?: number | null;
  rMultiple?: number | null;
  pnl?: number | null;
  result: TradeResult;
  closedAt: Date;
  openedAt?: Date | null;
  symbol: string;
  strategy?: string | null;
  session?: string | null;
  timeframe?: string | null;
}

export type PeriodLabel = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

/* ------------------------------------------------------------------ */
/* Single trade helpers                                                */
/* ------------------------------------------------------------------ */

/** Reward-to-risk ratio for a single trade. Numeric ratio (e.g. 2 means 1:2). */
export function calculateRR(
  entryPrice: number | null,
  stopLoss: number | null,
  takeProfit: number | null,
  direction: Direction | null
): number | null {
  if (
    entryPrice == null ||
    stopLoss == null ||
    takeProfit == null ||
    direction == null
  ) {
    return null;
  }
  const risk = direction === "LONG" ? entryPrice - stopLoss : stopLoss - entryPrice;
  const reward =
    direction === "LONG" ? takeProfit - entryPrice : entryPrice - takeProfit;
  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

/** R multiple for a single trade = P&L / risk amount. */
export function calculateRMultiple(
  pnl: number | null,
  riskAmount: number | null
): number | null {
  if (pnl == null || riskAmount == null || riskAmount <= 0) return null;
  return pnl / riskAmount;
}

/** Effective risk amount in currency. Falls back to % of a given balance. */
export function resolveRiskAmount(
  riskAmount: number | null,
  riskPercent: number | null,
  referenceBalance: number | null
): number | null {
  if (riskAmount != null && riskAmount > 0) return riskAmount;
  if (
    riskPercent != null &&
    riskPercent > 0 &&
    referenceBalance != null &&
    referenceBalance > 0
  ) {
    return (referenceBalance * riskPercent) / 100;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Aggregation                                                         */
/* ------------------------------------------------------------------ */

export interface PerformanceSummary {
  tradeCount: number;
  wins: number;
  losses: number;
  breakevens: number;
  totalPnl: number;
  totalR: number;
  winRate: number | null; // percent 0-100, null when no decisive trades
  profitFactor: number | null; // null => no losing trades
  grossProfit: number;
  grossLoss: number;
  avgWin: number;
  avgLoss: number;
  expectancyR: number | null; // average R per trade
  expectancyPnl: number; // average $ per trade
  maxDrawdown: number; // in currency units
  maxDrawdownR: number; // in R
  bestDay: { date: Date; r: number; pnl: number } | null;
  worstDay: { date: Date; r: number; pnl: number } | null;
}

export function summarizePerformance(trades: TradeLike[]): PerformanceSummary {
  const n = trades.length;
  let totalPnl = 0;
  let totalR = 0;
  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let winPnlSum = 0;
  let lossPnlSum = 0;

  for (const t of trades) {
    const pnl = t.pnl ?? 0;
    const r = t.rMultiple ?? 0;
    totalPnl += pnl;
    totalR += r;
    if (t.result === "WIN") {
      wins++;
      if (pnl > 0) {
        grossProfit += pnl;
        winPnlSum += pnl;
      }
    } else if (t.result === "LOSS") {
      losses++;
      if (pnl < 0) {
        grossLoss += Math.abs(pnl);
        lossPnlSum += Math.abs(pnl);
      }
    } else {
      breakevens++;
    }
  }

  const winRate =
    wins + losses > 0 ? (wins / (wins + losses)) * 100 : null;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : null;
  const expectancyR = n > 0 ? totalR / n : null;
  const expectancyPnl = n > 0 ? totalPnl / n : 0;

  const { maxDrawdown, maxDrawdownR } = computeDrawdownFromTrades(trades);

  const daily = aggregateByDay(trades);
  let bestDay: PerformanceSummary["bestDay"] = null;
  let worstDay: PerformanceSummary["worstDay"] = null;
  for (const d of daily) {
    if (d.count === 0) continue;
    if (!bestDay || d.r > bestDay.r) bestDay = { date: d.date, r: d.r, pnl: d.pnl };
    if (!worstDay || d.r < worstDay.r) worstDay = { date: d.date, r: d.r, pnl: d.pnl };
  }

  return {
    tradeCount: n,
    wins,
    losses,
    breakevens,
    totalPnl,
    totalR,
    winRate,
    profitFactor,
    grossProfit,
    grossLoss,
    avgWin: wins > 0 ? winPnlSum / wins : 0,
    avgLoss: losses > 0 ? -lossPnlSum / losses : 0,
    expectancyR,
    expectancyPnl,
    maxDrawdown,
    maxDrawdownR,
    bestDay,
    worstDay,
  };
}

/* ------------------------------------------------------------------ */
/* Equity curve & drawdown                                             */
/* ------------------------------------------------------------------ */

export interface EquityPoint {
  index: number;
  ts: number;
  label: string;
  pnl: number; // cumulative $
  r: number; // cumulative R
}

export function buildEquityCurve(
  trades: TradeLike[],
  labelKey: (d: Date) => string = (d) => shortDateLabel(d)
): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime());
  let pnl = 0;
  let r = 0;
  const points: EquityPoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    pnl += sorted[i].pnl ?? 0;
    r += sorted[i].rMultiple ?? 0;
    points.push({
      index: i,
      ts: sorted[i].closedAt.getTime(),
      label: labelKey(sorted[i].closedAt),
      pnl: round2(pnl),
      r: round2(r),
    });
  }
  return points;
}

function computeDrawdownFromTrades(trades: TradeLike[]): {
  maxDrawdown: number;
  maxDrawdownR: number;
} {
  const sorted = [...trades].sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime());
  let pnl = 0;
  let r = 0;
  let peakPnl = 0;
  let peakR = 0;
  let maxDd = 0;
  let maxDdR = 0;
  for (const t of sorted) {
    pnl += t.pnl ?? 0;
    r += t.rMultiple ?? 0;
    if (pnl > peakPnl) peakPnl = pnl;
    if (r > peakR) peakR = r;
    maxDd = Math.max(maxDd, peakPnl - pnl);
    maxDdR = Math.max(maxDdR, peakR - r);
  }
  return { maxDrawdown: round2(maxDd), maxDrawdownR: round2(maxDdR) };
}

export function computeMaxDrawdown(values: number[]): number {
  let peak = 0;
  let maxDd = 0;
  let cur = 0;
  for (const v of values) {
    cur += v;
    if (cur > peak) peak = cur;
    maxDd = Math.max(maxDd, peak - cur);
  }
  return round2(maxDd);
}

/* ------------------------------------------------------------------ */
/* Time aggregation                                                    */
/* ------------------------------------------------------------------ */

export interface DayAggregate {
  date: Date;
  key: string;
  pnl: number;
  r: number;
  count: number;
  wins: number;
  losses: number;
}

export function aggregateByDay(trades: TradeLike[]): DayAggregate[] {
  const map = new Map<string, DayAggregate>();
  for (const t of trades) {
    const d = new Date(t.closedAt);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        date: d,
        key,
        pnl: 0,
        r: 0,
        count: 0,
        wins: 0,
        losses: 0,
      };
      map.set(key, agg);
    }
    agg.pnl += t.pnl ?? 0;
    agg.r += t.rMultiple ?? 0;
    agg.count += 1;
    if (t.result === "WIN") agg.wins += 1;
    if (t.result === "LOSS") agg.losses += 1;
  }
  return Array.from(map.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((a) => ({ ...a, pnl: round2(a.pnl), r: round2(a.r) }));
}

export interface WeekAggregate {
  weekStart: Date;
  weekEnd: Date;
  key: string;
  pnl: number;
  r: number;
  count: number;
  wins: number;
  losses: number;
}

export function aggregateByWeek(trades: TradeLike[]): WeekAggregate[] {
  const map = new Map<string, WeekAggregate>();
  for (const t of trades) {
    const ws = startOfWeekLocal(new Date(t.closedAt));
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    we.setHours(23, 59, 59, 999);
    const key = dateKeyOf(ws);
    let agg = map.get(key);
    if (!agg) {
      agg = { weekStart: ws, weekEnd: we, key, pnl: 0, r: 0, count: 0, wins: 0, losses: 0 };
      map.set(key, agg);
    }
    agg.pnl += t.pnl ?? 0;
    agg.r += t.rMultiple ?? 0;
    agg.count += 1;
    if (t.result === "WIN") agg.wins += 1;
    if (t.result === "LOSS") agg.losses += 1;
  }
  return Array.from(map.values())
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .map((a) => ({ ...a, pnl: round2(a.pnl), r: round2(a.r) }));
}

export interface MonthAggregate {
  monthStart: Date;
  key: string;
  pnl: number;
  r: number;
  count: number;
  wins: number;
  losses: number;
  winRate: number | null;
}

export function aggregateByMonth(trades: TradeLike[]): MonthAggregate[] {
  const map = new Map<string, MonthAggregate>();
  for (const t of trades) {
    const d = new Date(t.closedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        monthStart: new Date(d.getFullYear(), d.getMonth(), 1),
        key,
        pnl: 0,
        r: 0,
        count: 0,
        wins: 0,
        losses: 0,
        winRate: null,
      };
      map.set(key, agg);
    }
    agg.pnl += t.pnl ?? 0;
    agg.r += t.rMultiple ?? 0;
    agg.count += 1;
    if (t.result === "WIN") agg.wins += 1;
    if (t.result === "LOSS") agg.losses += 1;
  }
  return Array.from(map.values())
    .sort((a, b) => a.monthStart.getTime() - b.monthStart.getTime())
    .map((a) => ({
      ...a,
      pnl: round2(a.pnl),
      r: round2(a.r),
      winRate: a.wins + a.losses > 0 ? (a.wins / (a.wins + a.losses)) * 100 : null,
    }));
}

/* ------------------------------------------------------------------ */
/* Breakdowns                                                          */
/* ------------------------------------------------------------------ */

export interface BreakdownRow {
  key: string;
  pnl: number;
  r: number;
  count: number;
  winRate: number | null;
}

export function buildBreakdown(
  trades: TradeLike[],
  selector: (t: TradeLike) => string | null | undefined
): BreakdownRow[] {
  const map = new Map<string, { pnl: number; r: number; count: number; wins: number; losses: number }>();
  for (const t of trades) {
    const key = selector(t);
    const k = (key ?? "—").trim();
    if (!k) continue;
    let agg = map.get(k);
    if (!agg) {
      agg = { pnl: 0, r: 0, count: 0, wins: 0, losses: 0 };
      map.set(k, agg);
    }
    agg.pnl += t.pnl ?? 0;
    agg.r += t.rMultiple ?? 0;
    agg.count += 1;
    if (t.result === "WIN") agg.wins += 1;
    if (t.result === "LOSS") agg.losses += 1;
  }
  return Array.from(map.entries())
    .map(([key, a]) => ({
      key,
      pnl: round2(a.pnl),
      r: round2(a.r),
      count: a.count,
      winRate: a.wins + a.losses > 0 ? (a.wins / (a.wins + a.losses)) * 100 : null,
    }))
    .sort((a, b) => b.r - a.r);
}

export const breakdownBySymbol = (t: TradeLike[]) =>
  buildBreakdown(t, (x) => x.symbol);
export const breakdownByStrategy = (t: TradeLike[]) =>
  buildBreakdown(t, (x) => x.strategy);
export const breakdownBySession = (t: TradeLike[]) =>
  buildBreakdown(t, (x) => x.session);
export const breakdownByTimeframe = (t: TradeLike[]) =>
  buildBreakdown(t, (x) => x.timeframe);
export const breakdownByDirection = (t: TradeLike[]) =>
  buildBreakdown(t, (x) => x.direction);

/* ------------------------------------------------------------------ */
/* Misc                                                                 */
/* ------------------------------------------------------------------ */

export const PERIOD_RANGES: Record<PeriodLabel, number | null> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 182,
  "1Y": 365,
  ALL: null,
};

export function filterByPeriod(trades: TradeLike[], period: PeriodLabel): TradeLike[] {
  const days = PERIOD_RANGES[period];
  if (days == null || period === "ALL") return trades;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  return trades.filter((t) => t.closedAt.getTime() >= cutoff.getTime());
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function startOfWeekLocal(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - day);
  return out;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDateLabel(d: Date): string {
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}