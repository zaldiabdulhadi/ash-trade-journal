"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ListChecks,
  Plus,
  X,
  ImagePlus,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CISD_TIMEFRAMES,
  EMOTIONS,
  ICT_CLOSURE_CANDLES,
  ICT_INTERNAL_CONTINUATIONS,
  LTF_CONFLUENCE_OPTIONS,
  MISTAKES,
  RESULT_OPTIONS,
  SESSIONS,
  SETUPS,
  STRATEGIES,
} from "@/lib/constants";
import {
  calculateRR,
  calculateRMultiple,
  resolveRiskAmount,
} from "@/lib/calculations/metrics";
import { formatRR } from "@/lib/formatters";
import { createTrade, updateTrade } from "@/app/actions/trades";
import type { AccountDTO, TradeDTO } from "@/lib/types";

const QUICK_SYMBOLS = [
  "XAUUSD",
  "US30",
  "NAS100",
  "SPX500",
  "GBPUSD",
  "EURUSD",
];

const DEFAULT_STRATEGIES = Array.from(new Set([...STRATEGIES]));
const DEFAULT_SESSIONS = Array.from(new Set(SESSIONS));

interface TradeFormProps {
  accounts: AccountDTO[];
  trade: TradeDTO | null;
  defaultAccountId?: string;
  isMobile?: boolean;
  onClose: () => void;
}

interface FormState {
  accountId: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  exitPrice: string;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  pnl: string;
  riskPercent: string;
  riskAmount: string;
  strategy: string;
  setup: string;
  session: string;
  timeframe: string;
  marketCondition: string;
  emotion: string;
  mistake: string;
  confidence: string;
  notes: string;
  planDailyHt: string;
  planDailyLt: string;
  planDailyCisd: string;
  planH4Ht: string;
  planH4Lt: string;
  planH4Cisd: string;
  planH1Ht: string;
  planH1Lt: string;
  planH1Cisd: string;
  planConfluence: string[];
  selectedNarrativeTimeframe: "daily" | "h4" | "h1";
  closedDate: string;
  closedTime: string;
  openedDate: string;
  openedTime: string;
}

