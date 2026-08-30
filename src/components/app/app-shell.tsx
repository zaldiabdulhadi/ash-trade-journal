"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountSelector } from "@/components/app/account-selector";
import { NavLinks, TradeMark } from "@/components/app/nav-links";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { MobileNav } from "@/components/app/mobile-nav";
import { AddTradeButton } from "@/components/journal/add-trade-button";
import type { AccountDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AppShell({
  accounts,
  children,
}: {
  accounts: AccountDTO[];
  children: React.ReactNode;
}) {
  // Track if component has mounted on client
  const [isMounted, setIsMounted] = React.useState(false);

  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved !== null) {
        setCollapsed(JSON.parse(saved));
      }
    }
  }, []);

  // Save collapsed state to localStorage
  React.useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
    }
  }, [collapsed, isMounted]);

  // Only render sidebar controls after hydration
  if (!isMounted) {
    return (
      <div className="min-h-full">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 z-40 w-56 flex-col border-r bg-sidebar px-3 py-4">
          <TradeMark />
          <div className="mt-6">
            <NavLinks />
          </div>
          <div className="mt-auto">
            <AddTradeButton className="w-full" />
          </div>
        </aside>

        {/* Main column */}
        <div className="lg:pl-56">
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/70">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
              <div className="lg:hidden">
                <TradeMark />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <React.Suspense fallback={<AccountSelectorSkeleton />}>
                  <AccountSelector accounts={accounts} />
                </React.Suspense>
                <ThemeToggle />
                <span className="hidden lg:inline-flex">
                  <AddTradeButton />
                </span>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[calc(100vw-14rem)] px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Desktop sidebar - only render when expanded */}
      {!collapsed && (
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-56 flex-col border-r bg-sidebar px-3 py-4 overflow-hidden">
          <TradeMark />
          <div className="mt-6">
            <NavLinks />
          </div>
          <div className="mt-auto">
            <AddTradeButton className="w-full" />
          </div>
        </aside>
      )}

      {/* Main column wrapper - add left padding when sidebar is shown */}
      <div
        className={cn(
          "transition-all duration-75 ease-in-out",
          collapsed ? "" : "lg:pl-56"
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/70">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden items-center justify-center rounded-lg border border-border/60 bg-secondary/50 p-1.5 text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground lg:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </button>
            <div className="lg:hidden">
              <TradeMark />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <React.Suspense fallback={<AccountSelectorSkeleton />}>
                <AccountSelector accounts={accounts} />
              </React.Suspense>
              <ThemeToggle />
              <span className="hidden lg:inline-flex">
                <AddTradeButton />
              </span>
            </div>
          </div>
        </header>

        <main
          className={cn(
            "mx-auto px-4 pb-28 pt-6 sm:px-6 lg:pb-10",
            collapsed ? "max-w-full" : "max-w-[calc(100vw-14rem)]"
          )}
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

function AccountSelectorSkeleton() {
  return (
    <div className="flex h-8 w-40 items-center gap-2 rounded-lg border border-border px-2.5">
      <Skeleton className="size-4 rounded-full" />
      <Skeleton className="h-3.5 flex-1" />
    </div>
  );
}