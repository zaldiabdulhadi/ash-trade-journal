"use server";

import { existsSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseAccountFormData } from "@/lib/validation";
import { syncAccountBalance } from "./trades";
import type { ActionResult } from "./types";

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const parsed = parseAccountFormData(formData);
  if (!parsed.success) return { ok: false, error: "Invalid account data" };
  const data = parsed.data;

  try {
    const existingDefault = data.isDefault
      ? await db.tradingAccount.findFirst({
          where: { isDefault: true, status: "ACTIVE" },
        })
      : null;

    const account = await db.tradingAccount.create({
      data: {
        name: data.name,
        provider: data.provider ?? null,
        type: data.type,
        initialBalance: data.initialBalance,
        currentBalance: data.initialBalance,
        currency: data.currency,
        status: data.status,
        isDefault: data.isDefault,
      },
    });

    if (data.isDefault && existingDefault && existingDefault.id !== account.id) {
      await db.tradingAccount.update({
        where: { id: existingDefault.id },
        data: { isDefault: false },
      });
    }

    revalidatePath("/");
    revalidatePath("/accounts");
    return { ok: true, id: account.id };
  } catch (err) {
    console.error("createAccount", err);
    return { ok: false, error: "Could not create account." };
  }
}

export async function updateAccount(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing account id" };

  const parsed = parseAccountFormData(formData);
  if (!parsed.success) return { ok: false, error: "Invalid account data" };
  const data = parsed.data;

  try {
    const existing = await db.tradingAccount.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Account not found" };

    const account = await db.tradingAccount.update({
      where: { id },
      data: {
        name: data.name,
        provider: data.provider ?? null,
        type: data.type,
        initialBalance: data.initialBalance,
        currency: data.currency,
        status: data.status,
      },
    });

    if (data.isDefault) {
      await db.tradingAccount.updateMany({
        where: { isDefault: true, id: { not: id }, status: "ACTIVE" },
        data: { isDefault: false },
      });
      await db.tradingAccount.update({ where: { id }, data: { isDefault: true } });
    }

    await syncAccountBalance(id);

    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/journal");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    return { ok: true, id: account.id };
  } catch (err) {
    console.error("updateAccount", err);
    return { ok: false, error: "Could not update account." };
  }
}

export async function setDefaultAccount(id: string): Promise<ActionResult> {
  try {
    await db.$transaction([
      db.tradingAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      db.tradingAccount.update({ where: { id }, data: { isDefault: true } }),
    ]);
    revalidatePath("/");
    revalidatePath("/accounts");
    return { ok: true };
  } catch (err) {
    console.error("setDefaultAccount", err);
    return { ok: false, error: "Could not set default account." };
  }
}

export async function setAccountStatus(
  id: string,
  status: "ACTIVE" | "ARCHIVED"
): Promise<ActionResult> {
  try {
    await db.tradingAccount.update({ where: { id }, data: { status } });
    revalidatePath("/");
    revalidatePath("/accounts");
    return { ok: true };
  } catch (err) {
    console.error("setAccountStatus", err);
    return { ok: false, error: "Could not update account status." };
  }
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  try {
    const account = await db.tradingAccount.findUnique({
      where: { id },
      include: { trades: { include: { images: true } } },
    });
    if (!account) return { ok: false, error: "Account not found" };

    for (const trade of account.trades) {
      for (const img of trade.images) {
        if (img.url.startsWith("/uploads/")) {
          const p = path.join(process.cwd(), "public", img.url.replace(/^\//, ""));
          try {
            if (existsSync(p)) unlinkSync(p);
          } catch {}
        }
      }
    }

    await db.tradeImage.deleteMany({
      where: { tradeId: { in: account.trades.map((t) => t.id) } },
    });
    await db.trade.deleteMany({ where: { accountId: id } });
    await db.sharedRecap.deleteMany({ where: { accountId: id } });
    await db.tradingAccount.delete({ where: { id } });

    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/journal");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    return { ok: true };
  } catch (err) {
    console.error("deleteAccount", err);
    return { ok: false, error: "Could not delete account." };
  }
}

export async function resetAllData(): Promise<ActionResult> {
  try {
    await db.tradeImage.deleteMany({});
    await db.trade.deleteMany({});
    await db.sharedRecap.deleteMany({});
    await db.tradingAccount.deleteMany({});

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    try {
      for (const f of readdirSync(uploadsDir)) {
        if (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".webp") || f.endsWith(".gif")) {
          try {
            if (existsSync(path.join(uploadsDir, f))) unlinkSync(path.join(uploadsDir, f));
          } catch {}
        }
      }
    } catch {}

    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/journal");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    revalidatePath("/settings");
    revalidatePath("/recap");
    return { ok: true };
  } catch (err) {
    console.error("resetAllData", err);
    return { ok: false, error: "Could not reset data." };
  }
}