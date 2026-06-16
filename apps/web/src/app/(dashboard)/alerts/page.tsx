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

interface BalanceInfo {
  availableUsdt: number;
  totalUsdt: number;
  connected: boolean;
}

function formatSlTp(
  enabled: boolean,
  mode: string | null,
  value: number | null,
): string {
  if (!enabled || !mode || value == null) return '—';
  return mode === 'PERCENT' ? `${value}%` : `${value} USDT`;
}

export default function AlertsPage() {
  const { t, locale } = useI18n();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState('BUY');
  const [riskValue, setRiskValue] = useState('50');
  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [stopLossMode, setStopLossMode] = useState('PERCENT');
  const [stopLossValue, setStopLossValue] = useState('');
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
  const [takeProfitMode, setTakeProfitMode] = useState('PERCENT');
  const [takeProfitValue, setTakeProfitValue] = useState('');
  const [creating, setCreating] = useState(false);

  const maxRisk = balance?.availableUsdt ?? 0;
  const exampleEntry = 100;

  const slPreview =
    stopLossEnabled && stopLossValue
      ? computeStopLossPrice(
          exampleEntry,
          stopLossMode as 'PERCENT' | 'USDT',
          Number(stopLossValue),
        )
      : null;
  const tpPreview =
    takeProfitEnabled && takeProfitValue
      ? computeTakeProfitPrice(
          exampleEntry,
          takeProfitMode as 'PERCENT' | 'USDT',
          Number(takeProfitValue),
        )
      : null;

  const load = useCallback(async () => {
    const [alertsData, balanceData] = await Promise.all([
      api.get<Alert[]>('/alerts'),
      api.get<BalanceInfo>('/binance/balance'),
    ]);
    setAlerts(alertsData);
    setBalance(balanceData);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (maxRisk > 0 && Number(riskValue) > maxRisk) {
      setRiskValue(String(maxRisk));
    }
  }, [maxRisk, riskValue]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onRiskChange = (raw: string) => {
    const num = Number(raw);
    if (!raw || Number.isNaN(num)) {
      setRiskValue(raw);
      return;
    }
    if (maxRisk > 0 && num > maxRisk) {
      setRiskValue(String(maxRisk));
    } else {
      setRiskValue(raw);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        symbol,
        side,
        riskValue: Number(riskValue),
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
      setName('');
      setStopLossEnabled(false);
      setStopLossValue('');
      setTakeProfitEnabled(false);
      setTakeProfitValue('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('alerts.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (alert: Alert) => {
    await api.patch(`/alerts/${alert.id}`, { isActive: !alert.isActive });
    await load();
  };

  const remove = async (id: string) => {
    await api.del(`/alerts/${id}`);
    toast.success(t('alerts.deleted'));
    await load();
  };

  const needsTunnel =
    alerts.length === 0 || alerts.some((a) => a.isLocalWebhook !== false);

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
            <div className="space-y-1 rounded-md bg-muted/40 p-3 font-mono text-xs">
              <p>{t('alerts.tvTunnelCloudflare')}</p>
              <p className="text-muted-foreground">{t('alerts.tvTunnelNgrok')}</p>
              <p className="pt-2 text-primary">{t('alerts.tvEnvHint')}</p>
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
          <form onSubmit={create} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('alerts.name')}</Label>
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
              <div className="space-y-2">
                <Label htmlFor="side">{t('alerts.side')}</Label>
                <Select id="side" value={side} onChange={(e) => setSide(e.target.value)}>
                  <option value="BUY">{t('alerts.buy')}</option>
                  <option value="SELL">{t('alerts.sell')}</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk">{t('alerts.risk')}</Label>
                <Input
                  id="risk"
                  type="number"
                  min="0.01"
                  max={maxRisk > 0 ? maxRisk : undefined}
                  step="any"
                  value={riskValue}
                  onChange={(e) => onRiskChange(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('alerts.maxRisk')}: {formatNumber(maxRisk)} USDT
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="mb-4 text-sm font-medium">{t('alerts.extraSettings')}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3 rounded-md bg-muted/30 p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={stopLossEnabled}
                      onChange={(e) => setStopLossEnabled(e.target.checked)}
                      className="rounded border-border"
                    />
                    {t('alerts.stopLoss')}
                  </label>
                  {stopLossEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={stopLossMode}
                        onChange={(e) => setStopLossMode(e.target.value)}
                      >
                        <option value="PERCENT">{t('alerts.modePercent')}</option>
                        <option value="USDT">{t('alerts.modeUsdt')}</option>
                      </Select>
                      <Input
                        type="number"
                        min="0.01"
                        step="any"
                        value={stopLossValue}
                        onChange={(e) => setStopLossValue(e.target.value)}
                        placeholder={t('alerts.valuePlaceholder')}
                        required
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-3 rounded-md bg-muted/30 p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={takeProfitEnabled}
                      onChange={(e) => setTakeProfitEnabled(e.target.checked)}
                      className="rounded border-border"
                    />
                    {t('alerts.takeProfit')}
                  </label>
                  {takeProfitEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={takeProfitMode}
                        onChange={(e) => setTakeProfitMode(e.target.value)}
                      >
                        <option value="PERCENT">{t('alerts.modePercent')}</option>
                        <option value="USDT">{t('alerts.modeUsdt')}</option>
                      </Select>
                      <Input
                        type="number"
                        min="0.01"
                        step="any"
                        value={takeProfitValue}
                        onChange={(e) => setTakeProfitValue(e.target.value)}
                        placeholder={t('alerts.valuePlaceholder')}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
              {(slPreview != null || tpPreview != null) && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t('alerts.slTpExample')
                    .replace('{entry}', String(exampleEntry))
                    .replace('{sl}', slPreview != null ? formatPrice(slPreview, locale) : '—')
                    .replace('{tp}', tpPreview != null ? formatPrice(tpPreview, locale) : '—')}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{t('alerts.slTpNote')}</p>
            </div>

            <Button type="submit" disabled={creating}>
              {creating ? t('alerts.creating') : t('alerts.create')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <MonitoredPositions />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('alerts.listTitle')}</h2>
        {alerts.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('alerts.none')}</p>
        )}
        {alerts.map((alert) => {
          const isOpen = expanded.has(alert.id);
          return (
            <Card key={alert.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    className="flex flex-1 items-start gap-2 text-left"
                    onClick={() => toggleExpand(alert.id)}
                  >
                    {isOpen ? (
                      <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        {alert.name}
                        <Badge variant={alert.isActive ? 'success' : 'secondary'}>
                          {alert.isActive ? t('alerts.active') : t('alerts.passive')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {alert.symbol} · {alert.side === 'BUY' ? t('alerts.buy') : t('alerts.sell')} ·{' '}
                        {alert.riskValue} USDT
                        {(alert.stopLossEnabled || alert.takeProfitEnabled) && (
                          <>
                            {' '}
                            · SL {formatSlTp(alert.stopLossEnabled, alert.stopLossMode, alert.stopLossValue)}
                            {' '}
                            · TP{' '}
                            {formatSlTp(
                              alert.takeProfitEnabled,
                              alert.takeProfitMode,
                              alert.takeProfitValue,
                            )}
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggle(alert)}>
                      {alert.isActive ? t('alerts.pause') : t('alerts.activate')}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(alert.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="space-y-4 border-t border-border pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t('alerts.webhookUrl')}</Label>
                      <CopyButton value={alert.webhookUrl} label={t('alerts.copyUrl')} />
                    </div>
                    <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
                      {alert.webhookUrl}
                    </code>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t('alerts.tvMessage')}</Label>
                      <CopyButton
                        value={JSON.stringify(alert.messageJson, null, 2)}
                        label={t('alerts.copyJson')}
                      />
                    </div>
                    <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
                      {JSON.stringify(alert.messageJson, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
