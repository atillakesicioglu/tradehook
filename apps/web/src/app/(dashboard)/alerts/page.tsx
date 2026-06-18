'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CopyButton } from '@/components/copy-button';
import { SymbolSearch } from '@/components/symbol-search';
import { MonitoredPositions } from '@/components/monitored-positions';
import { formatNumber, formatPrice } from '@/lib/utils';
import {
  computeStopLossPrice,
  computeTakeProfitPrice,
} from '@/lib/sltp';

interface Alert {
  id: string;
  name: string;
  symbol: string;
  side: string;
  riskValue: number;
  riskType?: string;
  isActive: boolean;
  webhookUrl: string;
  isLocalWebhook?: boolean;
  messageJson: Record<string, unknown>;
  stopLossEnabled: boolean;
  stopLossMode: string | null;
  stopLossValue: number | null;
  takeProfitEnabled: boolean;
  takeProfitMode: string | null;
  takeProfitValue: number | null;
}

interface AlertPair {
  id: string;
  name: string;
  symbol: string;
  initialUsdt: number;
  compoundUsdt: number | null;
  nextBuyUsdt: number;
  heldQuantity: number | null;
  inPosition: boolean;
  buyAlert: Alert;
  sellAlert: Alert;
}

interface AlertsResponse {
  pairs: AlertPair[];
  alerts: Alert[];
}

interface BalanceInfo {
  availableUsdt: number;
  totalUsdt: number;
  connected: boolean;
}

