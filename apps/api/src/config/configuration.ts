// Centralised, typed access to environment variables used by the API.

export interface AppConfig {
  port: number;
  webOrigin: string;
  apiUrl: string;
  /** Public base URL for TradingView webhooks (ngrok/cloudflared HTTPS). */
  webhookPublicUrl: string;
  databaseUrl: string;
  redisUrl: string;
  devMockAuth: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  encryptionKey: string;
  mockTrading: boolean;
  binanceUseTestnet: boolean;
  firebase: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  };
  /** Comma-separated emails allowed to access /admin endpoints. */
  adminEmails: string;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.API_PORT ?? 3001),
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    apiUrl: process.env.API_URL ?? 'http://localhost:3001',
    webhookPublicUrl:
      process.env.WEBHOOK_PUBLIC_URL?.replace(/\/$/, '') ||
      process.env.API_URL?.replace(/\/$/, '') ||
      'http://localhost:3001',
    databaseUrl: process.env.DATABASE_URL ?? '',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    devMockAuth: process.env.DEV_MOCK_AUTH !== 'false',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    encryptionKey: process.env.ENCRYPTION_KEY ?? '',
    mockTrading: process.env.MOCK_TRADING !== 'false',
    binanceUseTestnet: process.env.BINANCE_USE_TESTNET !== 'false',
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    adminEmails: process.env.ADMIN_EMAILS ?? '',
  };
}
