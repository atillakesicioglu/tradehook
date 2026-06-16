'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';

interface Subscription {
  plan: string;
  status: string;
  monthlyTradeLimit: number;
  monthlyTradeCount: number;
}

export default function SubscriptionPage() {
  const { t } = useI18n();
  const [sub, setSub] = useState<Subscription | null>(null);

  useEffect(() => {
    void api.get<Subscription>('/subscriptions/me').then(setSub);
  }, []);

  const usage = sub
    ? Math.min(100, Math.round((sub.monthlyTradeCount / sub.monthlyTradeLimit) * 100))
    : 0;

  const plans = [
    {
      name: 'STARTER',
      label: t('landing.planStarter'),
      price: t('landing.planFree'),
      perks: [t('subscription.perk50'), t('subscription.perkSpot')],
      comingSoon: false,
    },
    {
      name: 'PRO',
      label: t('landing.planPro'),
      price: t('common.comingSoon'),
      perks: [t('subscription.perkHigher'), t('subscription.perkPriority')],
      comingSoon: true,
    },
    {
      name: 'ELITE',
      label: t('landing.planElite'),
      price: t('common.comingSoon'),
      perks: [t('subscription.perkUnlimited'), t('subscription.perkAnalytics')],
      comingSoon: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('subscription.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subscription.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('subscription.current')}
            {sub && <Badge>{sub.plan}</Badge>}
            {sub && <StatusBadge status={sub.status} />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('subscription.monthlyTrades')}</span>
            <span>
              {sub?.monthlyTradeCount ?? 0} / {sub?.monthlyTradeLimit ?? 0}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${usage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <Card
            key={p.name}
            className={p.name === sub?.plan ? 'border-primary' : undefined}
          >
            <CardHeader>
              <CardTitle>{p.label}</CardTitle>
              <CardDescription className="text-xl font-bold text-foreground">
                {p.price}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant="outline" disabled>
                {p.name === sub?.plan ? t('common.currentPlan') : t('common.comingSoon')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
