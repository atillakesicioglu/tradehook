'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, formatPrice } from '@/lib/utils';

interface LivePriceProps {
  value: number | null | undefined;
  locale?: 'en' | 'tr';
  prefix?: string;
  className?: string;
}

/** Fiyat artınca yeşil, azalınca kırmızı kısa flaş gösterir. */
export function LivePrice({
  value,
  locale,
  prefix = '$',
  className,
}: LivePriceProps) {
  const prev = useRef<number | null>(null);
  const [flashDir, setFlashDir] = useState<'up' | 'down' | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return;

    if (
      prev.current !== null &&
      Math.abs(prev.current - value) > 1e-10
    ) {
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

  return (
    <span
      key={flashKey}
      className={cn(
        'inline-block rounded px-1.5 py-0.5 tabular-nums',
        flashDir === 'up' && 'animate-price-flash-up',
        flashDir === 'down' && 'animate-price-flash-down',
        className,
      )}
    >
      {prefix}
      {formatPrice(value, locale)}
    </span>
  );
}
