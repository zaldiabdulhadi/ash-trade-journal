"use client";

import { toPng } from "html-to-image";
import { toast } from "sonner";
import * as React from "react";
import { cn } from "@/lib/utils";
import { formatPnl, formatR } from "@/lib/formatters";
import { ShareBrandBadge } from "@/components/share-brand";

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
  logoUrl?: string | null;
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

export function ShareBackdrop({ positive }: { positive: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {/* Base gradient with blur */}
      <div
        className="absolute inset-0"
        style={{ 
          background: "linear-gradient(155deg,#152040 0%,#0d1526 45%,#070b14 100%)",
          filter: "blur(0px)"
        }}
      />

      {/* Decorative line art with backdrop blur */}
      <div className="absolute inset-0 backdrop-blur-[2px]">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1080 1350"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="shareTrendFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity="0" />
              <stop offset="100%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Contour waves */}
          <path
            d="M0 260 C 180 210, 360 320, 540 270 S 900 200, 1080 250"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.5"
          />
          <path
            d="M0 470 C 220 420, 420 530, 640 480 S 900 400, 1080 450"
            fill="none"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1.5"
          />
          <path
            d="M0 720 C 260 660, 500 790, 760 730 S 960 650, 1080 690"
            fill="none"
            stroke="rgba(255,255,255,0.11)"
            strokeWidth="1.5"
          />
          <path
            d="M0 1000 C 240 940, 520 1070, 800 1010 S 980 930, 1080 970"
            fill="none"
            stroke="rgba(255,255,255,0.09)"
            strokeWidth="1.5"
          />
          <path
            d="M0 1250 C 300 1190, 560 1300, 840 1240 S 1000 1170, 1080 1210"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />

          {/* Diagonal hatch lines */}
          <path d="M-80 900 L600 40" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <path d="M80 1100 L880 180" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
          <path d="M620 1330 L1080 760" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
          <path d="M-60 660 L380 220" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />

          {/* Trending sparkline (up on win, down on loss) */}
          {positive ? (
            <>
              <polygon
                points="0,1240 200,1170 400,1200 600,1050 820,950 1080,850 1080,1350 0,1350"
                fill="url(#shareTrendFill)"
              />
              <polyline
                points="0,1240 200,1170 400,1200 600,1050 820,950 1080,850"
                fill="none"
                stroke="rgba(52,211,153,0.55)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <>
              <polygon
                points="0,840 200,930 400,890 600,1040 820,1120 1080,1210 1080,1350 0,1350"
                fill="url(#shareTrendFill)"
              />
              <polyline
                points="0,840 200,930 400,890 600,1040 820,1120 1080,1210"
                fill="none"
                stroke="rgba(251,113,133,0.55)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </svg>
      </div>

      {/* Aurora glows (tinted by result) with enhanced blur */}
      <div
        className={cn(
          "absolute -top-44 -right-32 h-[560px] w-[560px] rounded-full blur-[80px]",
          positive ? "bg-emerald-500/25" : "bg-rose-500/25"
        )}
      />
      <div className="absolute -bottom-48 -left-32 h-[640px] w-[640px] rounded-full bg-indigo-500/20 blur-[90px]" />
      <div
        className={cn(
          "absolute -top-24 -left-24 h-80 w-80 rounded-full blur-[70px]",
          positive ? "bg-teal-400/15" : "bg-orange-500/15"
        )}
      />

      {/* Accent rings */}
      <div className="absolute top-20 -right-24 h-64 w-64 rounded-full ring-1 ring-white/10" />
      <div className="absolute top-[206px] -right-[52px] h-40 w-40 rounded-full ring-1 ring-white/10" />
      <div className="absolute bottom-20 -left-16 h-72 w-72 rounded-full ring-1 ring-white/10" />

      {/* Faint grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 12%, transparent 40%, rgba(0,0,0,0.35) 100%)",
        }}
      />
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
      <ShareBackdrop positive={positivePnl} />

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
          <ShareBrandBadge logoUrl={data.logoUrl} alt={data.accountName ?? "Prop firm"} />
        </div>

        {/* Entry/Exit Prices */}
        <div className="mt-4 grid grid-cols-2 gap-3">
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
            WIN / LOSS · {formatR(data.rMultiple)}R
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
    <div className="rounded-xl bg-white/[0.10] px-4 py-4 ring-1 ring-white/20 backdrop-blur-sm">
      <div className="text-sm tracking-wide text-slate-300 uppercase">{label}</div>
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
