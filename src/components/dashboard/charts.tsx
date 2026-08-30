"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatR, formatCurrency } from "@/lib/formatters";
import { PERIOD_RANGES, type PeriodLabel } from "@/lib/calculations/metrics";

export interface EquityPointInput {
  index: number;
  ts: number;
  label: string;
  pnl: number;
  r: number;
}

const PERIOD_TABS: PeriodLabel[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

const axisStyle = { fontSize: 11, fill: "#8a96a8" };

export function EquityCurveChart({
  points,
  currency = "USD",
  height = 260,
}: {
  points: EquityPointInput[];
  currency?: string;
  height?: number;
}) {
  const [period, setPeriod] = React.useState<PeriodLabel>("3M");

  const filtered = React.useMemo(() => {
    const days = PERIOD_RANGES[period];
    if (days == null || period === "ALL") return points;
    const cutoff = new Date().getTime() - days * 86_400_000;
    let arr = points.filter((p) => p.ts >= cutoff);
    // Always show at least the starting point so the line doesn't jump.
    if (arr.length > 0 && arr[0].index !== points[0].index) {
      const first = points.filter((p) => p.ts < cutoff).pop();
      if (first) arr = [first, ...arr];
    }
    return arr;
  }, [points, period]);

  const pnlEnd = filtered.length > 0 ? filtered[filtered.length - 1].pnl : 0;
  const rEnd = filtered.length > 0 ? filtered[filtered.length - 1].r : 0;
  const positive = pnlEnd >= 0;

  const data = filtered.map((p) => ({
    label: p.label,
    pnl: p.pnl,
    r: p.r,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className={cn("text-lg font-semibold tabular-nums", positive ? "text-emerald-500" : "text-rose-500")}>
            {formatCurrency(pnlEnd, currency)}
          </div>
          <div className={cn("text-xs tabular-nums", positive ? "text-emerald-500/80" : "text-rose-500/80")}>
            {formatR(rEnd)}
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          {PERIOD_TABS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity={0.28} />
                <stop offset="100%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              dy={4}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={42}
              tickFormatter={(v: number) => compactNum(v)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { pnl?: number; r?: number };
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <div className="font-medium">{label}</div>
                    <div className="mt-1 tabular-nums">{formatCurrency(d.pnl ?? 0, currency)}</div>
                    <div className="tabular-nums text-muted-foreground">{formatR(d.r)}</div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="rgba(148,163,184,0.35)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={positive ? "#34d399" : "#fb7185"}
              strokeWidth={2}
              fill="url(#pnlFill)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function compactNum(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (abs >= 10000) return `${(v / 1000).toFixed(0)}k`;
  return String(Math.round(v));
}

export interface DailyRPoint {
  label: string;
  r: number;
  isToday?: boolean;
}

export function DailyRChart({
  days,
  height = 120,
}: {
  days: DailyRPoint[];
  height?: number;
  currency?: string;
}) {
  return (
    <div style={{ height }} className="w-full">
      {days.length === 0 ? (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          No trades in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} dy={4} minTickGap={16} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={34} tickFormatter={(v: number) => `${Math.round(v)}R`} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.08)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { r?: number; pnl?: number };
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <div className="font-medium">{label}</div>
                    <div className="mt-1 tabular-nums">{formatR(d.r)}</div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="rgba(148,163,184,0.35)" />
            <Bar dataKey="r" radius={[3, 3, 0, 0]} isAnimationActive={true}>
              {days.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.r >= 0 ? "#34d399" : "#fb7185"}
                  opacity={d.isToday ? 1 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}