import type { AccountType, AccountStatus } from "@prisma/client";

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "PROP_FIRM", label: "Prop Firm" },
  { value: "BROKER", label: "Broker" },
  { value: "PERSONAL", label: "Personal" },
  { value: "DEMO", label: "Demo" },
  { value: "CHALLENGE", label: "Challenge" },
  { value: "FUNDED", label: "Funded" },
];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = Object.fromEntries(
  ACCOUNT_TYPES.map((t) => [t.value, t.label])
) as Record<AccountType, string>;

export const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export const SESSIONS = [
  "Sydney",
  "Asia",
  "London",
  "New York",
  "Tokyo",
  "Sydney",
  "Overlap",
  "Session Open",
  "Late",
  "News",
  "Weekend",
];

export const TIMEFRAMES = [
  "1M",
  "5M",
  "15M",
  "30M",
  "1H",
  "2H",
  "4H",
  "1D",
  "1W",
];

export const STRATEGIES = [
  "Breakout",
  "Reversal",
  "Liquidity",
  "Trend Follow",
  "Range",
  "Support / Resistance",
  "Order Block",
  "FVG",
  "Sweep",
  "News",
  "Price Action",
];

export const SETUPS = [
  "Retest",
  "Pullback",
  "Sweep and Reverse",
  "Break and Retest",
  "Continuation",
  "Rejection",
  "Second Entry",
  "Morning Range",
];

export const MARKET_CONDITIONS = ["Trending", "Ranging", "Choppy", "Volatile", "Slow"];

export const EMOTIONS = [
  "Calm",
  "Confident",
  "Patient",
  "Focused",
  "Disciplined",
  "Anxious",
  "FOMO",
  "Greed",
  "Fear",
  "Revenge",
  "Overconfidence",
  "Impatient",
];

export const MISTAKES = [
  "None",
  "Oversized position",
  "Entered early",
  "Entered late",
  "Moved stop loss",
  "Cut winner early",
  "Didn't cut loser",
  "No stop loss",
  "Chased price",
  "Overtraded",
  "Ignored plan",
  "Revenge trade",
];

export const DIRECTIONS = ["LONG", "SHORT"] as const;

export const ICT_CLOSURE_CANDLES = [
  "PDH/PDL",
  "PWH/PWL",
  "EQH/EQL",
  "Old High/Low Run",
  "Liquidity Sweep",
  "Stop Hunt",
  "Breaker Close",
  "Body Close Beyond",
  "Session Open Sweep",
];

export const ICT_INTERNAL_CONTINUATIONS = [
  "Internal Support",
  "Internal Supply",
  "IBOS",
  "CHoCH",
  "BOS",
  "Breaker Block",
  "Order Block",
  "FVG",
  "OTE",
  "Shift in Market Structure",
];

export const CISD_TIMEFRAMES = [
  "M5",
  "M3",
];

export const LTF_CONFLUENCE_OPTIONS = [
  "SMT/SSMT",
  "IFVG",
  "PSP",
  "TPD",
  "Macro Time",
];

export const RESULT_OPTIONS = [
  { value: "WIN", label: "Win" },
  { value: "BREAKEVEN", label: "Breakeven" },
  { value: "LOSS", label: "Loss" },
];

export const RESULT_LABEL: Record<string, string> = {
  WIN: "Win",
  LOSS: "Loss",
  BREAKEVEN: "Breakeven",
};

export const RECAP_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export const RECAP_TEMPLATES = [
  { value: "clean", label: "Clean" },
] as const;

export const RECAP_FORMATS = [
  { value: "1440x1080", label: "4 × 3" },
  { value: "1080x1440", label: "3 × 4" },
] as const;

export const RECAP_HEADLINE_OPTIONS = [
  { value: "returnPct", label: "Return %" },
  { value: "totalR", label: "Total R" },
  { value: "totalPnl", label: "Net P&L" },
] as const;

export interface RecapFormat {
  width: number;
  height: number;
}

export function recapDimension(format: string): RecapFormat {
  const [w, h] = format.split("x").map(Number);
  return { width: w || 1080, height: h || 1350 };
}

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/journal", label: "Journal", icon: "book-open" },
  { href: "/analytics", label: "Analytics", icon: "chart-column" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/accounts", label: "Accounts", icon: "wallet" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;