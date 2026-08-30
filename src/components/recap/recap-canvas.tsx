"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  formatPnl,
  formatPercent,
  formatR,
  formatSignedPct,
} from "@/lib/formatters";
import {
  RECAP_FORMATS,
  RECAP_HEADLINE_OPTIONS,
  recapDimension,
  type RecapFormat,
} from "@/lib/constants";
import { ShareBackdrop } from "@/components/trade-share-card";
import { ShareBrandBadge } from "@/components/share-brand";

export interface RecapMetrics {
  totalR: number;
  totalPnl: number;
  returnPct: number | null;
  winRate: number | null;
  profitFactor: number | null;
  expectancyR: number | null;
  tradeCount: number;
  wins: number;
  losses: number;
  maxDrawdownR: number;
  maxDrawdownPnl: number;
}

export interface RecapDaily {
  label: string;
  r: number;
  pnl: number;
  count: number;
}

export interface RecapPayload {
  type: "daily" | "weekly" | "monthly";
  title: string;
  periodLabel: string;
  accountName: string;
  provider: string | null;
  accountLogo: string | null;
  currency: string;
  metrics: RecapMetrics;
  best: { symbol: string; r: number; pnl: number } | null;
  worst: { symbol: string; r: number; pnl: number } | null;
  daily: RecapDaily[];
}

const METRIC_KEY_LABELS: Record<string, string> = {
  returnPct: "Return %",
  totalR: "Total R",
  totalPnl: "Net P&L",
  winRate: "Win Rate",
  profitFactor: "Profit Factor",
  expectancyR: "Avg R",
  tradeCount: "Trades",
  maxDrawdownR: "Max Drawdown",
};

const METRIC_KEYS = Object.keys(METRIC_KEY_LABELS);

type HeadlineKey = "returnPct" | "totalR" | "totalPnl";

