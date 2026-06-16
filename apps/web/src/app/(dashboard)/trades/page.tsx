'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { useSocket } from '@/hooks/use-socket';
import { formatDate, formatNumber, formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';

interface Trade {
  id: string;
  createdAt: string;
  symbol: string;
  side: string;
  type: string;
  quantity: number | null;
  price: number | null;
  quoteQuantity: number | null;
  balanceBeforeUsdt: number | null;
  balanceAfterUsdt: number | null;
  trigger: string;
  status: string;
  binanceOrderId: string | null;
  isMock: boolean;
  alertName: string | null;
  errorMessage: string | null;
}

const EVENTS = ['trade:executed', 'order:updated', 'position:closed'];

function triggerLabel(trigger: string, t: (k: string) => string): string {
  if (trigger === 'STOP_LOSS') return t('sltp.closedSl');
  if (trigger === 'TAKE_PROFIT') return t('sltp.closedTp');
  return t('trades.triggerWebhook');
}

export default function TradesPage() {
  const { t, locale } = useI18n();
  const [trades, setTrades] = useState<Trade[]>([]);

  const load = useCallback(async () => {
    setTrades(await api.get<Trade[]>('/orders'));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useSocket(EVENTS, () => void load());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('trades.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('trades.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('trades.history')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard.colDate')}</TableHead>
                <TableHead>{t('dashboard.colSymbol')}</TableHead>
                <TableHead>{t('dashboard.colSide')}</TableHead>
                <TableHead>{t('trades.colTrigger')}</TableHead>
                <TableHead>{t('trades.colAmount')}</TableHead>
                <TableHead>{t('trades.colBalanceBefore')}</TableHead>
                <TableHead>{t('trades.colBalanceAfter')}</TableHead>
                <TableHead>{t('dashboard.colQty')}</TableHead>
                <TableHead>{t('dashboard.colPrice')}</TableHead>
                <TableHead>{t('dashboard.colStatus')}</TableHead>
                <TableHead>{t('dashboard.colAlert')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.length ? (
                trades.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(tr.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{tr.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={tr.side === 'BUY' ? 'success' : 'destructive'}>
                        {tr.side === 'BUY' ? t('alerts.buy') : t('alerts.sell')}
                      </Badge>
                      {tr.isMock && (
                        <Badge variant="outline" className="ml-1">
                          {t('trades.mock')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {triggerLabel(tr.trigger ?? 'WEBHOOK', t)}
                    </TableCell>
                    <TableCell>
                      {tr.quoteQuantity != null
                        ? `$${formatPrice(tr.quoteQuantity, locale)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tr.balanceBeforeUsdt != null
                        ? `$${formatPrice(tr.balanceBeforeUsdt, locale)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {tr.balanceAfterUsdt != null
                        ? `$${formatPrice(tr.balanceAfterUsdt, locale)}`
                        : '—'}
                    </TableCell>
                    <TableCell>{formatNumber(tr.quantity, 6, locale)}</TableCell>
                    <TableCell>{formatPrice(tr.price, locale)}</TableCell>
                    <TableCell>
                      <StatusBadge status={tr.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tr.alertName ?? '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    {t('trades.none')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
