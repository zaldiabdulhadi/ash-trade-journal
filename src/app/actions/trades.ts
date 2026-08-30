"use server";

import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  calculateRR,
  calculateRMultiple,
  resolveRiskAmount,
} from "@/lib/calculations/metrics";
import { db } from "@/lib/db";
import {
  imageExtension,
  MAX_IMAGE_BYTES,
  parseTradeFormData,
} from "@/lib/validation";
import type { ActionResult } from "./types";

function uploadsDir(): string {
  const dir = path.join(process.cwd(), "public", "uploads");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function createTrade(formData: FormData): Promise<ActionResult> {
  const parsed = parseTradeFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: "Invalid trade data. Check the required fields." };
  }
  const data = parsed.data;

  const account = await db.tradingAccount.findUnique({
    where: { id: data.accountId },
  });
  if (!account) return { ok: false, error: "Account not found" };

  const riskAmount = resolveRiskAmount(
    data.riskAmount ?? null,
    data.riskPercent ?? null,
    account.currentBalance
  );
  const rr = calculateRR(data.entryPrice, data.stopLoss ?? null, data.takeProfit ?? null, data.direction);
  const rMultiple = calculateRMultiple(data.pnl ?? null, riskAmount);

  const closedAt = data.closedAt ?? new Date();
  const openedAt = data.openedAt ?? closedAt;

  try {
    const trade = await db.trade.create({
      data: {
        accountId: data.accountId,
        symbol: data.symbol.toUpperCase(),
        direction: data.direction,
        entryPrice: data.entryPrice,
        stopLoss: data.stopLoss ?? null,
        takeProfit: data.takeProfit ?? null,
        exitPrice: data.exitPrice ?? null,
        riskAmount,
        riskPercent: data.riskPercent ?? null,
        rr,
        rMultiple,
        pnl: data.pnl ?? null,
        result: data.result,
        strategy: data.strategy ?? null,
        setup: data.setup ?? null,
        session: data.session ?? null,
        timeframe: data.timeframe ?? null,
        marketCondition: data.marketCondition ?? null,
        emotion: data.emotion ?? null,
        mistake: data.mistake ?? null,
        confidence: data.confidence ?? null,
        notes: data.notes ?? null,
        tradePlan: data.tradePlan ?? null,
        openedAt,
        closedAt,
      },
    });

    await attachImages(trade.id, formData);

    await syncAccountBalance(account.id);
    revalidatePath("/");
    revalidatePath("/journal");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    revalidatePath("/accounts");
    return { ok: true, id: trade.id };
  } catch (err) {
    console.error("createTrade", err);
    return { ok: false, error: "Could not save trade. Please try again." };
  }
}

