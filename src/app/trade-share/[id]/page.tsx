"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toPng } from "html-to-image";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  formatPnl,
  formatPercent,
  formatPrice,
  formatR,
  formatRR,
  formatSignedPct,
} from "@/lib/formatters";

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

interface TradeMetrics {
  returnPct: number | null;
  totalR: number;
  totalPnl: number;
  winRate: number | null;
  profitFactor: number | null;
  expectancyR: number | null;
  tradeCount: number;
  maxDrawdownR: number | null;
}

interface TradeCard {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  rr: number | null;
  rMultiple: number | null;
  pnl: number | null;
  riskAmount: number | null;
  riskPercent: number | null;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  session: string | null;
  marketCondition: string | null;
  tradePlan: string | null;
  notes: string | null;
  closedAt: string;
  account?: { name: string | null; currency: string | null };
}

function buildMetrics(trade: TradeCard): TradeMetrics {
  const { result } = trade;
  const fallbackR =
    trade.rMultiple ??
    (trade.pnl != null && trade.riskAmount ? trade.pnl / trade.riskAmount : null) ??
    (result === "WIN" ? 1 : result === "LOSS" ? -1 : 0);

  const returnPct =
    fallbackR != null && trade.riskPercent ? fallbackR * trade.riskPercent : null;

  return {
    returnPct,
    totalR: fallbackR,
    totalPnl: trade.pnl ?? 0,
    winRate: result === "WIN" ? 100 : result === "LOSS" ? 0 : null,
    profitFactor: result === "WIN" ? null : result === "LOSS" ? 0 : null,
    expectancyR: fallbackR,
    tradeCount: 1,
    maxDrawdownR: result === "LOSS" ? -Math.abs(fallbackR) : result === "BREAKEVEN" ? 0 : null,
  };
}

function buildContractType(trade: TradeCard): "LONG" | "SHORT" {
  return trade.direction;
}

