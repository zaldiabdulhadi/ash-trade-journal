"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpenText,
  ChartColumn,
  CalendarDays,
  Wallet,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradeForm } from "@/components/journal/trade-form-context";

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpenText },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/accounts", label: "Accounts", icon: Wallet },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const { openCreate } = useTradeForm();

  return (
    <>
      {/* Floating Add Trade */}
      <button
        onClick={() => openCreate()}
        className="fixed bottom-[4.6rem] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:translate-y-px md:hidden"
        aria-label="Add Trade"
      >
        <Plus className="size-6" />
      </button>

      {/* Bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t bg-sidebar/95 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}