function valueOf(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

function localDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const num = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function TradeForm({
  accounts,
  trade,
  defaultAccountId,
  isMobile,
  onClose,
}: TradeFormProps) {
  const router = useRouter();
  const submittingRef = React.useRef(false);

  const now = new Date();

  const [showAdvanced, setShowAdvanced] = React.useState(
    !!trade && hasAdvancedData(trade),
  );
  const [showTradePlan, setShowTradePlan] = React.useState(
    () => !!trade?.tradePlan,
  );
  const [submitting, setSubmitting] = React.useState(false);

  const [state, setState] = React.useState<FormState>(() => {
    const defaultAccount =
      (trade ? accounts.find((a) => a.id === trade.accountId) : null) ??
      accounts.find((a) => a.id === defaultAccountId) ??
      accounts.find((a) => a.isDefault) ??
      accounts[0];

    const closed = trade ? new Date(trade.closedAt) : now;
    const opened = trade ? new Date(trade.openedAt) : now;

    return {
      accountId: defaultAccount?.id ?? "",
      symbol: trade?.symbol ?? "",
      direction: trade?.direction ?? "LONG",
      entryPrice: valueOf(trade?.entryPrice),
      stopLoss: valueOf(trade?.stopLoss),
      takeProfit: valueOf(trade?.takeProfit),
      exitPrice: valueOf(trade?.exitPrice),
      result: trade?.result ?? "WIN",
      pnl: valueOf(trade?.pnl),
      riskPercent: valueOf(trade?.riskPercent),
      riskAmount: valueOf(trade?.riskAmount),
      strategy: trade?.strategy ?? "",
      setup: trade?.setup ?? "",
      session: trade?.session ?? "",
      timeframe: trade?.timeframe ?? "15M",
      marketCondition: trade?.marketCondition ?? "",
      emotion: trade?.emotion ?? "",
      mistake: trade?.mistake ?? "",
      confidence: trade?.confidence ? String(trade.confidence) : "",
      notes: trade?.notes ?? "",
      ...parseTradePlan(trade?.tradePlan),
      selectedNarrativeTimeframe: "daily",
      closedDate: localDateInput(closed),
      closedTime: localTimeInput(closed),
      openedDate: localDateInput(opened),
      openedTime: localTimeInput(opened),
    };
  });

  const [beforeFile, setBeforeFile] = React.useState<File | null>(null);
  const [afterFile, setAfterFile] = React.useState<File | null>(null);
  const [beforePreview, setBeforePreview] = React.useState<string | null>(null);
  const [afterPreview, setAfterPreview] = React.useState<string | null>(null);
  const [removeImageIds, setRemoveImageIds] = React.useState<string[]>([]);

  const existingBefore = trade?.images.find((i) => i.type === "BEFORE") ?? null;
  const existingAfter = trade?.images.find((i) => i.type === "AFTER") ?? null;

  const selectedAccount = accounts.find((a) => a.id === state.accountId);

  const rr = calculateRR(
    num(state.entryPrice),
    num(state.stopLoss),
    num(state.takeProfit),
    state.direction,
  );
  const effRisk = resolveRiskAmount(
    num(state.riskAmount),
    num(state.riskPercent),
    selectedAccount?.currentBalance ?? null,
  );
  const rMultiple = calculateRMultiple(num(state.pnl), effRisk);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const riskSource = React.useRef<"percent" | "amount">("percent");
  const riskBalance = selectedAccount?.currentBalance ?? null;

  const setRiskPercent = (v: string) => {
    riskSource.current = "percent";
    const pct = num(v);
    if (pct != null && pct > 0 && riskBalance != null && riskBalance > 0) {
      const amount = Math.round(riskBalance * pct) / 100;
      setState((s) => ({ ...s, riskPercent: v, riskAmount: String(amount) }));
    } else {
      setState((s) => ({ ...s, riskPercent: v, riskAmount: "" }));
    }
  };

  const setRiskAmount = (v: string) => {
    riskSource.current = "amount";
    const amount = num(v);
    if (amount != null && amount > 0 && riskBalance != null && riskBalance > 0) {
      const pct = Math.round(((amount / riskBalance) * 100) * 100) / 100;
      setState((s) => ({ ...s, riskAmount: v, riskPercent: String(pct) }));
    } else {
      setState((s) => ({ ...s, riskAmount: v, riskPercent: "" }));
    }
  };

  React.useEffect(() => {
    setState((prev) => {
      const bal = accounts.find((a) => a.id === prev.accountId)?.currentBalance ?? null;
      if (bal == null || bal <= 0) return prev;
      if (riskSource.current === "percent") {
        const pct = num(prev.riskPercent);
        if (pct != null && pct > 0) {
          const amount = Math.round(bal * pct) / 100;
          return { ...prev, riskAmount: String(amount) };
        }
      } else {
        const amount = num(prev.riskAmount);
        if (amount != null && amount > 0) {
          const pct = Math.round(((amount / bal) * 100) * 100) / 100;
          return { ...prev, riskPercent: String(pct) };
        }
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.accountId]);

  const toggleConfluence = React.useCallback(
    (o: string) =>
      set(
        "planConfluence",
        state.planConfluence.includes(o)
          ? state.planConfluence.filter((x) => x !== o)
          : [...state.planConfluence, o],
      ),
    [state.planConfluence],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!state.accountId) {
      toast.error("Select an account first");
      return;
    }
    if (!state.entryPrice || num(state.entryPrice) == null) {
      toast.error("Entry price is required");
      return;
    }
    if (!state.symbol.trim()) {
      toast.error("Symbol is required");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    const fd = new FormData();
    fd.set("accountId", state.accountId);
    fd.set("symbol", state.symbol);
    fd.set("direction", state.direction);
    fd.set("entryPrice", state.entryPrice);
    fd.set("stopLoss", state.stopLoss);
    fd.set("takeProfit", state.takeProfit);
    fd.set("exitPrice", state.exitPrice);
    fd.set("result", state.result);
    fd.set("pnl", state.pnl || "0");
    fd.set("riskPercent", state.riskPercent);
    fd.set("riskAmount", state.riskAmount);
    fd.set("strategy", composeStrategy(state));
    fd.set("setup", state.setup);
    fd.set("session", state.session);
    fd.set("timeframe", state.timeframe);
    fd.set("marketCondition", state.marketCondition);
    fd.set("emotion", state.emotion);
    fd.set("mistake", state.mistake);
    fd.set("confidence", state.confidence);
    fd.set("notes", state.notes);
    fd.set("tradePlan", composeTradePlan(state));
    fd.set("closedAt", state.closedDate);
    fd.set("closedTime", state.closedTime);
    fd.set("openedAt", state.openedDate);
    fd.set("openedTime", state.openedTime);
    fd.set("removeImageIds", removeImageIds.join(","));
    if (beforeFile) fd.set("beforeImage", beforeFile);
    if (afterFile) fd.set("afterImage", afterFile);
    if (trade) fd.set("id", trade.id);

    try {
      const res = trade ? await updateTrade(fd) : await createTrade(fd);
      if (res.ok) {
        toast.success(trade ? "Trade updated" : "Trade saved");
        router.refresh();
        onClose();
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong saving the trade");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="text-2xl">📒</div>
        <p className="text-muted-foreground">No trading accounts yet.</p>
        <p className="text-sm text-muted-foreground">
          Create an account before journaling a trade.
        </p>
        <Button onClick={() => router.push("/accounts")}>Go to Accounts</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
        <div>
          <h2 className={cn("font-medium", isMobile ? "text-lg" : "text-base")}>
            {trade ? "Edit Trade" : "Add Trade"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Journal a completed trade
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close"
        >
          <X />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Account */}
        <div className="grid gap-1.5">
          <Label>Account</Label>
          <Select
            value={state.accountId}
            onValueChange={(v) => v != null && set("accountId", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name || a.provider || a.id.substring(0, 8) + "..."}
                  {a.isDefault ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Symbol */}
        <div className="grid gap-1.5">
          <Label htmlFor="symbol">Symbol</Label>
          <Input
            id="symbol"
            value={state.symbol}
            onChange={(e) => set("symbol", e.target.value.toUpperCase())}
            placeholder="XAUUSD"
            autoFocus={!trade && !isMobile}
          />
          {!state.symbol && (
            <div className="flex flex-wrap gap-1 pt-1">
              {QUICK_SYMBOLS.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => set("symbol", s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Direction */}
        <div className="grid gap-1.5">
          <Label>Direction</Label>
          <div className="grid grid-cols-2 gap-2">
            <DirectionButton
              active={state.direction === "LONG"}
              onClick={() => set("direction", "LONG")}
              icon={<TrendingUp />}
              label="Long"
              tone="buy"
            />
            <DirectionButton
              active={state.direction === "SHORT"}
              onClick={() => set("direction", "SHORT")}
              icon={<TrendingDown />}
              label="Short"
              tone="sell"
            />
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            label="Entry"
            value={state.entryPrice}
            onChange={(v) => set("entryPrice", v)}
            placeholder="3400"
            required
          />
          <NumberField
            label="Stop Loss"
            value={state.stopLoss}
            onChange={(v) => set("stopLoss", v)}
            placeholder="3390"
          />
          <NumberField
            label="Take Profit"
            value={state.takeProfit}
            onChange={(v) => set("takeProfit", v)}
            placeholder="3420"
          />
        </div>

        {/* Result / P&L / Risk */}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Result</Label>
            <Select
              value={state.result}
              onValueChange={(v) =>
                v != null && set("result", v as FormState["result"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULT_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumberField
            label={
              selectedAccount ? `P&L (${selectedAccount.currency})` : "P&L ($)"
            }
            value={state.pnl}
            onChange={(v) => set("pnl", v)}
            placeholder="200"
          />
          <NumberField
            label="Risk"
            value={state.riskPercent}
            onChange={setRiskPercent}
            placeholder="0.5%"
            suffix="%"
          />
        </div>

        {/* Auto metrics preview */}
        {(rr != null || rMultiple != null) && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2.5 text-xs">
            <span className="flex flex-1 items-center gap-1 text-muted-foreground">
              RR{" "}
              <span className="font-medium tabular-nums text-foreground">
                {formatRR(rr)}
              </span>
              <span className="text-muted-foreground/60">
                — calculated automatically
              </span>
            </span>
            {rMultiple != null && (
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 font-semibold tabular-nums",
                  rMultiple >= 0
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-rose-500/15 text-rose-500",
                )}
              >
                {rMultiple >= 0 ? "+" : ""}
                {rMultiple.toFixed(1)}R
              </span>
            )}
          </div>
        )}

        {/* Trade Plan */}
        <div>
          <button
            type="button"
            onClick={() => setShowTradePlan((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <ListChecks className="size-4" /> Trade Plan · ICT Narrative
            </span>
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                showTradePlan && "rotate-180",
              )}
            />
          </button>

          {showTradePlan && (
            <div className="mt-3 flex flex-col gap-3">
              {/* Timeframe Selector */}
              <div className="grid gap-1.5">
                <Label>SELECT NARRATIVE TIMEFRAME</Label>
                <Select
                  value={state.selectedNarrativeTimeframe}
                  onValueChange={(v) =>
                    set(
                      "selectedNarrativeTimeframe",
                      v as "daily" | "h4" | "h1",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="CHOOSE TIMEFRAME" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">DAILY NARRATIVE</SelectItem>
                    <SelectItem value="h4">H4 NARRATIVE</SelectItem>
                    <SelectItem value="h1">H1 NARRATIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Narrative Block - Only CISD field */}
              {(() => {
                switch (state.selectedNarrativeTimeframe) {
                  case "daily":
                    return (
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="grid gap-2 sm:grid-cols-1">
                          <SuggestInput
                            label="CISD"
                            value={state.planDailyCisd}
                            onChange={(v) => set("planDailyCisd", v)}
                            options={CISD_TIMEFRAMES}
                            placeholder="M5/M3"
                          />
                        </div>
                      </div>
                    );
                  case "h4":
                    return (
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="grid gap-2 sm:grid-cols-1">
                          <SuggestInput
                            label="CISD"
                            value={state.planH4Cisd}
                            onChange={(v) => set("planH4Cisd", v)}
                            options={CISD_TIMEFRAMES}
                            placeholder="M5/M3"
                          />
                        </div>
                      </div>
                    );
                  case "h1":
                    return (
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="grid gap-2 sm:grid-cols-1">
                          <SuggestInput
                            label="CISD"
                            value={state.planH1Cisd}
                            onChange={(v) => set("planH1Cisd", v)}
                            options={CISD_TIMEFRAMES}
                            placeholder="M5/M3"
                          />
                        </div>
                      </div>
                    );
                  default:
                    return null;
                }
              })()}

              {/* LTF Confluence */}
              <div className="grid gap-1.5">
                <Label>LTF Confluence</Label>
                <div className="flex flex-wrap gap-1.5">
                  {LTF_CONFLUENCE_OPTIONS.map((o) => {
                    const active = state.planConfluence.includes(o);
                    return (
                      <Button
                        key={o}
                        type="button"
                        size="xs"
                        variant={active ? "default" : "outline"}
                        onClick={() => toggleConfluence(o)}
                      >
                        {o}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Advanced */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Plus className="size-4" /> Advanced Details
            </span>
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                showAdvanced && "rotate-180",
              )}
            />
          </button>

          {showAdvanced && (
            <div className="mt-3 flex flex-col gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <NumberField
                  label="Exit price"
                  value={state.exitPrice}
                  onChange={(v) => set("exitPrice", v)}
                  placeholder="3420"
                />
                <NumberField
                  label="Risk amount ($)"
                  value={state.riskAmount}
                  onChange={setRiskAmount}
                  placeholder="Auto from %"
                />
                <SuggestInput
                  label="Strategy"
                  value={state.strategy}
                  onChange={(v) => set("strategy", v)}
                  options={DEFAULT_STRATEGIES}
                />
                <SuggestInput
                  label="Setup"
                  value={state.setup}
                  onChange={(v) => set("setup", v)}
                  options={SETUPS}
                />
                <SuggestInput
                  label="Session"
                  value={state.session}
                  onChange={(v) => set("session", v)}
                  options={DEFAULT_SESSIONS}
                />
                <div className="grid gap-1.5">
                  <Label>Confidence</Label>
                  <Select
                    value={state.confidence}
                    onValueChange={(v) => v != null && set("confidence", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4", "5"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                          {Number(c) === 3
                            ? " · neutral"
                            : Number(c) > 3
                              ? " · high"
                              : " · low"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <SuggestInput
                  label="Emotion"
                  value={state.emotion}
                  onChange={(v) => set("emotion", v)}
                  options={EMOTIONS}
                />
                <SuggestInput
                  label="Mistake"
                  value={state.mistake}
                  onChange={(v) => set("mistake", v)}
                  options={MISTAKES}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="closedDate">Closed date</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="closedDate"
                      type="date"
                      value={state.closedDate}
                      onChange={(e) => set("closedDate", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={state.closedTime}
                      onChange={(e) => set("closedTime", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="openedDate">Opened date</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="openedDate"
                      type="date"
                      value={state.openedDate}
                      onChange={(e) => set("openedDate", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={state.openedTime}
                      onChange={(e) => set("openedTime", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={state.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="What did you see? Why did you take the trade?"
                  rows={3}
                />
              </div>

              {/* Screenshots */}
              <div className="grid gap-2 sm:grid-cols-2">
                <ScreenshotField
                  label="Before Trade"
                  hint="What did I see before entering?"
                  preview={beforePreview}
                  existing={
                    existingBefore &&
                    !removeImageIds.includes(existingBefore.id)
                      ? existingBefore
                      : null
                  }
                  onFile={(f) => {
                    setBeforeFile(f);
                    if (f) {
                      const url = URL.createObjectURL(f);
                      setBeforePreview(url);
                    }
                  }}
                  onRemoveExisting={() => {
                    if (existingBefore)
                      setRemoveImageIds((ids) => [...ids, existingBefore.id]);
                  }}
                  onRemoveNew={() => {
                    setBeforeFile(null);
                    setBeforePreview(null);
                  }}
                />
                <ScreenshotField
                  label="After Trade"
                  hint="What actually happened?"
                  preview={afterPreview}
                  existing={
                    existingAfter && !removeImageIds.includes(existingAfter.id)
                      ? existingAfter
                      : null
                  }
                  onFile={(f) => {
                    setAfterFile(f);
                    if (f) {
                      const url = URL.createObjectURL(f);
                      setAfterPreview(url);
                    }
                  }}
                  onRemoveExisting={() => {
                    if (existingAfter)
                      setRemoveImageIds((ids) => [...ids, existingAfter.id]);
                  }}
                  onRemoveNew={() => {
                    setAfterFile(null);
                    setAfterPreview(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t bg-muted/40 px-4 py-3 sm:px-5">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="min-w-[120px]">
          {submitting && <Loader2 className="animate-spin" />}
          {trade ? "Save changes" : "Save Trade"}
        </Button>
      </div>
    </form>
  );
}

function hasAdvancedData(trade: TradeDTO): boolean {
  return !!(
    trade.exitPrice ||
    trade.riskAmount ||
    trade.strategy ||
    trade.setup ||
    trade.session ||
    trade.timeframe ||
    trade.marketCondition ||
    trade.emotion ||
    trade.mistake ||
    trade.confidence ||
    trade.notes ||
    trade.tradePlan ||
    trade.images.length > 0
  );
}

function parseTradePlan(plan: string | null | undefined): {
  planDailyHt: string;
  planDailyLt: string;
  planDailyCisd: string;
  planH4Ht: string;
  planH4Lt: string;
  planH4Cisd: string;
  planH1Ht: string;
  planH1Lt: string;
  planH1Cisd: string;
  planConfluence: string[];
} {
  const out = {
    planDailyHt: "",
    planDailyLt: "",
    planDailyCisd: "",
    planH4Ht: "",
    planH4Lt: "",
    planH4Cisd: "",
    planH1Ht: "",
    planH1Lt: "",
    planH1Cisd: "",
    planConfluence: [] as string[],
  };
  if (!plan) return out;
  const sections = plan.split(/\n\s*\n/);
  for (const section of sections) {
    const lines = section
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const head = lines[0].toUpperCase();
    const body: Record<string, string> = {};
    for (const raw of lines.slice(1)) {
      const [key, ...rest] = raw.split(" - ");
      if (!key || rest.length === 0) continue;
      body[key.toUpperCase().trim()] = rest.join(" - ").trim();
    }
    if (head.startsWith("DAILY")) {
      if (body["H4"]) out.planDailyHt = body["H4"];
      if (body["H1"]) out.planDailyLt = body["H1"];
      if (body["CISD"]) out.planDailyCisd = body["CISD"];
    } else if (head.startsWith("H4 ")) {
      if (body["H1"]) out.planH4Ht = body["H1"];
      if (body["M30/M15"]) out.planH4Lt = body["M30/M15"];
      if (body["CISD"]) out.planH4Cisd = body["CISD"];
    } else if (head.startsWith("H1 ")) {
      if (body["M30"]) out.planH1Ht = body["M30"];
      if (body["M15"]) out.planH1Lt = body["M15"];
      if (body["CISD"]) out.planH1Cisd = body["CISD"];
    } else if (head.startsWith("LTF")) {
      out.planConfluence = LTF_CONFLUENCE_OPTIONS.filter((o) =>
        lines.slice(1).join(" ").includes(o),
      );
    }
  }
  return out;
}

const NARRATIVE_LABELS: Record<FormState["selectedNarrativeTimeframe"], string> = {
  daily: "Daily",
  h4: "H4",
  h1: "H1",
};

function composeStrategy(s: FormState): string {
  // Drop any previously-composed narrative tail from the strategy field
  const baseTokens = s.strategy
    .split("·")
    .map((t) => t.trim())
    .filter(Boolean);
  const narrativeStart = baseTokens.findIndex((t) =>
    ["Daily", "H4", "H1"].includes(t),
  );
  const base = (
    narrativeStart >= 0 ? baseTokens.slice(0, narrativeStart) : baseTokens
  ).join(" · ");

  const label = NARRATIVE_LABELS[s.selectedNarrativeTimeframe];
  const cisd =
    s.selectedNarrativeTimeframe === "daily"
      ? s.planDailyCisd
      : s.selectedNarrativeTimeframe === "h4"
        ? s.planH4Cisd
        : s.planH1Cisd;

  const narrative: string[] = [];
  if (cisd.trim()) narrative.push(`${label} · ${cisd.trim()}`);
  for (const c of s.planConfluence) narrative.push(c.trim());

  const suffix = narrative.join(" · ");
  if (!base && !suffix) return "";
  return [base, suffix].filter(Boolean).join(" · ");
}

function composeTradePlan(s: FormState): string {
  const out: string[] = [];
  const block = (title: string, rows: [string, string][]) => {
    const present = rows.filter(([, v]) => v.trim() !== "");
    if (present.length === 0) return;
    out.push(title);
    for (const [k, v] of present) out.push(`${k} - ${v.trim()}`);
    out.push("");
  };
  block("DAILY NARRATIVE", [
    ["H4", s.planDailyHt],
    ["H1", s.planDailyLt],
    ["CISD", s.planDailyCisd],
  ]);
  block("H4 NARRATIVE", [
    ["H1", s.planH4Ht],
    ["M30/M15", s.planH4Lt],
    ["CISD", s.planH4Cisd],
  ]);
  block("H1 NARRATIVE", [
    ["M30", s.planH1Ht],
    ["M15", s.planH1Lt],
    ["CISD", s.planH1Cisd],
  ]);
  if (s.planConfluence.length > 0) {
    out.push("LTF CONFLUENCE");
    out.push(s.planConfluence.join(" "));
    out.push("");
  }
  return out.join("\n").trim();
}

function NarrativeBlock({
  title,
  closureLabel,
  continuationLabel,
  closure,
  continuation,
  cisd,
  onClosure,
  onContinuation,
  onCisd,
}: {
  title: string;
  closureLabel: string;
  continuationLabel: string;
  closure: string;
  continuation: string;
  cisd: string;
  onClosure: (v: string) => void;
  onContinuation: (v: string) => void;
  onCisd: (v: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <SuggestInput
          label={closureLabel}
          value={closure}
          onChange={onClosure}
          options={ICT_CLOSURE_CANDLES}
          placeholder="Closure candle"
        />
        <SuggestInput
          label={continuationLabel}
          value={continuation}
          onChange={onContinuation}
          options={ICT_INTERNAL_CONTINUATIONS}
          placeholder="Internal support continuation"
        />
        <SuggestInput
          label="CISD"
          value={cisd}
          onChange={onCisd}
          options={CISD_TIMEFRAMES}
          placeholder="M5/M3"
        />
      </div>
    </div>
  );
}

function DirectionButton({
  active,
  onClick,
  icon,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "buy" | "sell";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors",
        tone === "buy" &&
          (active
            ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-500"
            : "border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500"),
        tone === "sell" &&
          (active
            ? "border-rose-500/60 bg-rose-500/15 text-rose-500"
            : "border-border text-muted-foreground hover:border-rose-500/40 hover:text-rose-500"),
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(suffix && "pr-7")}
          required={required}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SuggestInput({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const listId = React.useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={listId}>{label}</Label>
      <Input
        id={listId}
        list={`${listId}-list`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
      />
      <datalist id={`${listId}-list`}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}

function ScreenshotField({
  label,
  hint,
  preview,
  existing,
  onFile,
  onRemoveExisting,
  onRemoveNew,
}: {
  label: string;
  hint: string;
  preview: string | null;
  existing: { id: string; url: string } | null;
  onFile: (f: File) => void;
  onRemoveExisting: () => void;
  onRemoveNew: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const shown = preview ?? existing?.url ?? null;

  return (
    <div className="grid gap-1.5">
      <Label className="flex items-center justify-between">
        {label}
        <span className="text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {shown ? (
        <div className="group relative overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shown}
            alt={label}
            className="aspect-video w-full object-cover"
          />
          <button
            type="button"
            onClick={() => {
              if (preview) onRemoveNew();
              else if (existing) onRemoveExisting();
            }}
            className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Remove screenshot"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <ImagePlus className="size-5" />
          <span className="text-xs">Upload screenshot</span>
        </button>
      )}
    </div>
  );
}
