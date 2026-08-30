"use client";

import { ArrowUpRight, ArrowDownRight, CalendarClock, Wallet, ImageIcon } from "lucide-react";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CardShell } from "@/components/ui/card-shell";
import { TradeDetailActions } from "@/components/journal/trade-detail-actions";
import { formatCurrency, formatDateTime, formatPnl, formatR, formatPrice } from "@/lib/formatters";
import { RESULT_LABEL } from "@/lib/constants";
import { TradePlanCard } from "@/components/trade-plan-card";

interface JournalPageContentProps {
  trade: any;
}

export function JournalPageContent({ trade }: JournalPageContentProps) {
  const router = useRouter();
  
  const dto = { ...trade };
  const currency = trade.account.currency;
  const { images } = trade;
  const beforeImages = images.filter((i) => i.type === "BEFORE");
  const afterImages = images.filter((i) => i.type === "AFTER");
  const isLong = trade.direction === "LONG";
  const win = (trade.pnl ?? 0) >= 0;

  // Prepare share data
  const shareData: any = {
    symbol: trade.symbol,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice ?? undefined,
    pnl: trade.pnl ?? 0,
    rMultiple: trade.rMultiple ?? 0,
    date: trade.closedAt,
    result: trade.result,
    accountName: trade.account.name,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Back navigation */}
      <Link href="/journal" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← Back to Journal
      </Link>

      {/* Header Section */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg",
              isLong ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}
          >
            {isLong ? (
              <ArrowUpRight className="size-6" />
            ) : (
              <ArrowDownRight className="size-6" />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{trade.symbol}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {trade.setup && <Badge variant="secondary">{trade.setup}</Badge>}
              {trade.strategy && <Badge variant="outline">{trade.strategy}</Badge>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="text-right">
            <div className={cn("text-2xl font-bold tabular-nums", win ? "text-emerald-500" : "text-rose-500")}>
              {formatPnl(trade.pnl ?? 0, currency)}
            </div>
            <div className={cn("text-sm tabular-nums", win ? "text-emerald-500/80" : "text-rose-500/80")}>
              {formatR(trade.rMultiple)}
            </div>
          </div>

          <div className="hidden flex-col gap-1 text-xs text-muted-foreground sm:flex">
            <div className="flex items-center gap-1.5">
              <Wallet className="size-3.5" />
              <span>{formatCurrency(trade.entryPrice, currency)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              <span>{formatDateTime(trade.closedAt).time}</span>
            </div>
          </div>
        </div>

        <TradeDetailActions 
          trade={dto} 
          onShare={() => router.push(`/trade-share/${trade.id}`)}
        />
      </header>

      {/* Trade Plan */}
      {trade.tradePlan && (
        <CardShell title="Trade Plan" description="ICT narrative">
          <TradePlanCard plan={trade.tradePlan} />
        </CardShell>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Entries & Levels */}
          <CardShell title="Entries & Levels">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Level name="Entry" value={formatPrice(trade.entryPrice)} />
              <Level name="Exit" value={formatPrice(trade.exitPrice)} />
              <Level name="Stop Loss" value={formatPrice(trade.stopLoss)} tone="negative" />
              <Level name="Take Profit" value={formatPrice(trade.takeProfit)} tone="positive" />
              <Level name="1 : Risk" value={trade.rr == null ? "—" : `1 : ${trade.rr.toFixed(2)}`} />
            </div>
          </CardShell>

          {/* Screenshots */}
          <CardShell title="Screenshots" description="Your chart entries for this trade">
            {images.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                No screenshots attached to this trade.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {beforeImages.length > 0 && (
                  <ShotGroup label="Before" images={beforeImages} />
                )}
                {afterImages.length > 0 && (
                  <ShotGroup label="After" images={afterImages} />
                )}
              </div>
            )}
          </CardShell>

          {/* Notes */}
          <CardShell title="Notes" description="Your thoughts about this trade">
            {trade.notes ? (
              <p className="leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">No notes yet.</p>
            )}
          </CardShell>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          {/* Session */}
          {trade.session && (
            <CardShell title="Session">
              <div className="text-sm">{trade.session}</div>
            </CardShell>
          )}

          {/* Market Condition */}
          {trade.marketCondition && (
            <CardShell title="Market Condition">
              <div className="text-sm">{trade.marketCondition}</div>
            </CardShell>
          )}

          {/* Emotion */}
          {trade.emotion && (
            <CardShell title="Emotion">
              <div className="text-sm">{trade.emotion}</div>
            </CardShell>
          )}

          {/* Mistake */}
          {trade.mistake && trade.mistake !== "None" && (
            <CardShell title="Mistake">
              <div className="text-sm text-rose-500">{trade.mistake}</div>
            </CardShell>
          )}
        </div>
      </div>
    </div>
  );
}

function Level({ name, value, tone }: { name: string; value?: string | number; tone?: "positive" | "negative" }) {
  return (
    <div className={cn("rounded-lg p-3", tone === "positive" ? "bg-emerald-500/10" : tone === "negative" ? "bg-rose-500/10" : "bg-muted/30")}>
      <div className="text-xs text-muted-foreground">{name}</div>
      <div className={cn("mt-1 text-base font-semibold tabular-nums", tone === "positive" ? "text-emerald-500" : tone === "negative" ? "text-rose-500" : "text-slate-900 dark:text-slate-100")}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function ShotGroup({ label, images }: { label: string; images: any[] }) {
  if (images.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <ImageIcon className="size-4" /> {label}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {images.map((img) => (
          <img key={img.id} src={img.url} alt={label} className="aspect-video w-full rounded-lg object-cover ring-1 ring-inset ring-border" />
        ))}
      </div>
    </div>
  );
}
