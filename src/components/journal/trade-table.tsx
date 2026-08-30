"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, ArrowUpRight, ArrowDownRight, ExternalLink, Square, CheckSquare } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTradeForm } from "@/components/journal/trade-form-context";
import { deleteTrade } from "@/app/actions/trades";
import type { TradeDTO } from "@/lib/types";
import { formatDateShort, formatTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { RESULT_LABEL } from "@/lib/constants";

export interface JournalRow {
  id: string;
  ts: number;
  symbol: string;
  direction: "LONG" | "SHORT";
  type: string;
  session: string;
  result: string;
  pnl: number | null;
  r: number | null;
  rr: number | null;
  currency: string;
  strategy: string;
  accountName: string;
  trade: TradeDTO;
}

export function TradeTable({ 
  rows, 
  selectedIds = new Set(),
  onSelectRow,
}: { 
  rows: JournalRow[];
  selectedIds?: Set<string>;
  onSelectRow?: (id: string, checked: boolean) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const handleDelete = async (row: JournalRow) => {
    if (!confirm(`Delete ${row.symbol} trade for ${formatDateShort(new Date(row.ts))}? This cannot be undone.`)) {
      return;
    }
    setDeleting(row.id);
    const res = await deleteTrade(row.id);
    setDeleting(null);
    if (res.ok) {
      toast.success("Trade deleted");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not delete trade");
    }
  };

  // Check if all visible rows are selected
  const allSelected = rows.length > 0 && rows.every(row => selectedIds.has(row.id));
  const someSelected = rows.some(row => selectedIds.has(row.id));

  const handleSelectAll = (checked: boolean) => {
    rows.forEach(row => {
      onSelectRow?.(row.id, checked);
    });
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-14 text-center shadow-card">
        <p className="text-sm font-medium">No trades found</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Try adjusting your filters or add a new trade to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              {onSelectRow && (
                <th className="px-3 py-3 w-10">
                  <button
                    onClick={() => handleSelectAll(!allSelected)}
                    className="rounded-md border p-1 hover:bg-accent"
                    title={allSelected ? "Deselect all" : "Select all"}
                  >
                    {allSelected ? (
                      <CheckSquare className="size-4" />
                    ) : someSelected ? (
                      <Square className="size-4" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </th>
              )}
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Symbol</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Session</th>
              <th className="px-3 py-3 font-medium">Strategy</th>
              <th className="px-3 py-3 font-medium">Result</th>
              <th className="px-3 py-3 text-right font-medium">P&L</th>
              <th className="px-3 py-3 text-right font-medium">R</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => (
              <tr key={row.id} className="group transition-colors hover:bg-accent/40">
                {onSelectRow && (
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onCheckedChange={(checked) => onSelectRow(row.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <Link href={`/journal/${row.id}`} className="font-medium tabular-nums hover:underline">
                    {formatDateShort(new Date(row.ts))}
                  </Link>
                  <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                    {formatTime(new Date(row.ts))}
                  </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    {row.direction === "LONG" ? (
                      <ArrowUpRight className="size-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="size-3.5 shrink-0 text-rose-500" />
                    )}
                    <Link href={`/journal/${row.id}`} className="font-semibold hover:underline">
                      {row.symbol}
                    </Link>
                  </span>
                  <div className="text-xs text-muted-foreground">{row.accountName}</div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Badge variant="outline">{row.type || "—"}</Badge>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                  {row.session || "—"}
                </td>
                <td className="max-w-40 px-3 py-2.5 truncate text-muted-foreground">
                  {row.strategy || "—"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <ResultBadge result={row.result} />
                </td>
                <td className={cn("px-3 py-2.5 text-right font-medium tabular-nums", pnlClass(row.pnl))}>
                  {row.pnl == null ? "—" : formatPnlPlain(row.pnl, row.currency)}
                </td>
                <td className={cn("px-3 py-2.5 text-right font-medium tabular-nums", pnlClass(row.r ?? 0))}>
                  {row.r == null ? "—" : `${row.r >= 0 ? "+" : ""}${row.r.toFixed(1)}R`}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                    <RowActions
                      row={row}
                      deleting={deleting === row.id}
                      onDelete={() => handleDelete(row)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowActions({
  row,
  deleting,
  onDelete,
}: {
  row: JournalRow;
  deleting: boolean;
  onDelete: () => void;
}) {
  const { openEdit } = useTradeForm();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/journal/${row.id}`} />} variant="default">
          <ExternalLink /> View
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openEdit(row.trade)}
        >
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} disabled={deleting} variant="destructive">
          <Trash2 /> {deleting ? "Deleting…" : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ResultBadge({ result }: { result: string }) {
  const label = RESULT_LABEL[result] ?? result;
  if (result === "WIN")
    return <Badge variant="positive">{label}</Badge>;
  if (result === "LOSS")
    return <Badge variant="negative">{label}</Badge>;
  return <Badge variant="neutral">{label}</Badge>;
}

function pnlClass(v: number | null): string {
  if (v == null) return "";
  if (v > 0) return "text-emerald-500";
  if (v < 0) return "text-rose-500";
  return "";
}

function formatPnlPlain(v: number, currency: string): string {
  const sign = v > 0 ? "+" : "";
  const abs = Math.abs(v);
  const sym = currency === "USD" ? "$" : `${currency} `;
  return `${sign}${sym}${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}