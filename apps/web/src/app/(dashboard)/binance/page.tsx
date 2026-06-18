'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/context';
import { formatDate } from '@/lib/utils';
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

interface BinanceStatus {
  connected: boolean;
  accountType?: string;
  exchange?: 'GLOBAL' | 'TR';
  useTestnet?: boolean;
  isActive?: boolean;
  lastTestedAt?: string | null;
  lastTestOk?: boolean | null;
  apiKeyHint?: string;
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
      {steps.map((step, i) => (
        <li key={i}>
          {step.split(/(https?:\/\/[^\s]+)/g).map((part, j) =>
            part.match(/^https?:\/\//) ? (
              <a
                key={j}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {part}
              </a>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </li>
      ))}
    </ol>
  );
}

export default function BinancePage() {
  const { t, tSteps } = useI18n();
  const [status, setStatus] = useState<BinanceStatus | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [useTestnet, setUseTestnet] = useState('true');
  const [exchange, setExchange] = useState<'GLOBAL' | 'TR'>('GLOBAL');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    const s = await api.get<BinanceStatus>('/binance/status');
    setStatus(s);
    if (s.exchange) setExchange(s.exchange);
    if (s.useTestnet != null) setUseTestnet(s.useTestnet ? 'true' : 'false');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/binance/connect', {
        apiKey,
        secretKey,
        exchange,
        useTestnet: exchange === 'TR' ? false : useTestnet === 'true',
      });
      toast.success(t('binance.saved'));
      setApiKey('');
      setSecretKey('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('binance.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await api.post<{ message: string }>('/binance/test');
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('binance.testFailedToast'));
    } finally {
      setTesting(false);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('binance.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('binance.subtitle')}</p>
      </div>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 pt-6">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="text-sm">
            <p className="font-medium text-amber-300">{t('binance.warnTitle')}</p>
            <p className="text-muted-foreground">{t('binance.warnDesc')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('binance.guideTitle')}
            <a
              href="https://testnet.binance.vision/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardTitle>
          <CardDescription>{t('binance.guideIntro')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-emerald-400">
              {t('binance.guideTestnetTitle')}
            </h3>
            <StepList steps={tSteps('binance.guideTestnetSteps')} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-sky-400">
              {t('binance.guideTrTitle')}
            </h3>
            <StepList steps={tSteps('binance.guideTrSteps')} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t('binance.guideMainnetTitle')}</h3>
            <StepList steps={tSteps('binance.guideMainnetSteps')} />
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
            <p className="mb-2 font-medium">{t('binance.guidePermsTitle')}</p>
            <p className="text-emerald-400">✓ {t('binance.guidePermsEnable')}</p>
            <p className="text-red-400">✗ {t('binance.guidePermsDisable')}</p>
          </div>
          <p className="text-xs text-emerald-400/90">{t('binance.guideTestnetPerms')}</p>
          <p className="text-xs text-muted-foreground">{t('binance.guideMockNote')}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('binance.credentials')}</CardTitle>
            <CardDescription>{t('binance.credentialsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={connect} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">{t('binance.apiKey')}</Label>
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretKey">{t('binance.secretKey')}</Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchange">{t('binance.exchange')}</Label>
                <Select
                  id="exchange"
                  value={exchange}
                  onChange={(e) =>
                    setExchange(e.target.value as 'GLOBAL' | 'TR')
                  }
                >
                  <option value="GLOBAL">{t('binance.exchangeGlobal')}</option>
                  <option value="TR">{t('binance.exchangeTr')}</option>
                </Select>
              </div>
              {exchange === 'GLOBAL' ? (
                <div className="space-y-2">
                  <Label htmlFor="env">{t('binance.environment')}</Label>
                  <Select
                    id="env"
                    value={useTestnet}
                    onChange={(e) => setUseTestnet(e.target.value)}
                  >
                    <option value="true">{t('binance.testnet')}</option>
                    <option value="false">{t('binance.mainnet')}</option>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('binance.exchangeTrNote')}
                </p>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? t('binance.saving') : t('binance.save')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('binance.status')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.connected ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>{t('binance.connected')}</span>
                  <Badge variant="secondary">
                    {status.exchange === 'TR'
                      ? t('binance.exchangeTr')
                      : status.useTestnet
                        ? t('binance.testnet')
                        : t('binance.mainnet')}
                  </Badge>
                </div>
                <dl className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>{t('binance.apiKey')}</dt>
                    <dd className="font-mono">{status.apiKeyHint}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t('binance.accountType')}</dt>
                    <dd>{status.accountType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t('binance.lastTested')}</dt>
                    <dd>{formatDate(status.lastTestedAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t('binance.lastResult')}</dt>
                    <dd>
                      {status.lastTestOk == null
                        ? '-'
                        : status.lastTestOk
                          ? t('binance.testOk')
                          : t('binance.testFailed')}
                    </dd>
                  </div>
                </dl>
                <Button onClick={test} disabled={testing} variant="outline">
                  {testing ? t('binance.testing') : t('binance.testConnection')}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                {t('binance.notConnected')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