export function RecapCanvas({ payload }: { payload: RecapPayload }) {
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.5);
  const [headline, setHeadline] = React.useState<HeadlineKey>("returnPct");
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>({
    returnPct: true,
    totalR: true,
    totalPnl: true,
    winRate: true,
    profitFactor: true,
    expectancyR: true,
    tradeCount: true,
    maxDrawdownR: true,
  });
  const [exporting, setExporting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [format, setFormat] = React.useState<string>(RECAP_FORMATS[0].value);

  const dim: RecapFormat = React.useMemo(
    () => recapDimension(format),
    [format]
  );

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / dim.width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dim.width]);

  const createImage = async () => {
    const node = nodeRef.current;
    if (!node) return null;
    return toPng(node, {
      width: dim.width,
      height: dim.height,
      pixelRatio: 1,
      cacheBust: true,
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const dataUrl = await createImage();
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.download = `trade-journal-${payload.type}-${payload.periodLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error(err);
      toast.error("Could not export image.");
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      const dataUrl = await createImage();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      toast.success("Recap copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy image. Use download instead.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={exporting}>
            <Share2 data-icon="inline-start" /> {copied ? "Copied!" : "Copy"}
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download data-icon="inline-start" />
            )}
            {exporting ? "Exporting…" : "Download PNG"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div ref={containerRef} className="mx-auto w-full max-w-[800px]">
          {/* Preview wrapper — sized to the scaled dimensions so nothing overflows */}
          <div
            className="relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-card"
            style={{ height: dim.height * scale }}
          >
            {/* Scaled surface (preview only) */}
            <div
              style={{
                width: dim.width,
                height: dim.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {/* Capture node — always full size, no transform, so exported
                  images are exactly dim.width × dim.height with no blank margins */}
              <div
                ref={nodeRef}
                className="overflow-hidden rounded-xl text-white"
                style={{ width: dim.width, height: dim.height }}
              >
                <CleanLayout payload={payload} headline={headline} enabled={enabled} landscape={dim.width > dim.height} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm font-semibold">Settings</div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Card size</span>
              <div className="flex flex-wrap gap-1">
                {RECAP_FORMATS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setFormat(o.value)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      format === o.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Headline number</span>
              <div className="flex flex-wrap gap-1">
                {RECAP_HEADLINE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setHeadline(o.value as HeadlineKey)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      headline === o.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-1 flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Metrics</span>
              {METRIC_KEYS.map((k) => (
                <label
                  key={k}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span>{METRIC_KEY_LABELS[k]}</span>
                  <Switch
                    checked={enabled[k]}
                    onCheckedChange={(v) =>
                      setEnabled((s) => ({ ...s, [k]: v }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Clean template — responsive 4:3 landscape / 3:4 portrait            */
/* ------------------------------------------------------------------ */

function CleanLayout({
  payload,
  headline,
  enabled,
  landscape,
}: {
  payload: RecapPayload;
  headline: HeadlineKey;
  enabled: Record<string, boolean>;
  landscape: boolean;
}) {
  const m = payload.metrics;

  const headlineInfo = (() => {
    if (headline === "returnPct") {
      return {
        value: formatSignedPct(m.returnPct),
        positive: (m.returnPct ?? 0) >= 0,
      };
    }
    if (headline === "totalR") {
      return {
        value: formatR(m.totalR),
        positive: m.totalR >= 0,
      };
    }
    return {
      value: formatPnl(m.totalPnl, payload.currency),
      positive: m.totalPnl >= 0,
    };
  })();

  const headlineVisible = enabled[headline];
  const showR = enabled.totalR;
  const showPnl = enabled.totalPnl;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Subtle dark gradient — removed aurora blur that occluded mini calendar */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800" />

      <div
        className={cn(
          "relative z-10 flex h-full flex-col",
          landscape ? "px-12 pt-8 pb-7" : "px-10 pt-8 pb-7"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div
              className={cn(
                "font-semibold text-slate-200",
                landscape ? "text-2xl" : "text-3xl"
              )}
            >
              {payload.periodLabel}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {payload.accountName}
              {payload.provider ? ` · ${payload.provider}` : ""}
            </div>
          </div>
          <ShareBrandBadge logoUrl={payload.accountLogo} alt={payload.accountName} />
        </div>

        {/* Hero */}
        <div
          className={cn(
            "mt-6 flex gap-8",
            landscape ? "items-center justify-between" : "flex-col"
          )}
        >
          <div className="min-w-0">
            <div className="text-base font-semibold uppercase tracking-[0.24em] text-slate-400">
              {payload.title}
            </div>
            {headlineVisible && (
              <div
                className={cn(
                  "mt-2 leading-none font-bold tabular-nums tracking-tight",
                  landscape ? "text-[112px]" : "text-[96px]",
                  headlineInfo.positive ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {headlineInfo.value}
              </div>
            )}
            {(showR || showPnl) && (
              <div
                className={cn(
                  "flex items-center gap-5 font-semibold text-slate-300",
                  landscape ? "mt-3 text-2xl" : "mt-4 text-3xl"
                )}
              >
                {showR && (
                  <span
                    className={cn(m.totalR >= 0 ? "text-emerald-300/90" : "text-rose-300/90")}
                  >
                    {formatR(m.totalR)}
                  </span>
                )}
                {showPnl && (
                  <span
                    className={cn(m.totalPnl >= 0 ? "text-emerald-300/90" : "text-rose-300/90")}
                  >
                    {formatPnl(m.totalPnl, payload.currency)}
                  </span>
                )}
              </div>
            )}
          </div>

          {(payload.best || payload.worst) && (
            <div
              className={cn(
                "grid gap-3",
                landscape ? "w-[36%] shrink-0 grid-cols-2" : "w-full grid-cols-2"
              )}
            >
              {payload.best && (
                <div className="rounded-xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/10">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Best Trade
                  </div>
                  <div
                    className={cn(
                      "mt-1.5 font-semibold tabular-nums text-emerald-400",
                      landscape ? "text-xl" : "text-2xl"
                    )}
                  >
                    {payload.best.symbol} {formatR(payload.best.r)}
                  </div>
                </div>
              )}
              {payload.worst && (
                <div className="rounded-xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/10">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Worst Trade
                  </div>
                  <div
                    className={cn(
                      "mt-1.5 font-semibold tabular-nums text-rose-400",
                      landscape ? "text-xl" : "text-2xl"
                    )}
                  >
                    {payload.worst.symbol} {formatR(payload.worst.r)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metric grid */}
        <div
          className={cn(
            "mt-6 grid gap-3",
            landscape ? "grid-cols-4" : "grid-cols-2"
          )}
        >
          {enabled.returnPct && (
            <MetricTile
              label="Return %"
              value={formatSignedPct(m.returnPct)}
              positive={(m.returnPct ?? 0) >= 0}
              large={landscape}
            />
          )}
          {enabled.totalR && (
            <MetricTile
              label="Total R"
              value={formatR(m.totalR)}
              positive={m.totalR >= 0}
              large={landscape}
            />
          )}
          {enabled.totalPnl && (
            <MetricTile
              label="Net P&L"
              value={formatPnl(m.totalPnl, payload.currency)}
              positive={m.totalPnl >= 0}
              large={landscape}
            />
          )}
          {enabled.winRate && (
            <MetricTile
              label="Win Rate"
              value={m.winRate == null ? "—" : formatPercent(m.winRate)}
              large={landscape}
            />
          )}
          {enabled.profitFactor && (
            <MetricTile
              label="Profit Factor"
              value={
                m.profitFactor == null
                  ? m.wins > 0 && m.losses === 0
                    ? "∞"
                    : "—"
                  : m.profitFactor.toFixed(2)
              }
              large={landscape}
            />
          )}
          {enabled.expectancyR && (
            <MetricTile
              label="Avg R / Trade"
              value={formatR(m.expectancyR)}
              positive={(m.expectancyR ?? 0) >= 0}
              large={landscape}
            />
          )}
          {enabled.tradeCount && (
            <MetricTile label="Trades" value={`${m.tradeCount}`} large={landscape} />
          )}
          {enabled.maxDrawdownR && (
            <MetricTile
              label="Max Drawdown"
              value={formatR(-m.maxDrawdownR)}
              positive={false}
              large={landscape}
            />
          )}
        </div>

        {/* Day-by-day calendar */}
        {payload.daily.length > 0 && (
          <div className="mt-6 min-h-0 flex-1">
            <MiniCalendar days={payload.daily} compact={landscape} />
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
          <span className="text-slate-500">Period recap</span>
          <span className="text-slate-400 tabular-nums">
            {m.wins}W · {m.losses}L · {m.tradeCount - m.wins - m.losses}BE
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({
  days,
  compact,
}: {
  days: RecapDaily[];
  compact: boolean;
}) {
  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.r)));
  const hasActive = days.some((d) => d.count > 0);
  const weekly = days.length <= 7;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Day by day
        </div>
        {!hasActive && (
          <span className="text-sm text-slate-500">No trades yet</span>
        )}
      </div>
      <div
        className={cn(
          "mt-3 grid grid-cols-7",
          compact ? "gap-2" : "gap-3",
          weekly
            ? "h-24"
            : cn(
                "min-h-0 flex-1",
                compact
                  ? "[grid-auto-rows:minmax(56px,1fr)]"
                  : "[grid-auto-rows:minmax(72px,1fr)]"
              )
        )}
      >
        {days.map((d, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-lg px-2.5 py-2 ring-1 ring-white/10"
            style={cellBg(d.r, maxAbs)}
          >
            <span className="text-xs font-medium text-slate-400">
              {d.label}
            </span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                !compact || weekly ? "text-lg" : "text-base",
                d.count > 0
                  ? d.r >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                  : "text-slate-700"
              )}
            >
              {d.count > 0 ? `${d.r >= 0 ? "+" : ""}${d.r.toFixed(1)}` : "·"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function cellBg(r: number, maxAbs: number): React.CSSProperties {
  if (r === 0) return {};
  const a = 0.06 + (0.5 * Math.min(Math.abs(r), maxAbs)) / maxAbs;
  return r > 0
    ? { background: `rgba(52,211,153,${a})` }
    : { background: `rgba(251,113,133,${a})` };
}

function MetricTile({
  label,
  value,
  positive,
  large,
}: {
  label: string;
  value: string;
  positive?: boolean;
  large?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.07] px-4 py-4 ring-1 ring-white/10">
      <div className="text-xs tracking-wide text-slate-400 uppercase">{label}</div>
      <div
        className={cn(
          "mt-1.5 font-bold leading-tight tabular-nums",
          large ? "text-3xl" : "text-2xl",
          positive === undefined ? "text-white" : positive ? "text-emerald-400" : "text-rose-400"
        )}
      >
        {value}
      </div>
    </div>
  );
}