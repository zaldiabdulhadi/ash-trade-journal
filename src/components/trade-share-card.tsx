"use client";

import { toPng } from "html-to-image";
import { toast } from "sonner";
import * as React from "react";
import { cn } from "@/lib/utils";
import { formatPnl, formatR } from "@/lib/formatters";

export interface TradeShareData {
  symbol: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice?: number;
  pnl: number;
  rMultiple: number;
  date: Date;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  accountName?: string;
}

interface TradeShareCardProps {
  data: TradeShareData;
  nodeRef: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
}

const SIZES = {
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1440, height: 1080 },
};

export function TradeShareCard({ 
  data, 
  nodeRef, 
  width = 1080, 
  height = 1350 
}: TradeShareCardProps) {
  const isLong = data.direction === "LONG";
  const positivePnl = data.pnl >= 0;
  
  const config = SIZES.portrait; // Default to portrait for mobile sharing

  return (
    <div className="mx-auto w-full max-w-[600px]">
      {/* Card Container - Scaled for Preview */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-slate-900 to-slate-950 shadow-xl">
        <div
          ref={nodeRef}
          style={{ width: `${config.width}px`, height: `${config.height}px` }}
          className="overflow-hidden rounded-xl text-white"
        >
          <TradeShareContent data={data} isLong={isLong} positivePnl={positivePnl} />
        </div>
      </div>
    </div>
  );
}

function TradeShareContent({ 
  data, 
  isLong,
  positivePnl 
}: { 
  data: TradeShareData; 
  isLong: boolean;
  positivePnl: boolean;
}) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Background Gradient */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg,#0b0f14 0%,#0d1422 100%)" }}
      />

      {/* Content Container */}
      <div className="relative z-10 flex h-full flex-col px-10 pt-8 pb-7">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div
              className="font-semibold text-slate-200 text-2xl"
            >
              {data.symbol}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {isLong ? "📈 LONG" : "📉 SHORT"} · {formatDate(data.date)}
              {data.accountName ? ` · ${data.accountName}` : ""}
            </div>
          </div>
          
          {/* Brand Badge */}
          <div className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-slate-200 uppercase ring-1 ring-white/10">
            Ash Trade Journal
          </div>
        </div>

        {/* Hero */}
        <div className="mt-6 flex items-center gap-8">
          <div className="min-w-0">
            <div className="text-base font-semibold uppercase tracking-[0.24em] text-slate-400">
              {data.result}
            </div>
            
            <div
              className={cn(
                "mt-2 leading-none font-bold tabular-nums tracking-tight",
                "text-[96px]",
                positivePnl ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {positivePnl ? "+" : ""}{formatPnl(data.pnl, "USD")}
            </div>

            <div
              className={cn(
                "flex items-center gap-5 font-semibold text-slate-300 mt-3 text-2xl"
              )}
            >
              <span
                className={cn(positivePnl ? "text-emerald-300/90" : "text-rose-300/90")}
              >
                {formatR(data.rMultiple)}
              </span>
            </div>
          </div>
        </div>

        {/* Entry/Exit Prices */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <MetricTile
            label="Entry Price"
            value={`${data.entryPrice.toLocaleString()}`}
            large={true}
          />
          {data.exitPrice && (
            <MetricTile
              label="Exit Price"
              value={`${data.exitPrice.toLocaleString()}`}
              large={true}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
          <span className="text-slate-500">Individual trade</span>
          <span className="text-slate-400 tabular-nums">
            {positivePnl ? "WINNER" : "LOSER"} · {formatR(data.rMultiple)}R
          </span>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.07] px-4 py-4 ring-1 ring-white/10">
      <div className="text-xs tracking-wide text-slate-400 uppercase">{label}</div>
      <div
        className={cn(
          "mt-1.5 font-bold leading-tight tabular-nums",
          large ? "text-3xl" : "text-2xl",
          "text-white"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
