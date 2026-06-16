'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SymbolSearchProps {
  value: string;
  onChange: (symbol: string) => void;
  id?: string;
}

export function SymbolSearch({ value, onChange, id }: SymbolSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const symbols = await api.get<string[]>(
        `/binance/symbols${q ? `?q=${encodeURIComponent(q)}` : ''}`,
      );
      setOptions(symbols);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) void search(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pick = (symbol: string) => {
    onChange(symbol);
    setQuery(symbol);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          className="pl-9"
          value={query}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setQuery(v);
            onChange(v);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            void search(query);
          }}
          placeholder={t('alerts.symbolPlaceholder')}
          autoComplete="off"
          required
        />
      </div>
      {open && (
        <ul
          className={cn(
            'absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md',
          )}
        >
          {loading && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {t('common.loading')}
            </li>
          )}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {t('alerts.symbolNoResults')}
            </li>
          )}
          {options.map((s) => (
            <li key={s}>
              <button
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-accent',
                  s === value && 'bg-primary/10 text-primary',
                )}
                onClick={() => pick(s)}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
