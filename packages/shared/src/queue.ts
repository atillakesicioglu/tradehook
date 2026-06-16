// Shared contracts between the API (producer) and the worker (consumer).

export const ORDER_QUEUE_NAME = 'execute-order';
export const EXECUTE_ORDER_JOB = 'execute-order';

export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  maxRetriesPerRequest: null;
}

/**
 * Parses a redis:// URL into a plain options object for BullMQ. Passing options
 * (rather than an ioredis instance) avoids cross-version type clashes between
 * our ioredis and the one bundled with BullMQ.
 */
export function parseRedisConnection(
  url: string,
): RedisConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: parsed.pathname && parsed.pathname.length > 1
      ? Number(parsed.pathname.slice(1))
      : undefined,
    maxRetriesPerRequest: null,
  };
}

export type OrderTrigger = 'WEBHOOK' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'MANUAL';

export interface ExecuteOrderJob {
  webhookLogId?: string;
  alertId: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  /** USDT spend on BUY (webhook). */
  riskValue?: number;
  /** Base-asset amount on SELL (SL/TP). */
  quantity?: number;
  positionId?: string;
  trigger?: OrderTrigger;
}

export const PRICE_MONITOR_QUEUE = 'price-monitor';
export const PRICE_MONITOR_JOB = 'tick';

// Redis pub/sub channel the worker publishes realtime events on and the API
// gateway subscribes to.
export const REALTIME_CHANNEL = 'tradehook:realtime';

export type RealtimeEventType =
  | 'order:created'
  | 'order:updated'
  | 'trade:executed'
  | 'position:updated'
  | 'position:closed';

export interface RealtimeEvent {
  type: RealtimeEventType;
  userId: string;
  payload: unknown;
}
