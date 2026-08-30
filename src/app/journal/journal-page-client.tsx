"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";

import { JournalToolbar, type JournalFilterState } from "@/components/journal/journal-toolbar";
import { TradeTable, type JournalRow } from "@/components/journal/trade-table";
import { AddTradeButton } from "@/components/journal/add-trade-button";
import { BatchActionbar } from "@/components/journal/batch-actionbar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/card-shell";

export default function JournalPageClient({
  initialRows,
  accounts,
  symbols,
  filters,
  accountScope,
}: {
  initialRows: JournalRow[];
  accounts: any[];
  symbols: string[];
  filters: JournalFilterState;
  accountScope: string;
}) {
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  
  const totalRows = initialRows.length;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE) || 1;
  const paginatedRows = initialRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  
  // Check if all rows on current page are selected
  const allSelected = paginatedRows.length > 0 && paginatedRows.every(row => selectedIds.has(row.id));
  const someSelected = paginatedRows.some(row => selectedIds.has(row.id));
  
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        paginatedRows.forEach(row => newSet.add(row.id));
      } else {
        paginatedRows.forEach(row => newSet.delete(row.id));
      }
      return newSet;
    });
  };
  
  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };
  
  const handleResetSelected = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected trade(s)? This cannot be undone.`)) {
      return;
    }
    
    // TODO: Call API to delete multiple trades
    console.log("Deleting trades:", Array.from(selectedIds));
    setSelectedIds(new Set());
    setCurrentPage(1);
  };
  
  const handleResetAll = async () => {
    if (!confirm(`Delete ALL ${totalRows} trades? This cannot be undone.`)) {
      return;
    }
    
    // TODO: Call API to delete all trades
    console.log("Deleting all trades");
    setSelectedIds(new Set());
    setCurrentPage(1);
  };

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Journal" description="No trading accounts yet" />
        <EmptyState
          icon={<BookOpen className="size-6" />}
          title="No trading accounts yet"
          description="Create an account to start journaling your trades."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Journal"
        description={`${totalRows} trade${totalRows === 1 ? "" : "s"}`}
      >
        <AddTradeButton accountId={accountScope === "all" ? undefined : accountScope} />
      </PageHeader>
      
      <JournalToolbar symbols={symbols} filters={filters} />
      
      {paginatedRows.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-6" />}
          title="No trades found"
          description="Try adjusting your filters or add a new trade to get started."
        />
      ) : (
        <>
          {/* Batch Actions Bar */}
          <BatchActionbar
            selectedCount={selectedIds.size}
            totalOnPage={paginatedRows.length}
            onSelectAll={handleSelectAll}
            onResetSelected={handleResetSelected}
            onResetAll={handleResetAll}
            allSelected={allSelected}
            someSelected={someSelected}
          />
          
          <TradeTable 
            rows={paginatedRows} 
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
          />
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalRows)} of {totalRows} trades
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      currentPage === page 
                        ? 'bg-primary text-primary-foreground' 
                        : 'border hover:bg-accent'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
