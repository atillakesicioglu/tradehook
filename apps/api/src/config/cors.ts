import { loadConfig } from './configuration';

/** Dev-friendly CORS: localhost and 127.0.0.1 on the web port. */
export function devCorsOrigins(): string[] {
  const { webOrigin } = loadConfig();
  const port = new URL(webOrigin).port || '3000';
  return [
    webOrigin,
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ];
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return devCorsOrigins().includes(origin);
}
