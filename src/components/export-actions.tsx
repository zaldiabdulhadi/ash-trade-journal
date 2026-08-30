"use client";

import { Download, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as React from "react";

interface ExportActionsProps {
  onCopy: () => Promise<void>;
  onDownload: () => Promise<void>;
  exportedData?: any;
}

export function ExportActions({ onCopy, onDownload, exportedData }: ExportActionsProps) {
  const [copied, setCopied] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const handleCopyClick = async () => {
    setExporting(true);
    await onCopy();
    setCopied(true);
    toast.success("Trade copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
    setExporting(false);
  };

  const handleDownloadClick = async () => {
    setExporting(true);
    await onDownload();
    setExporting(false);
  };

  return (
    <div className="flex justify-end gap-3">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleCopyClick} 
        disabled={exporting}
      >
        {copied ? (
          <>
            ✓ Copied!
          </>
        ) : exporting ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Share2 className="size-4 mr-2" />
            Copy
          </>
        )}
      </Button>
      
      <Button 
        size="sm" 
        onClick={handleDownloadClick}
        disabled={exporting}
      >
        {exporting ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
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
  );
}
