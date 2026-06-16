'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bell,
  LineChart,
  Lock,
  Webhook,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LandingPage() {
  const { t } = useI18n();

  const features = [
    { icon: Webhook, title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
    { icon: Zap, title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
    { icon: Lock, title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
    { icon: Activity, title: t('landing.feature4Title'), desc: t('landing.feature4Desc') },
  ];

  const steps = [
    { icon: Bell, title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { icon: Webhook, title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { icon: LineChart, title: t('landing.step3Title'), desc: t('landing.step3Desc') },
  ];

  const plans = [
    {
      name: t('landing.planStarter'),
      price: t('landing.planFree'),
      perks: [t('landing.perk50'), t('landing.perkSpot'), t('landing.perkRealtime')],
      comingSoon: false,
    },
    {
      name: t('landing.planPro'),
      price: t('common.comingSoon'),
      perks: [t('landing.perkHigher'), t('landing.perkPriority'), t('landing.perkEmail')],
      highlighted: true,
      comingSoon: true,
    },
    {
      name: t('landing.planElite'),
      price: t('common.comingSoon'),
      perks: [t('landing.perkUnlimited'), t('landing.perkAnalytics'), t('landing.perkDedicated')],
      comingSoon: true,
    },
  ];

  const faqs = [
    { q: t('landing.faq1Q'), a: t('landing.faq1A') },
    { q: t('landing.faq2Q'), a: t('landing.faq2A') },
    { q: t('landing.faq3Q'), a: t('landing.faq3A') },
    { q: t('landing.faq4Q'), a: t('landing.faq4A') },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Zap className="h-5 w-5" />
            </span>
            TradeHook
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">{t('nav.features')}</a>
            <a href="#how" className="hover:text-foreground">{t('nav.howItWorks')}</a>
            <a href="#pricing" className="hover:text-foreground">{t('nav.pricing')}</a>
            <a href="#faq" className="hover:text-foreground">{t('nav.faq')}</a>
            <a href="#blog" className="hover:text-foreground">{t('nav.blog')}</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">{t('nav.login')}</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">{t('nav.register')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <Badge variant="success" className="mx-auto mb-6">{t('landing.badge')}</Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          {t('landing.heroTitle')}{' '}
          <span className="text-primary">{t('landing.heroHighlight')}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t('landing.heroSubtitle')}
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              {t('landing.getStarted')} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#how">
            <Button size="lg" variant="outline">{t('landing.howItWorksBtn')}</Button>
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">{t('landing.featuresTitle')}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="h-8 w-8 text-primary" />
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">{t('landing.howTitle')}</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                    {i + 1}
                  </span>
                  <s.icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="mt-2 text-base">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">{t('landing.pricingTitle')}</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t('landing.pricingSubtitle')}
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.name} className={p.highlighted ? 'border-primary' : undefined}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription className="text-2xl font-bold text-foreground">
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
                <Button
                  className="w-full"
                  variant={p.highlighted ? 'default' : 'outline'}
                  disabled={p.comingSoon}
                >
                  {p.comingSoon ? t('common.comingSoon') : t('common.startFree')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">{t('landing.faqTitle')}</h2>
        <div className="mt-10 space-y-4">
          {faqs.map((f) => (
            <Card key={f.q}>
              <CardHeader>
                <CardTitle className="text-base">{f.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="blog" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold">{t('landing.blogTitle')}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Badge variant="outline" className="w-fit">{t('common.comingSoon')}</Badge>
                <CardTitle className="mt-2 text-base">
                  {t('landing.blogPlaceholder')} {i}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t('landing.blogDesc')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} TradeHook. {t('landing.footer')}</span>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">{t('nav.login')}</Link>
            <Link href="/register" className="hover:text-foreground">{t('nav.register')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