export default function TradeSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.5);
  const [headline, setHeadline] = React.useState<HeadlineKey>("totalR");
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
  const [format, setFormat] = React.useState<"1080x1440" | "1440x1080">(
    "1080x1440"
  );
  const [trade, setTrade] = React.useState<TradeCard | null>(null);
  const [loading, setLoading] = React.useState(true);

  const portrait = format === "1080x1440";
  const dim = portrait
    ? { width: 1080, height: 1440 }
    : { width: 1440, height: 1080 };

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / dim.width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dim.width]);

  React.useEffect(() => {
    async function fetchTrade() {
      try {
        const { id } = await params;
        const res = await fetch(`/api/trades/${id}`);
        if (!res.ok) {
          notFound();
        }
        const data = await res.json();
        setTrade(data);
      } catch (error) {
        console.error("Failed to fetch trade:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    }
    fetchTrade();
  }, [params]);

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
      const dateStr = trade
        ? new Date(trade.closedAt).toISOString().split("T")[0]
        : "share";
      a.download = `trade-${trade?.symbol.toLowerCase() ?? "share"}-${dateStr}.png`;
      a.href = dataUrl;
      a.click();
      toast.success("Download started!");
    } catch (err) {
      console.error(err);
      toast.error("Could not export image.");
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    setExporting(true);
    try {
      const dataUrl = await createImage();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      toast.success("Trade copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy image. Use download instead.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trade) {
    notFound();
  }

  const metrics = buildMetrics(trade);
  const side = buildContractType(trade);

  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border bg-card px-6 py-4 sticky top-0 z-10">
        <Link
          href={`/journal/${trade.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to journal
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          Share {trade.symbol} result
        </h1>
        <p className="text-sm text-muted-foreground">
          Export your trade for social media
        </p>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={exporting}
            >
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
                  {/* Capture node — always full size, no transform */}
                  <div
                    ref={nodeRef}
                    className="overflow-hidden rounded-xl text-white"
                    style={{ width: dim.width, height: dim.height }}
                  >
                    <TradeLayout
                      trade={trade}
                      metrics={metrics}
                      side={side}
                      headline={headline}
                      enabled={enabled}
                      landscape={!portrait}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="text-sm font-semibold">Settings</div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Card size
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { value: "1080x1440", label: "3 × 4" },
                      { value: "1440x1080", label: "4 × 3" },
                    ].map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() =>
                          setFormat(o.value as "1080x1440" | "1440x1080")
                        }
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
                  <span className="text-xs text-muted-foreground">
                    Headline number
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { value: "returnPct", label: "Return %" },
                      { value: "totalR", label: "Total R" },
                      { value: "totalPnl", label: "Net P&L" },
                    ].map((o) => (
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
                        checked={enabled[k] ?? true}
                        onCheckedChange={(v) =>
                          setEnabled((s) => ({ ...s, [k]: v }))
                        }
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  3 × 4 for Instagram Stories &nbsp;|&nbsp; 4 × 3 for Twitter/X
                  posts
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trade card — responsive 4:3 landscape / 3:4 portrait                */
/* ------------------------------------------------------------------ */

function TradeLayout({
  trade,
  metrics,
  side,
  headline,
  enabled,
  landscape,
}: {
  trade: TradeCard;
  metrics: TradeMetrics;
  side: "LONG" | "SHORT";
  headline: HeadlineKey;
  enabled: Record<string, boolean>;
  landscape: boolean;
}) {
  const m = metrics;
  const positivePnl = m.totalPnl >= 0;
  const currency = trade.account?.currency ?? "USD";
  const accountName = trade.account?.name ?? null;
  const closedDate = new Date(trade.closedAt);

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
      value: formatPnl(m.totalPnl, currency),
      positive: positivePnl,
    };
  })();

  const headlineVisible = enabled[headline];
  const showR = enabled.totalR;
  const showPnl = enabled.totalPnl;

  const layoutTitle = side === "LONG" ? "📈 LONG" : "📉 SHORT";
  const footerText =
    trade.result === "WIN"
      ? "WINNER"
      : trade.result === "LOSS"
        ? "LOSER"
        : "BREAKEVEN";

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg,#0b0f14 0%,#0d1422 100%)" }}
      />

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
              {trade.symbol}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {layoutTitle}
              {accountName ? ` · ${accountName}` : ""}
            </div>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-slate-200 uppercase ring-1 ring-white/10">
            Ash Trade Journal
          </div>
        </div>

        {/* Hero */}
        <div className="mt-6">
          <div className="min-w-0">
            <div className="text-base font-semibold uppercase tracking-[0.24em] text-slate-400">
              {footerText}
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
                    className={cn(
                      m.totalR >= 0 ? "text-emerald-300/90" : "text-rose-300/90"
                    )}
                  >
                    {formatR(m.totalR)}
                  </span>
                )}
                {showPnl && (
                  <span
                    className={cn(
                      positivePnl ? "text-emerald-300/90" : "text-rose-300/90"
                    )}
                  >
                    {formatPnl(m.totalPnl, currency)}
                  </span>
                )}
              </div>
            )}
          </div>
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
              value={formatPnl(m.totalPnl, currency)}
              positive={positivePnl}
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
                m.profitFactor === null
                  ? m.totalR > 0
                    ? "∞"
                    : "—"
                  : m.profitFactor.toFixed(2)
              }
              positive={m.profitFactor === null ? false : m.profitFactor > 0}
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
            <MetricTile
              label="Trades"
              value={`${m.tradeCount}`}
              large={landscape}
            />
          )}
          {enabled.maxDrawdownR && (
            <MetricTile
              label="Max Drawdown"
              value={m.maxDrawdownR == null ? "—" : formatR(-m.maxDrawdownR)}
              positive={false}
              large={landscape}
            />
          )}
        </div>

        {/* Levels + plan + session/notes */}
        <div className="mt-6 flex min-h-0 flex-1 flex-col gap-3">
          <div
            className={cn(
              "grid gap-3",
              landscape ? "grid-cols-3" : "grid-cols-2"
            )}
          >
            <InfoTile label="Entry" value={formatPrice(trade.entryPrice, "")} />
            <InfoTile
              label="Exit"
              value={
                trade.exitPrice != null
                  ? formatPrice(trade.exitPrice, "")
                  : "—"
              }
            />
            <InfoTile
              label="Stop Loss"
              value={formatPrice(trade.stopLoss, "")}
              tone="negative"
            />
            <InfoTile
              label="Take Profit"
              value={formatPrice(trade.takeProfit, "")}
              tone="positive"
            />
            <InfoTile label="R:R" value={formatRR(trade.rr)} />
            <InfoTile label="Session" value={trade.session ?? "—"} />
          </div>

          <div
            className={cn(
              "grid gap-3",
              landscape ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            {trade.tradePlan && (
              <div className="rounded-xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/10">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  📋 Trading Plan
                </div>
                <p className="mt-1.5 text-sm text-slate-300 whitespace-pre-wrap break-words">
                  {trade.tradePlan}
                </p>
              </div>
            )}
            {(trade.notes || trade.marketCondition) && (
              <div className="rounded-xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/10">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  💡 Notes
                </div>
                <div className="mt-1.5 text-sm text-slate-300 space-y-1 whitespace-pre-wrap break-words">
                  {trade.marketCondition && (
                    <div>Market: {trade.marketCondition}</div>
                  )}
                  {trade.notes && <p>{trade.notes}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
          <span className="text-slate-500">
            {closedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-slate-400 tabular-nums">
            {footerText} · {formatR(m.totalR)}
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/10">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-semibold tabular-nums text-slate-100",
          "text-xl"
        )}
      >
        {value}
      </div>
    </div>
  );
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
      <div className="text-xs tracking-wide text-slate-400 uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-bold leading-tight tabular-nums",
          large ? "text-3xl" : "text-2xl",
          positive === undefined
            ? "text-white"
            : positive
              ? "text-emerald-400"
              : "text-rose-400"
        )}
      >
        {value}
      </div>
    </div>
  );
}