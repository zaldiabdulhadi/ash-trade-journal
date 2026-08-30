import type {
  AccountStatus,
  AccountType,
  Direction,
  ImageType,
  TradeResult,
} from "@prisma/client";

export interface AccountDTO {
  id: string;
  name: string;
  provider: string | null;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  status: AccountStatus;
  isDefault: boolean;
  createdAt: string;
  tradeCount: number;
}

export interface ImageDTO {
  id: string;
  url: string;
  type: ImageType;
}

export interface TradeDTO {
  id: string;
  accountId: string;
  symbol: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  riskAmount: number | null;
  riskPercent: number | null;
  rr: number | null;
  rMultiple: number | null;
  pnl: number | null;
  result: TradeResult;
  strategy: string | null;
  setup: string | null;
  session: string | null;
  timeframe: string | null;
  marketCondition: string | null;
  emotion: string | null;
  mistake: string | null;
  confidence: number | null;
  notes: string | null;
  tradePlan: string | null;
  openedAt: string;
  closedAt: string;
  createdAt: string;
  images: ImageDTO[];
}

export interface TradeImageRow {
  id: string;
  url: string;
  type: ImageType;
}

export { Direction, TradeResult, AccountType, AccountStatus, ImageType };