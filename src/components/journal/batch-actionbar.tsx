"use client";

import * as React from "react";
import { Trash2, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BatchActionbar({
  selectedCount,
  totalOnPage,
  onSelectAll,
  onResetSelected,
  onResetAll,
  allSelected,
  someSelected,
}: {
  selectedCount: number;
  totalOnPage: number;
  onSelectAll: (checked: boolean) => void;
  onResetSelected: () => void;
  onResetAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelectAll(!allSelected)}
          className="rounded-md border p-1.5 hover:bg-accent"
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
        
        {selectedCount > 0 && (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedCount} of {totalOnPage} selected
            </span>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={onResetSelected}
            >
              <Trash2 className="mr-1 size-3.5" />
              Delete Selected ({selectedCount})
            </Button>
          </>
        )}
        
        {totalOnPage > 0 && selectedCount === 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onResetAll}
          >
            <Trash2 className="mr-1 size-3.5" />
            Delete All ({totalOnPage})
          </Button>
        )}
      </div>
      
      <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <span>Tip:</span>
        <span>Use checkbox to select trades for batch deletion</span>
      </div>
    </div>
  );
}
