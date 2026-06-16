'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, formatNumber, formatPrice } from '@/lib/utils';

interface LivePnlProps {
  value: number | null | undefined;
  percent?: number | null;
  locale?: 'en' | 'tr';
  className?: string;
}

/** Gerçekleşmemiş kâr/zarar — artışta yeşil, düşüşte kırmızı flaş. */
export function LivePnl({
  value,
  percent,
  locale,
  className,
}: LivePnlProps) {
  const prev = useRef<number | null>(null);
  const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return;

    if (prev.current !== null && Math.abs(prev.current - value) > 1e-10) {
      setFlashDir(value > prev.current ? 'up' : 'down');
      setFlashKey((k) => k + 1);
      const timer = setTimeout(() => setFlashDir(null), 1200);
      prev.current = value;
      return () => clearTimeout(timer);
    }

    prev.current = value;
  }, [value]);

  if (value == null || Number.isNaN(value)) {
    return <span className={className}>—</span>;
  }

  const sign = value >= 0 ? '+' : '−';
  const abs = Math.abs(value);
  const tone = value >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <span className={className}>
      <span
        key={flashKey}
        className={cn(
          'inline-block rounded px-1.5 py-0.5 tabular-nums font-medium',
          tone,
          flashDir === 'up' && 'animate-price-flash-up',
          flashDir === 'down' && 'animate-price-flash-down',
        )}
      >
        {sign}${formatPrice(abs, locale)}
      </span>
      {percent != null && !Number.isNaN(percent) && (
        <span className={cn('mt-0.5 block text-xs tabular-nums', tone)}>
          {percent >= 0 ? '+' : '−'}
          {formatNumber(Math.abs(percent), 2, locale)}%
        </span>
      )}
    </span>
  );
}
