import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PRICE_DECIMALS = 3;

function numberLocale(locale?: 'en' | 'tr') {
  return locale === 'tr' ? 'tr-TR' : 'en-US';
}

export function formatNumber(
  value: number | null | undefined,
  digits = 2,
  locale?: 'en' | 'tr',
) {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toLocaleString(numberLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

/** Token / fiyat gösterimi — her zaman 3 ondalık basamak. */
export function formatPrice(
  value: number | null | undefined,
  locale?: 'en' | 'tr',
) {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toLocaleString(numberLocale(locale), {
    minimumFractionDigits: PRICE_DECIMALS,
    maximumFractionDigits: PRICE_DECIMALS,
  });
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

/** INJUSDT → INJ */
export function baseAssetFromSymbol(symbol: string) {
  if (symbol.endsWith('USDT')) return symbol.slice(0, -4);
  if (symbol.endsWith('BUSD')) return symbol.slice(0, -4);
  return symbol;
}
