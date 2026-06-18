import { z } from 'zod';
import { MarketType, BinanceExchange, OrderSide, OrderType, RiskType } from './enums';

const symbolRegex = /^[A-Z0-9]{5,20}$/;

export const CreateAlertSchema = z.object({
  name: z.string().min(1).max(80),
  symbol: z
    .string()
    .transform((s) => s.toUpperCase())
    .refine((s) => symbolRegex.test(s), {
      message: 'Symbol must look like BTCUSDT',
    }),
  marketType: z.nativeEnum(MarketType).default(MarketType.SPOT),
  side: z.nativeEnum(OrderSide),
  orderType: z.nativeEnum(OrderType).default(OrderType.MARKET),
  riskType: z.nativeEnum(RiskType).default(RiskType.FIXED_USDT),
  riskValue: z.number().positive().max(1_000_000),
  isActive: z.boolean().default(true),
});
export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;

export const UpdateAlertSchema = CreateAlertSchema.partial();
export type UpdateAlertInput = z.infer<typeof UpdateAlertSchema>;

export const BinanceCredentialsSchema = z.object({
  apiKey: z.string().min(10).max(256),
  secretKey: z.string().min(10).max(256),
  accountType: z.nativeEnum(MarketType).default(MarketType.SPOT),
  exchange: z.nativeEnum(BinanceExchange).default(BinanceExchange.GLOBAL),
  useTestnet: z.boolean().default(true),
});
export type BinanceCredentialsInput = z.infer<typeof BinanceCredentialsSchema>;

// Payload TradingView sends to POST /webhooks/tradingview/:token
export const TradingViewWebhookSchema = z.object({
  secret: z.string().min(1),
  signalId: z.string().optional(),
  symbol: z.string().min(1),
  side: z.nativeEnum(OrderSide),
  price: z.union([z.string(), z.number()]).optional(),
  time: z.union([z.string(), z.number()]).optional(),
  strategy: z.string().optional(),
});
export type TradingViewWebhookPayload = z.infer<typeof TradingViewWebhookSchema>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(80).optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;
