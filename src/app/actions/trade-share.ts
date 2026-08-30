"use server";

import { db } from "@/lib/db";
import type { TradeWithRelations } from "@/lib/data";

export interface ShareTradeResult {
  ok: boolean;
  error?: string;
  recapId?: string;
}

export async function shareTradeResult(
  tradeId: string,
  accountId?: string
): Promise<ShareTradeResult> {
  try {
    // Get the trade details
    const trade = await db.trade.findUnique({
      where: { id: tradeId },
      include: {
        account: {
          select: {
            name: true,
            currency: true,
            provider: true,
          },
        },
      },
    });

    if (!trade) {
      return { 
        ok: false, 
        error: "Trade not found" 
      };
    }

    const now = new Date();
    
    // Create shared recap entry for this trade
    const sharedRecap = await db.sharedRecap.create({
      data: {
        accountId: accountId || null,
        periodType: "CUSTOM",
        startDate: trade.closedAt,
        endDate: trade.closedAt,
        template: "TRADE_RESULT",
        format: "1080x1350",
        createdAt: now,
      },
    });

    return { 
      ok: true, 
      recapId: sharedRecap.id 
    };
  } catch (error) {
    console.error("shareTradeResult error:", error);
    return { 
      ok: false, 
      error: "Could not share trade result" 
    };
  }
}

export async function getSharedTrade(id: string) {
  try {
    const sharedRecap = await db.sharedRecap.findUnique({
      where: { id },
      include: { account: true },
    });
    
    if (!sharedRecap) {
      return null;
    }

    // Find the trade matching this recap
    const trade = await db.trade.findFirst({
      where: {
        closedAt: sharedRecap.startDate,
      },
      include: {
        account: {
          select: {
            name: true,
            currency: true,
            provider: true,
          },
        },
      },
    });

    if (!trade) {
      return null;
    }

    return {
      recap: sharedRecap,
      trade,
    };
  } catch (error) {
    console.error("getSharedTrade error:", error);
    return null;
  }
}
