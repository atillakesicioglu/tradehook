'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  CircleDollarSign,
  Coins,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { api, NetworkError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';
import { useSocket } from '@/hooks/use-socket';
import { formatNumber, formatPrice, formatDate } from '@/lib/utils';
import { LivePrice } from '@/components/live-price';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { MonitoredPositions } from '@/components/monitored-positions';

interface DashboardStats {
  totalBalance: number;
  availableUsdt: number;
  balanceConnected: boolean;
  heldAssets: number;
  activeAlerts: number;
  monthlyTradeCount: number;
  monthlyTradeLimit: number;
  todayTradeCount: number;
  botStatus: string;
  recentTrades: Array<{
    id: string;
    createdAt: string;
    symbol: string;
    side: string;
    type: string;
    quantity: number | null;
    price: number | null;
    status: string;
    alertName: string | null;
    balanceBeforeUsdt: number | null;
    balanceAfterUsdt: number | null;
  }>;
}

const REALTIME_EVENTS = ['trade:executed', 'order:updated'];

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<DashboardStats>('/dashboard/stats');
      setStats(data);
      setLoadError(null);
    } catch (err) {
      const message =
        err instanceof NetworkError
          ? t('common.apiUnreachable')
          : err instanceof Error
            ? err.message
            : t('common.apiUnreachable');
      setLoadError(message);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useSocket(REALTIME_EVENTS, () => {
    void load();
  });

  useLiveRefresh(load, {
    intervalMs: 10_000,
    socketEvents: [...REALTIME_EVENTS, 'position:updated'],
  });

  const cards = [
    {
      label: t('dashboard.totalBalance'),
      value: <LivePrice value={stats?.totalBalance ?? null} locale={locale} />,
      icon: Wallet,
      hint: stats?.balanceConnected
        ? `${t('dashboard.availableUsdt')}: $${formatPrice(stats?.availableUsdt, locale)}`
        : t('dashboard.balanceNotConnected'),
    },
    {
      label: t('dashboard.todayTrades'),
      value: formatNumber(stats?.todayTradeCount, 0),
      icon: TrendingUp,
    },
    {
      label: t('dashboard.heldAssets'),
      value: formatNumber(stats?.heldAssets, 0),
      icon: Coins,
    },
    {
      label: t('dashboard.activeAlerts'),
      value: formatNumber(stats?.activeAlerts, 0),
      icon: Bell,
    },
    {
      label: t('dashboard.monthlyTrades'),
      value: `${stats?.monthlyTradeCount ?? 0} / ${stats?.monthlyTradeLimit ?? 0}`,
      icon: CircleDollarSign,
    },
    {
      label: t('dashboard.botStatus'),
      value: stats?.botStatus ?? '-',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <span>{loadError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
              {c.hint && (
                <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <MonitoredPositions />

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentTrades')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard.colDate')}</TableHead>
                <TableHead>{t('dashboard.colSymbol')}</TableHead>
                <TableHead>{t('dashboard.colSide')}</TableHead>
                <TableHead>{t('trades.colBalanceBefore')}</TableHead>
                <TableHead>{t('trades.colBalanceAfter')}</TableHead>
                <TableHead>{t('dashboard.colQty')}</TableHead>
                <TableHead>{t('dashboard.colPrice')}</TableHead>
                <TableHead>{t('dashboard.colStatus')}</TableHead>
                <TableHead>{t('dashboard.colAlert')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recentTrades.length ? (
                stats.recentTrades.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tr.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{tr.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={tr.side === 'BUY' ? 'success' : 'destructive'}>
                        {tr.side === 'BUY' ? t('alerts.buy') : t('alerts.sell')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tr.balanceBeforeUsdt != null
                        ? `$${formatPrice(tr.balanceBeforeUsdt, locale)}`
                        : '—'}
                    </TableCell>
                    <TableCell>
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
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    {t('dashboard.noTrades')}
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
