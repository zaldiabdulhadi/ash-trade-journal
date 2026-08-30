"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTradeForm } from "@/components/journal/trade-form-context";
import { deleteTrade } from "@/app/actions/trades";
import type { TradeDTO } from "@/lib/types";

interface TradeDetailActionsProps {
  trade: TradeDTO;
  onShare?: () => void;
}

export function TradeDetailActions({ trade, onShare }: TradeDetailActionsProps) {
  const { openEdit } = useTradeForm();
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${trade.symbol} trade? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await deleteTrade(trade.id);
    if (res.ok) {
      toast.success("Trade deleted");
      router.replace("/journal");
      router.refresh();
    } else {
      setDeleting(false);
      toast.error(res.error ?? "Could not delete trade");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {onShare && (
        <Button size="sm" onClick={onShare} className="min-w-[120px]">
          <Share2 className="size-4 mr-2" />
          Share Result
        </Button>
      )}
      <Button 
        size="sm" 
        onClick={() => openEdit(trade)}
        className="min-w-[80px]"
      >
        <Pencil className="size-4 mr-2" />
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className="min-w-[80px]"
      >
        {deleting ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="size-4 mr-2" />
            Delete
          </>
        )}
      </Button>
    </div>
  );
}