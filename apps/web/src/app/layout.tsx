import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { I18nProvider } from '@/lib/i18n/context';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'TradeHook — TradingView to Binance automation',
  description:
    'Connect TradingView alerts to your Binance account and automate spot trades.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
