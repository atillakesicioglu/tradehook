'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { useSocket } from '@/hooks/use-socket';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import {
  baseAssetFromSymbol,
  formatDate,
  formatNumber,
  formatPrice,
} from '@/lib/utils';
import { LivePrice } from '@/components/live-price';
import { LivePnl } from '@/components/live-pnl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MonitoredPosition {
  id: string;
  symbol: string;
  alertName: string | null;
  entryPrice: number;
  quantity: number;
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  currentPrice: number | null;
  unrealizedPnl: number | null;
  status: string;
  closeReason: string | null;
  closedAt: string | null;
  createdAt: string;
}

interface PositionUpdatePayload {
  id: string;
  currentPrice?: number;
  entryPrice?: number;
  stopLossPrice?: number | null;
  takeProfitPrice?: number | null;
  reason?: string;
}

function unrealizedPercent(
  entry: number,
  current: number | null,
): number | null {
  if (current == null || entry <= 0) return null;
  return ((current - entry) / entry) * 100;
}

export function MonitoredPositions() {
  const { t, locale } = useI18n();
  const [positions, setPositions] = useState<MonitoredPosition[]>([]);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPositions(await api.get<MonitoredPosition[]>('/positions/monitored'));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh(load, {
    intervalMs: 5_000,
    socketEvents: ['position:closed', 'trade:executed'],
  });

  useSocket(['position:updated'], (payload) => {
    const p = payload as PositionUpdatePayload;
    if (!p.id || p.currentPrice == null) return;
    setPositions((prev) =>
      prev.map((row) =>
        row.id === p.id
          ? {
              ...row,
              currentPrice: p.currentPrice ?? row.currentPrice,
              unrealizedPnl:
                p.currentPrice != null
                  ? (p.currentPrice - row.entryPrice) * row.quantity
                  : row.unrealizedPnl,
            }
          : row,
      ),
    );
  });

  const handleSell = async (positionId: string) => {
    setSellError(null);
    setSellingId(positionId);
    try {
      await api.post(`/positions/${positionId}/sell`);
      await load();
    } catch (err) {
      setSellError(
        err instanceof ApiError ? err.message : t('sltp.sellFailed'),
      );
    } finally {
      setSellingId(null);
    }
  };

  if (!positions.length) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('sltp.title')}</CardTitle>
        <span className="text-xs text-emerald-500/80">{t('positions.live')}</span>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {sellError && (
          <p className="mb-3 text-sm text-red-400">{sellError}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('dashboard.colSymbol')}</TableHead>
              <TableHead>{t('sltp.entry')}</TableHead>
              <TableHead>{t('sltp.quantity')}</TableHead>
              <TableHead>{t('sltp.stopLoss')}</TableHead>
              <TableHead>{t('sltp.takeProfit')}</TableHead>
              <TableHead>{t('sltp.current')}</TableHead>
              <TableHead>{t('sltp.pnl')}</TableHead>
              <TableHead>{t('dashboard.colStatus')}</TableHead>
              <TableHead>{t('dashboard.colAlert')}</TableHead>
              <TableHead className="text-right">{t('sltp.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((p) => {
              const asset = baseAssetFromSymbol(p.symbol);
              const pnl =
                p.status === 'OPEN' && p.currentPrice != null
                  ? (p.currentPrice - p.entryPrice) * p.quantity
                  : p.unrealizedPnl;
              const pnlPct =
                p.status === 'OPEN'
                  ? unrealizedPercent(p.entryPrice, p.currentPrice)
                  : null;

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.symbol}</TableCell>
                  <TableCell>${formatPrice(p.entryPrice, locale)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatNumber(p.quantity, 6, locale)}{' '}
                    <span className="text-muted-foreground">{asset}</span>
                  </TableCell>
                  <TableCell className="text-red-400">
                    {p.stopLossPrice != null
                      ? `$${formatPrice(p.stopLossPrice, locale)}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-emerald-400">
                    {p.takeProfitPrice != null
                      ? `$${formatPrice(p.takeProfitPrice, locale)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {p.status === 'OPEN' ? (
                      <LivePrice
                        value={p.currentPrice}
                        locale={locale}
                        className="font-medium text-primary"
                      />
                    ) : p.currentPrice != null ? (
                      `$${formatPrice(p.currentPrice, locale)}`
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {p.status === 'OPEN' ? (
                      <LivePnl
                        value={pnl}
                        percent={pnlPct}
                        locale={locale}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {p.status === 'OPEN' ? (
                      <Badge variant="success">{t('sltp.watching')}</Badge>
                    ) : p.closeReason === 'STOP_LOSS' ? (
                      <Badge variant="destructive">{t('sltp.closedSl')}</Badge>
                    ) : p.closeReason === 'TAKE_PROFIT' ? (
                      <Badge variant="success">{t('sltp.closedTp')}</Badge>
                    ) : p.closeReason === 'MANUAL' ? (
                      <Badge variant="secondary">{t('sltp.closedManual')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('sltp.closed')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.alertName ?? '—'}
                    {p.closedAt && (
                      <span className="block text-xs">
                        {formatDate(p.closedAt)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === 'OPEN' ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={sellingId === p.id}
                        onClick={() => void handleSell(p.id)}
                      >
                        {sellingId === p.id ? t('sltp.selling') : t('sltp.sell')}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
