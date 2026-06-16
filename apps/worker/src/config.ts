export interface WorkerConfig {
  redisUrl: string;
  encryptionKey: string;
  mockTrading: boolean;
  binanceUseTestnet: boolean;
}

export function loadWorkerConfig(): WorkerConfig {
  return {
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    encryptionKey: process.env.ENCRYPTION_KEY ?? '',
    mockTrading: process.env.MOCK_TRADING !== 'false',
    binanceUseTestnet: process.env.BINANCE_USE_TESTNET !== 'false',
  };
}
