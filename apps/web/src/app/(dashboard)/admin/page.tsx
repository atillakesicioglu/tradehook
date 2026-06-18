'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ListOrdered, Shield, Users, Webhook } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import { formatDate, formatNumber } from '@/lib/utils';
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

interface AdminOverview {
  userCount: number;
  strategyCount: number;
  alertCount: number;
  filledOrderCount: number;
  webhookLogCount: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  hasBinanceAccount: boolean;
  binanceExchange: string | null;
  subscription: {
    plan: string;
    status: string;
    monthlyTradeCount: number;
  } | null;
  alertCount: number;
  strategyCount: number;
  orderCount: number;
  filledOrderCount: number;
  webhookLogCount: number;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ov, list] = await Promise.all([
        api.get<AdminOverview>('/admin/overview'),
        api.get<AdminUser[]>('/admin/users'),
      ]);
      setOverview(ov);
      setUsers(list);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('admin.forbidden'));
    }
  }, [t]);

  useEffect(() => {
    if (!loading && user && !user.isAdmin) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user?.isAdmin) {
      void load();
    }
  }, [loading, user, load]);

  if (loading || !user?.isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.subtitle')}</p>
      </div>

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.statUsers')}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(overview.userCount, 0, locale)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.statStrategies')}
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(overview.strategyCount, 0, locale)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.statAlerts')}
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(overview.alertCount, 0, locale)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.statTrades')}
              </CardTitle>
              <ListOrdered className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(overview.filledOrderCount, 0, locale)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.statWebhooks')}
              </CardTitle>
              <Webhook className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(overview.webhookLogCount, 0, locale)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.usersTable')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.colEmail')}</TableHead>
                <TableHead>{t('admin.colName')}</TableHead>
                <TableHead>{t('admin.colJoined')}</TableHead>
                <TableHead>{t('admin.colPlan')}</TableHead>
                <TableHead>{t('admin.colBinance')}</TableHead>
                <TableHead className="text-right">
                  {t('admin.colStrategies')}
                </TableHead>
                <TableHead className="text-right">
                  {t('admin.colAlerts')}
                </TableHead>
                <TableHead className="text-right">
                  {t('admin.colTrades')}
                </TableHead>
                <TableHead className="text-right">
                  {t('admin.colWebhooks')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.email}</TableCell>
                    <TableCell>{row.name ?? '—'}</TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>
                      {row.subscription ? (
                        <Badge variant="secondary">{row.subscription.plan}</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {row.hasBinanceAccount ? (
                        <Badge variant="outline">
                          {row.binanceExchange ?? 'OK'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(row.strategyCount, 0, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(row.alertCount, 0, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(row.filledOrderCount, 0, locale)}
                      {row.orderCount > row.filledOrderCount && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          / {formatNumber(row.orderCount, 0, locale)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(row.webhookLogCount, 0, locale)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
