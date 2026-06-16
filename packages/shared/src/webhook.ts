import { randomUUID } from 'node:crypto';

/** TradingView sends these literally when placeholders are not resolved (manual test, simple alerts). */
export function isTradingViewPlaceholder(value: string): boolean {
  return /\{\{[^}]+\}\}/.test(value.trim());
}

export interface WebhookIdempotencyInput {
  signalId?: string;
  time?: string | number;
  symbol: string;
  side: string;
}

/**
 * Builds a dedupe key for webhook signals.
 * - Resolved strategy.order.id → stable per order (good for retries).
 * - Resolved timenow/time → unique per alert fire.
 * - Unresolved {{placeholders}} → unique per HTTP request (so tests work).
 */
export function buildWebhookIdempotencyKey(
  webhookToken: string,
  payload: WebhookIdempotencyInput,
): string {
  const signalId = payload.signalId?.trim();
  if (signalId && !isTradingViewPlaceholder(signalId)) {
    return `${webhookToken}:${signalId}`;
  }

  const time =
    payload.time != null ? String(payload.time).trim() : '';
  if (time && !isTradingViewPlaceholder(time)) {
    return `${webhookToken}:${time}:${payload.symbol}:${payload.side}`;
  }

  return `${webhookToken}:evt:${randomUUID()}`;
}
