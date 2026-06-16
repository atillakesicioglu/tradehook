'use client';



import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';

import { useI18n } from '@/lib/i18n/context';

import { useLiveRefresh } from '@/hooks/use-live-refresh';

import { formatNumber, formatPrice } from '@/lib/utils';
import { LivePrice } from '@/components/live-price';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {

  Table,

  TableBody,

  TableCell,

  TableHead,

  TableHeader,

  TableRow,

} from '@/components/ui/table';



interface Holding {

  asset: string;

  symbol: string | null;

  free: number;

  locked: number;

  total: number;

  priceUsdt: number;

  valueUsdt: number;

}



const LIVE_EVENTS = ['trade:executed', 'position:updated', 'position:closed'];



export default function PositionsPage() {

  const { t, locale } = useI18n();

  const [holdings, setHoldings] = useState<Holding[]>([]);

  const [loading, setLoading] = useState(true);



  const load = useCallback(

    async (silent = false) => {

      if (!silent) setLoading(true);

      try {

        setHoldings(await api.get<Holding[]>('/positions'));

      } finally {

        if (!silent) setLoading(false);

      }

    },

    [],

  );



  useEffect(() => {

    void load(false);

  }, [load]);



  useLiveRefresh(() => load(true), {

    intervalMs: 8_000,

    socketEvents: LIVE_EVENTS,

  });



  const totalValue = holdings.reduce((sum, h) => sum + h.valueUsdt, 0);



  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-2xl font-bold">{t('positions.title')}</h1>

        <p className="text-sm text-muted-foreground">{t('positions.subtitle')}</p>

      </div>



      <Card>

        <CardHeader className="flex flex-row items-center justify-between">

          <CardTitle>{t('positions.wallet')}</CardTitle>

          <span className="text-sm text-muted-foreground">

            {t('positions.totalValue')}:{' '}
            <LivePrice value={totalValue} locale={locale} />

            <span className="ml-2 text-xs text-emerald-500/80">{t('positions.live')}</span>

          </span>

        </CardHeader>

        <CardContent>

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>{t('positions.colAsset')}</TableHead>

                <TableHead>{t('positions.colPrice')}</TableHead>

                <TableHead>{t('positions.colAvailable')}</TableHead>

                <TableHead>{t('positions.colLocked')}</TableHead>

                <TableHead>{t('positions.colTotal')}</TableHead>

                <TableHead>{t('positions.colValue')}</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow>

                  <TableCell colSpan={6} className="text-center text-muted-foreground">

                    {t('common.loading')}

                  </TableCell>

                </TableRow>

              ) : holdings.length ? (

                holdings.map((h) => (

                  <TableRow key={h.asset}>

                    <TableCell className="font-medium">{h.asset}</TableCell>

                    <TableCell>
                      <LivePrice
                        value={h.priceUsdt}
                        locale={locale}
                        className="font-medium text-primary"
                      />
                    </TableCell>

                    <TableCell>{formatNumber(h.free, 8, locale)}</TableCell>

                    <TableCell>{formatNumber(h.locked, 8, locale)}</TableCell>

                    <TableCell>{formatNumber(h.total, 8, locale)}</TableCell>

                    <TableCell>
                      <LivePrice value={h.valueUsdt} locale={locale} />
                    </TableCell>

                  </TableRow>

                ))

              ) : (

                <TableRow>

                  <TableCell colSpan={6} className="text-center text-muted-foreground">

                    {t('positions.none')}

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