export async function updateTrade(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing trade id" };

  const existing = await db.trade.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Trade not found" };

  const parsed = parseTradeFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: "Invalid trade data. Check the required fields." };
  }
  const data = parsed.data;

  const account = await db.tradingAccount.findUnique({
    where: { id: data.accountId },
  });
  if (!account) return { ok: false, error: "Account not found" };

  const riskAmount = resolveRiskAmount(
    data.riskAmount ?? null,
    data.riskPercent ?? null,
    account.currentBalance
  );
  const rr = calculateRR(data.entryPrice, data.stopLoss ?? null, data.takeProfit ?? null, data.direction);
  const rMultiple = calculateRMultiple(data.pnl ?? null, riskAmount);

  const closedAt = data.closedAt ?? existing.closedAt;
  const openedAt = data.openedAt ?? existing.openedAt;

  try {
    const trade = await db.trade.update({
      where: { id },
      data: {
        accountId: data.accountId,
        symbol: data.symbol.toUpperCase(),
        direction: data.direction,
        entryPrice: data.entryPrice,
        stopLoss: data.stopLoss ?? null,
        takeProfit: data.takeProfit ?? null,
        exitPrice: data.exitPrice ?? null,
        riskAmount,
        riskPercent: data.riskPercent ?? null,
        rr,
        rMultiple,
        pnl: data.pnl ?? null,
        result: data.result,
        strategy: data.strategy ?? null,
        setup: data.setup ?? null,
        session: data.session ?? null,
        timeframe: data.timeframe ?? null,
        marketCondition: data.marketCondition ?? null,
        emotion: data.emotion ?? null,
        mistake: data.mistake ?? null,
        confidence: data.confidence ?? null,
        notes: data.notes ?? null,
        tradePlan: data.tradePlan ?? null,
        openedAt,
        closedAt,
      },
    });

    const removeIds = String(formData.get("removeImageIds") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (removeIds.length > 0) {
      const remove = await db.tradeImage.findMany({ where: { id: { in: removeIds } } });
      await db.tradeImage.deleteMany({ where: { id: { in: removeIds } } });
      for (const img of remove) {
        if (img.url.startsWith("/uploads/")) {
          const p = path.join(process.cwd(), "public", img.url.replace(/^\//, ""));
          try {
            if (existsSync(p)) unlinkSync(p);
          } catch {}
        }
      }
    }

    await attachImages(trade.id, formData);
    await syncAccountBalance(account.id);
    if (existing.accountId !== account.id) await syncAccountBalance(existing.accountId);

    revalidatePath("/");
    revalidatePath("/journal");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    revalidatePath("/accounts");
    return { ok: true, id: trade.id };
  } catch (err) {
    console.error("updateTrade", err);
    return { ok: false, error: "Could not update trade. Please try again." };
  }
}

async function attachImages(tradeId: string, formData: FormData): Promise<void> {
  const before = formData.get("beforeImage");
  const after = formData.get("afterImage");
  try {
    if (before instanceof File && before.size > 0) {
      const url = await saveImageFile(before);
      if (url) {
        await db.tradeImage.create({ data: { tradeId, url, type: "BEFORE" } });
      }
    }
    if (after instanceof File && after.size > 0) {
      const url = await saveImageFile(after);
      if (url) {
        await db.tradeImage.create({ data: { tradeId, url, type: "AFTER" } });
      }
    }
  } catch (err) {
    console.error("attachImages", err);
  }
}

async function saveImageFile(file: File): Promise<string | null> {
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return null;
  const ext = imageExtension(file.type);
  if (!ext) return null;
  const name = `${randomUUID()}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  writeFileSync(path.join(uploadsDir(), name), buf);
  return `/uploads/${name}`;
}

export async function deleteTrade(id: string): Promise<ActionResult> {
  try {
    const trade = await db.trade.findUnique({
      where: { id },
      include: { images: true, account: true },
    });
    if (!trade) return { ok: false, error: "Trade not found" };

    await db.tradeImage.deleteMany({ where: { tradeId: id } });
    for (const img of trade.images) {
      if (img.url.startsWith("/uploads/")) {
        const p = path.join(process.cwd(), "public", img.url.replace(/^\//, ""));
        try {
          if (existsSync(p)) unlinkSync(p);
        } catch {}
      }
    }

    await db.trade.delete({ where: { id } });
    await syncAccountBalance(trade.accountId);

    revalidatePath("/");
    revalidatePath("/journal");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    revalidatePath("/accounts");
    return { ok: true };
  } catch (err) {
    console.error("deleteTrade", err);
    return { ok: false, error: "Could not delete trade." };
  }
}

export async function deleteImage(id: string): Promise<ActionResult> {
  try {
    const img = await db.tradeImage.findUnique({ where: { id } });
    if (!img) return { ok: false, error: "Image not found" };
    if (img.url.startsWith("/uploads/")) {
      const p = path.join(process.cwd(), "public", img.url.replace(/^\//, ""));
      try {
        if (existsSync(p)) unlinkSync(p);
      } catch {}
    }
    await db.tradeImage.delete({ where: { id } });
    revalidatePath("/journal");
    return { ok: true };
  } catch (err) {
    console.error("deleteImage", err);
    return { ok: false, error: "Could not delete image." };
  }
}

export async function syncAccountBalance(accountId: string): Promise<void> {
  const account = await db.tradingAccount.findUnique({ where: { id: accountId } });
  if (!account) return;
  const agg = await db.trade.aggregate({
    where: { accountId },
    _sum: { pnl: true },
  });
  const balance = account.initialBalance + (agg._sum.pnl ?? 0);
  await db.tradingAccount.update({
    where: { id: accountId },
    data: { currentBalance: Math.round(balance * 100) / 100 },
  });
}