function WebhookBlock({ alert, label }: { alert: Alert; label: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <Badge variant={alert.isActive ? 'success' : 'secondary'}>
          {alert.isActive ? t('alerts.active') : t('alerts.passive')}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">{alert.side === 'BUY' ? t('alerts.buy') : t('alerts.sell')}</span>
        <CopyButton value={alert.webhookUrl} label={t('alerts.copyUrl')} />
      </div>
      <code className="block overflow-x-auto rounded bg-muted px-2 py-1.5 text-xs">
        {alert.webhookUrl}
      </code>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">{t('alerts.tvMessage')}</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-muted p-2">
          {JSON.stringify(alert.messageJson, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function AlertsPage() {
  const { t, locale } = useI18n();
  const [pairs, setPairs] = useState<AlertPair[]>([]);
  const [standaloneAlerts, setStandaloneAlerts] = useState<Alert[]>([]);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [expandedPair, setExpandedPair] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<Set<string>>(new Set());

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [initialUsdt, setInitialUsdt] = useState('10');
  const [creating, setCreating] = useState(false);

  const [advName, setAdvName] = useState('');
  const [advSymbol, setAdvSymbol] = useState('BTCUSDT');
  const [advSide, setAdvSide] = useState('BUY');
  const [advRisk, setAdvRisk] = useState('50');
  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [stopLossMode, setStopLossMode] = useState('PERCENT');
  const [stopLossValue, setStopLossValue] = useState('');
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
  const [takeProfitMode, setTakeProfitMode] = useState('PERCENT');
  const [takeProfitValue, setTakeProfitValue] = useState('');

  const maxRisk = balance?.availableUsdt ?? 0;
  const exampleEntry = 100;
  const slPreview =
    stopLossEnabled && stopLossValue
      ? computeStopLossPrice(exampleEntry, stopLossMode as 'PERCENT' | 'USDT', Number(stopLossValue))
      : null;
  const tpPreview =
    takeProfitEnabled && takeProfitValue
      ? computeTakeProfitPrice(exampleEntry, takeProfitMode as 'PERCENT' | 'USDT', Number(takeProfitValue))
      : null;

  const load = useCallback(async () => {
    const [alertsData, balanceData] = await Promise.all([
      api.get<AlertsResponse>('/alerts'),
      api.get<BalanceInfo>('/binance/balance'),
    ]);
    setPairs(alertsData.pairs);
    setStandaloneAlerts(alertsData.alerts);
    setBalance(balanceData);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (maxRisk > 0 && Number(initialUsdt) > maxRisk) {
      setInitialUsdt(String(maxRisk));
    }
  }, [maxRisk, initialUsdt]);

  const onInitialUsdtChange = (raw: string) => {
    const num = Number(raw);
    if (!raw || Number.isNaN(num)) {
      setInitialUsdt(raw);
      return;
    }
    if (maxRisk > 0 && num > maxRisk) {
      setInitialUsdt(String(maxRisk));
    } else {
      setInitialUsdt(raw);
    }
  };

  const createPair = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/alerts/pairs', {
        name,
        symbol,
        initialUsdt: Number(initialUsdt),
      });
      toast.success(t('alerts.strategyCreated'));
      setName('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('alerts.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const createAdvanced = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        name: advName,
        symbol: advSymbol,
        side: advSide,
        riskValue: Number(advRisk),
      };
      if (stopLossEnabled) {
        payload.stopLossEnabled = true;
        payload.stopLossMode = stopLossMode;
        payload.stopLossValue = Number(stopLossValue);
      }
      if (takeProfitEnabled) {
        payload.takeProfitEnabled = true;
        payload.takeProfitMode = takeProfitMode;
        payload.takeProfitValue = Number(takeProfitValue);
      }
      await api.post('/alerts', payload);
      toast.success(t('alerts.created'));
      setAdvName('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('alerts.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const togglePair = (id: string) => {
    setExpandedPair((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAlert = async (alert: Alert) => {
    await api.patch(`/alerts/${alert.id}`, { isActive: !alert.isActive });
    await load();
  };

  const removePair = async (id: string) => {
    await api.del(`/alerts/pairs/${id}`);
    toast.success(t('alerts.deleted'));
    await load();
  };

  const removeAlert = async (id: string) => {
    await api.del(`/alerts/${id}`);
    toast.success(t('alerts.deleted'));
    await load();
  };

  const allAlerts = [...pairs.flatMap((p) => [p.buyAlert, p.sellAlert]), ...standaloneAlerts];
  const needsTunnel =
    allAlerts.length === 0 || allAlerts.some((a) => a.isLocalWebhook !== false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('alerts.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('alerts.subtitle')}</p>
      </div>

      {needsTunnel && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-amber-300">{t('alerts.tvWarningTitle')}</p>
                <p className="text-muted-foreground">{t('alerts.tvWarningBody')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('alerts.newTitle')}</CardTitle>
          <CardDescription>{t('alerts.newDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createPair} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('alerts.strategyName')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('alerts.namePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">{t('alerts.symbol')}</Label>
                <SymbolSearch id="symbol" value={symbol} onChange={setSymbol} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <h3 className="font-semibold text-emerald-400">{t('alerts.buySection')}</h3>
                <p className="text-xs text-muted-foreground">{t('alerts.buySectionDesc')}</p>
                <div className="space-y-2">
                  <Label htmlFor="initialUsdt">{t('alerts.initialUsdt')}</Label>
                  <Input
                    id="initialUsdt"
                    type="number"
                    min="0.01"
                    max={maxRisk > 0 ? maxRisk : undefined}
                    step="any"
                    value={initialUsdt}
                    onChange={(e) => onInitialUsdtChange(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('alerts.maxRisk')}: {formatNumber(maxRisk)} USDT
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
                <h3 className="font-semibold text-sky-400">{t('alerts.sellSection')}</h3>
                <p className="text-xs text-muted-foreground">{t('alerts.sellSectionDesc')}</p>
                <p className="text-sm text-muted-foreground">
                  10 USDT → 14 USDT → sonraki alım 14 USDT ile
                </p>
              </div>
            </div>

            <Button type="submit" disabled={creating}>
              {creating ? t('alerts.creating') : t('alerts.createStrategy')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <details
        className="rounded-lg border border-border"
        open={showAdvanced}
        onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          {t('alerts.advancedTitle')}
        </summary>
        <CardContent className="border-t border-border pt-4">
          <p className="mb-4 text-xs text-muted-foreground">{t('alerts.advancedDesc')}</p>
          <form onSubmit={createAdvanced} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                value={advName}
                onChange={(e) => setAdvName(e.target.value)}
                placeholder={t('alerts.name')}
                required
              />
              <SymbolSearch value={advSymbol} onChange={setAdvSymbol} />
              <Select value={advSide} onChange={(e) => setAdvSide(e.target.value)}>
                <option value="BUY">{t('alerts.buy')}</option>
                <option value="SELL">{t('alerts.sell')}</option>
              </Select>
              <Input
                type="number"
                min="0.01"
                value={advRisk}
                onChange={(e) => setAdvRisk(e.target.value)}
                placeholder={t('alerts.risk')}
                required
              />
            </div>
            {(slPreview != null || tpPreview != null) && (
              <p className="text-xs text-muted-foreground">
                SL/TP önizleme: {slPreview != null ? formatPrice(slPreview, locale) : '—'} /{' '}
                {tpPreview != null ? formatPrice(tpPreview, locale) : '—'}
              </p>
            )}
            <Button type="submit" size="sm" variant="outline" disabled={creating}>
              {t('alerts.create')}
            </Button>
          </form>
        </CardContent>
      </details>

      <MonitoredPositions />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('alerts.strategiesTitle')}</h2>
        {pairs.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('alerts.noStrategies')}</p>
        )}
        {pairs.map((pair) => {
          const isOpen = expandedPair.has(pair.id);
          return (
            <Card key={pair.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    className="flex flex-1 items-start gap-2 text-left"
                    onClick={() => togglePair(pair.id)}
                  >
                    {isOpen ? (
                      <ChevronUp className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <div>
                      <CardTitle className="text-base">{pair.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {pair.symbol} · {t('alerts.nextBuy')}: {formatNumber(pair.nextBuyUsdt)} USDT
                        {' · '}
                        {pair.inPosition ? (
                          <span className="text-emerald-400">{t('alerts.inPosition')}</span>
                        ) : (
                          <span>{t('alerts.waitingBuy')}</span>
                        )}
                      </CardDescription>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleAlert(pair.buyAlert)}>
                      {pair.buyAlert.isActive ? t('alerts.pause') : t('alerts.activate')}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removePair(pair.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
                  <WebhookBlock alert={pair.buyAlert} label={t('alerts.buyWebhook')} />
                  <WebhookBlock alert={pair.sellAlert} label={t('alerts.sellWebhook')} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {standaloneAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t('alerts.listTitle')}</h2>
          {standaloneAlerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between gap-4">
                  <CardTitle className="text-base">{alert.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => removeAlert(alert.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
                <CardDescription>
                  {alert.symbol} · {alert.side} · {alert.riskValue} USDT
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
