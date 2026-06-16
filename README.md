# TradeHook

TradingView-to-Binance trading automation SaaS (MVP).

TradeHook lets users register, connect their Binance API account, create TradingView
webhook alerts, copy the generated webhook URL and message JSON into TradingView, and
monitor triggered trades from a realtime dashboard.

> This is a local-development MVP. There is no production domain. Everything runs on
> `localhost` and is configured through environment variables.

## Tech stack

- Monorepo: pnpm workspaces
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn-style UI (dark)
- Backend API: NestJS + TypeScript
- Worker: NestJS (BullMQ consumer)
- Database: PostgreSQL + Prisma
- Queue / realtime bus: Redis + BullMQ
- Realtime: Socket.IO
- Auth: dev JWT now, Firebase Auth (email/password + Google) ready to enable

## Repository layout

```
TradeHook/
├── apps/
│   ├── web/      # Next.js App Router frontend
│   ├── api/      # NestJS HTTP + WebSocket + webhook
│   └── worker/   # NestJS BullMQ consumer
├── packages/
│   ├── database/ # Prisma schema, migrations, client
│   ├── shared/   # Zod schemas, enums, Binance client, shared types
│   └── config/   # shared tsconfig bases
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env.example
```

## Architecture

```
TradingView  ──POST /webhooks/tradingview/:token──▶  API
                                                      │  validate + idempotency
                                                      ▼
                                                   BullMQ (Redis)
                                                      │
                                                      ▼
                                                   Worker  ──▶ Binance (or mock)
                                                      │
                                                      ├──▶ PostgreSQL (Order)
                                                      └──▶ Redis pub/sub ──▶ API WebSocket ──▶ Web dashboard
```

The webhook endpoint never calls Binance directly. It validates the signal, writes a
`WebhookLog`, enqueues a job, and returns quickly. The worker performs the actual order.

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable` then `corepack prepare pnpm@latest --activate`)
- Docker (for PostgreSQL and Redis)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL + Redis (Postgres is exposed on host port 5433)
pnpm docker:up

# 3. Create your environment file and an encryption key
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#   paste the output into ENCRYPTION_KEY in .env

# 4. Build shared packages and run the first migration
pnpm build:packages
pnpm db:migrate --name init

# 5. Run everything (api + worker + web)
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

> Note: docker-compose maps PostgreSQL to host port **5433** (to avoid clashing with any
> Postgres already on 5432). The default `DATABASE_URL` already uses 5433.

## Useful scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run api, worker and web together |
| `pnpm dev:api` / `dev:worker` / `dev:web` | Run a single app |
| `pnpm docker:up` / `docker:down` | Start / stop PostgreSQL + Redis |
| `pnpm db:migrate` | Create and apply a Prisma migration |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm build` | Build all packages and apps |

## Environment variables

All apps read the single `.env` at the repository root. See [.env.example](.env.example).
Key settings:

- `DEV_MOCK_AUTH` — `true` uses dev JWT auth; `false` uses Firebase.
- `MOCK_TRADING` — `true` makes the worker create fake fills without calling Binance.
- `BINANCE_USE_TESTNET` — `true` targets `https://testnet.binance.vision`.
- `ENCRYPTION_KEY` — 64 hex chars; encrypts Binance credentials at rest.

## Auth modes

### Dev JWT (default)

`DEV_MOCK_AUTH=true`. The API exposes `/auth/register` and `/auth/login` and issues its
own JWTs. Google login is disabled in this mode.

### Firebase (when ready)

1. Create a Firebase project and enable Email/Password and Google sign-in providers.
2. Create a service account and fill the server vars in `.env`:
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
     (keep the `\n` escapes in the private key).
3. Fill the web SDK vars: `NEXT_PUBLIC_FIREBASE_API_KEY`,
   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.
4. Set `DEV_MOCK_AUTH=false` and `NEXT_PUBLIC_DEV_MOCK_AUTH=false`, then restart.

The API then verifies Firebase ID tokens and upserts users by `firebaseUid`.

## Binance

Create a Spot API key. **Never enable withdrawal permission** — TradeHook rejects keys
that can withdraw. For development use the
[Binance Spot Testnet](https://testnet.binance.vision/) and keep `BINANCE_USE_TESTNET=true`.

Set `MOCK_TRADING=true` to develop the full flow without any Binance call: the worker
creates a fake filled order using the price from the TradingView payload.

## TradingView webhooks (tunnel required)

TradingView **cannot** call `http://localhost:3001`. It only accepts:

- **HTTPS** on port 443 (recommended), or
- **HTTP** on port **80** only

For local development you must expose your API through a public tunnel:

```bash
# Option A — Cloudflare (no global install; uses npx)
pnpm tunnel

# Option B — install cloudflared globally (Windows)
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3001

# Option C — ngrok (if you have it)
ngrok http 3001
```

Copy the **HTTPS** URL (e.g. `https://abc123.trycloudflare.com`) into `.env`:

```env
WEBHOOK_PUBLIC_URL=https://abc123.trycloudflare.com
```

Restart `pnpm dev`, open **Alerts** in the dashboard, and copy the updated webhook URL
into TradingView.

> The API still runs on port 3001 locally; the tunnel forwards public HTTPS traffic to it.

## Testing the webhook

**Local test** (curl, no TradingView):

Create an alert in the dashboard, copy its webhook URL and JSON, then test with curl
(works with `localhost:3001` even when TradingView needs the tunnel URL):

```bash
curl -X POST http://localhost:3001/webhooks/tradingview/<WEBHOOK_TOKEN> \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "<WEBHOOK_SECRET>",
    "signalId": "test-1",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "price": "65000",
    "time": "123",
    "strategy": "My alert"
  }'
```

A successful call returns `{"accepted":true,"status":"QUEUED",...}`. Re-sending the same
`signalId` returns `{"accepted":false,"status":"DUPLICATE"}` — duplicate signals are never
executed twice.

## MVP scope

Included: SPOT MARKET orders, FIXED_USDT risk sizing, webhook intake with idempotency,
queue-based order execution, encrypted Binance credentials, placeholder subscription
limits, realtime trade updates.

Not included (by design): futures, copy trading, profit sharing, withdrawals, and any
real payment provider integration. The subscription page is UI-only.
