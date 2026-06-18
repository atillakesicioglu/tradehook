// String-literal mirrors of the Prisma enums so the API, worker and web app can
// share them without importing the generated Prisma client everywhere.

export const MarketType = {
  SPOT: 'SPOT',
} as const;
export type MarketType = (typeof MarketType)[keyof typeof MarketType];

export const OrderSide = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;
export type OrderSide = (typeof OrderSide)[keyof typeof OrderSide];

export const OrderType = {
  MARKET: 'MARKET',
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const RiskType = {
  FIXED_USDT: 'FIXED_USDT',
} as const;
export type RiskType = (typeof RiskType)[keyof typeof RiskType];

export const OrderStatus = {
  PENDING: 'PENDING',
  FILLED: 'FILLED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const WebhookStatus = {
  RECEIVED: 'RECEIVED',
  QUEUED: 'QUEUED',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  DUPLICATE: 'DUPLICATE',
  REJECTED: 'REJECTED',
} as const;
export type WebhookStatus = (typeof WebhookStatus)[keyof typeof WebhookStatus];

export const Plan = {
  STARTER: 'STARTER',
  PRO: 'PRO',
  ELITE: 'ELITE',
} as const;
export type Plan = (typeof Plan)[keyof typeof Plan];

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  TRIAL: 'TRIAL',
} as const;
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const BinanceExchange = {
  GLOBAL: 'GLOBAL',
  TR: 'TR',
} as const;
export type BinanceExchange =
  (typeof BinanceExchange)[keyof typeof BinanceExchange];
