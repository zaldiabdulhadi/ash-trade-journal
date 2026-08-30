import { z } from "zod";

const toNum = (v: unknown): number | null => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const stringField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null ? undefined : v.trim() === "" ? undefined : v.trim()));

export const tradeFormSchema = z.object({
  accountId: z.string().min(1),
  symbol: z.string().trim().min(1).max(32),
  direction: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number().finite(),
  stopLoss: z.number().nullable().optional(),
  takeProfit: z.number().nullable().optional(),
  exitPrice: z.number().nullable().optional(),
  result: z.enum(["WIN", "LOSS", "BREAKEVEN"]),
  pnl: z.number().nullable().optional(),
  riskPercent: z.number().nullable().optional(),
  riskAmount: z.number().nullable().optional(),
  rr: z.number().nullable().optional(),
  rMultiple: z.number().nullable().optional(),
  strategy: stringField,
  setup: stringField,
  session: stringField,
  timeframe: stringField,
  marketCondition: stringField,
  emotion: stringField,
  mistake: stringField,
  confidence: z.number().nullable().optional(),
  notes: stringField,
  tradePlan: stringField,
  openedAt: z.union([z.coerce.date(), z.null()]).optional(),
  closedAt: z.union([z.coerce.date(), z.null()]).optional(),
});

export type TradeFormValues = z.infer<typeof tradeFormSchema>;

export function parseTradeFormData(formData: FormData) {
  const closedAt = toDateInput(formData.get("closedAt"), formData.get("closedTime"));
  const openedAt = toDateInput(formData.get("openedAt"), formData.get("openedTime"));

  const input = {
    accountId: String(formData.get("accountId") ?? ""),
    symbol: String(formData.get("symbol") ?? ""),
    direction: String(formData.get("direction") ?? "LONG") as "LONG" | "SHORT",
    entryPrice: toNum(formData.get("entryPrice")),
    stopLoss: toNum(formData.get("stopLoss")),
    takeProfit: toNum(formData.get("takeProfit")),
    exitPrice: toNum(formData.get("exitPrice")),
    result: String(formData.get("result") ?? "WIN") as "WIN" | "LOSS" | "BREAKEVEN",
    pnl: toNum(formData.get("pnl")),
    riskPercent: toNum(formData.get("riskPercent")),
    riskAmount: toNum(formData.get("riskAmount")),
    strategy: optionalString(formData.get("strategy")),
    setup: optionalString(formData.get("setup")),
    session: optionalString(formData.get("session")),
    timeframe: optionalString(formData.get("timeframe")),
    marketCondition: optionalString(formData.get("marketCondition")),
    emotion: optionalString(formData.get("emotion")),
    mistake: optionalString(formData.get("mistake")),
    confidence: toNum(formData.get("confidence")),
    notes: optionalString(formData.get("notes")),
    tradePlan: optionalString(formData.get("tradePlan")),
    openedAt,
    closedAt,
  };

  return tradeFormSchema.safeParse(input);
}

function optionalString(v: FormDataEntryValue | null): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function toDateInput(dateVal: FormDataEntryValue | null, timeVal: FormDataEntryValue | null): Date | null {
  const dateStr = dateVal == null ? "" : String(dateVal);
  if (!dateStr) return null;
  const timeStr = timeVal == null ? "" : String(timeVal);
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  if (timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    date.setHours(h ?? 12, m ?? 0, 0, 0);
  }
  return date;
}

export const accountFormSchema = z.object({
  name: z.string().trim().min(1).max(60),
  provider: stringField,
  type: z.enum(["PROP_FIRM", "BROKER", "PERSONAL", "DEMO", "CHALLENGE", "FUNDED"]),
  initialBalance: z.number().default(0),
  profitTargetPercent: z.number().nonnegative().nullable().default(null),
  currency: z.string().trim().min(1).max(8).default("USD"),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  isDefault: z.boolean().default(false),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

export function parseAccountFormData(formData: FormData) {
  const input = {
    name: String(formData.get("name") ?? ""),
    provider: optionalString(formData.get("provider")),
    type: String(formData.get("type") ?? "BROKER") as AccountFormValues["type"],
    initialBalance: toNum(formData.get("initialBalance")) ?? 0,
    profitTargetPercent: toNum(formData.get("profitTargetPercent")),
    currency: String(formData.get("currency") ?? "USD").toUpperCase(),
    status: String(formData.get("status") ?? "ACTIVE") as AccountFormValues["status"],
    isDefault: String(formData.get("isDefault")) === "true",
  };
  return accountFormSchema.safeParse(input);
}

export const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/png": ".png", // ✅ BEST: Supports transparent backgrounds (recommended for logos)
  "image/jpeg": ".jpg", // ⚠️ No transparency - fills with solid color
  "image/jpg": ".jpg", // ⚠️ No transparency
  "image/webp": ".webp", // 🟡 Partial transparency support
  "image/gif": ".gif", // 🟡 Limited transparency
};

export function imageExtension(mime: string | null): string | null {
  if (!mime) return null;
  const ext = ALLOWED_EXTENSIONS[mime];
  return ext ?? null;
}

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_LOGO_BYTES = 1.5 * 1024 * 1024;

// Note: For account logos, we strongly recommend PNG format with transparent backgrounds.
// Other formats (JPG/WebP/GIF) will fill transparent areas with solid colors or don't support alpha properly.