"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpenText,
  ChartColumn,
  CalendarDays,
  Wallet,
  Settings,
  CandlestickChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/components/brand-provider";

const ICONS = {
  "layout-dashboard": LayoutDashboard,
  "book-open": BookOpenText,
  "chart-column": ChartColumn,
  calendar: CalendarDays,
  wallet: Wallet,
  settings: Settings,
} as const;

const NAV = [
  { href: "/", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/journal", label: "Journal", icon: "book-open" },
  { href: "/analytics", label: "Analytics", icon: "chart-column" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/accounts", label: "Accounts", icon: "wallet" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary/[0.09] text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(79,127,255,0.6)]" />
            )}
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TradeMark({ compact }: { compact?: boolean }) {
  const { brandName, brandTagline } = useBrand();
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_4px_14px_-4px_rgba(79,127,255,0.6)]">
        <CandlestickChart className="size-[18px]" />
      </div>
      <div className={cn("leading-tight", compact && "hidden sm:block")}>
        <div className="text-sm font-semibold tracking-tight">{brandName}</div>
        <div className="text-[10px] text-muted-foreground">{brandTagline}</div>
      </div>
    </div>
  );
}