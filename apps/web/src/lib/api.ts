export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const DEV_MOCK_AUTH =
  (process.env.NEXT_PUBLIC_DEV_MOCK_AUTH ?? 'true') !== 'false';

const TOKEN_KEY = 'th_token';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

function isNetworkFailure(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof Error &&
      (err.message === 'Failed to fetch' ||
        err.message.includes('NetworkError') ||
        err.message.includes('fetch')))
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const url = `${API_URL}${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        let message = res.statusText;
        try {
          const data = await res.json();
          message = Array.isArray(data.message)
            ? data.message.join(', ')
            : (data.message ?? message);
        } catch {
          // keep statusText
        }
        throw new ApiError(message, res.status);
      }

      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError) throw err;
      if (isNetworkFailure(err) && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      break;
    }
  }

  if (lastError instanceof ApiError) throw lastError;

  throw new NetworkError(
    `API'ye ulaşılamıyor (${API_URL}). pnpm dev çalışıyor mu? API port 3001 ayakta olmalı.`,
  );
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
