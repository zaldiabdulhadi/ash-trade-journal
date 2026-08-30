"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TradeShareCard, type TradeShareData } from "./trade-share-card";

interface TradeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TradeShareData;
}

export function TradeShareModal({ isOpen, onClose, data }: TradeShareModalProps) {
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const createImage = async () => {
    const node = nodeRef.current;
    if (!node) return null;
    const { toPng } = await import("html-to-image");
    return toPng(node, {
      width: 1080,
      height: 1350,
      pixelRatio: 1,
      cacheBust: true,
    });
  };

  const handleCopy = async () => {
    setExporting(true);
    try {
      const dataUrl = await createImage();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      toast.success("Trade copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy image. Use download instead.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const dataUrl = await createImage();
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.download = `trade-${data.symbol.toLowerCase()}-${data.date.toISOString().split("T")[0]}.png`;
      a.href = dataUrl;
      a.click();
      toast.success("Download started!");
    } catch {
      toast.error("Could not download image");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-[700px]">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border bg-background">
          <DialogTitle className="text-lg font-semibold">
            Share {data.symbol} Result
          </DialogTitle>
        </DialogHeader>

        {/* Export Actions */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Export your trading result
            </p>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={exporting}>
                {copied ? (
                  <>
                    <Check className="size-4 mr-2" />
                    Copied!
                  </>
                ) : exporting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Copy className="size-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="size-4 mr-2" />
                    Download PNG
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="px-6 py-4 overflow-hidden bg-slate-900">
          <div ref={nodeRef}>
            <TradeShareCard data={data} />
          </div>
        </div>

        {/* Info Footer */}
        <div className="px-6 py-4 text-xs text-muted-foreground border-t border-border bg-muted/20">
          📊 High-quality 1080×1350 PNG • Ready for Instagram, Twitter, or Telegram
        </div>
      </DialogContent>
    </Dialog>
  );
}
