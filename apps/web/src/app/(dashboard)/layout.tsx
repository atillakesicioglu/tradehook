'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CreditCard,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Shield,
  Wallet,
  ListOrdered,
  LogOut,
  Settings,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/alerts', key: 'nav.alerts', icon: Bell },
  { href: '/trades', key: 'nav.trades', icon: ListOrdered },
  { href: '/positions', key: 'nav.positions', icon: Wallet },
  { href: '/binance', key: 'nav.binance', icon: KeyRound },
  { href: '/subscription', key: 'nav.subscription', icon: CreditCard },
  { href: '/settings', key: 'nav.settings', icon: Settings },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </span>
          TradeHook
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.key)}
              </Link>
            );
          })}
          {user.isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                pathname === '/admin'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Shield className="h-4 w-4" />
              {t('nav.admin')}
            </Link>
          )}
        </nav>
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground md:hidden">
            <Gauge className="h-4 w-4" /> TradeHook
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
