# Veridex

A decentralized trust platform where verified humans build portable reputation, stake WLD on each other's integrity, and register traceable agent credentials that bind AI activity to human identity, delegated reputation, and liability. Powered by World ID proof-of-personhood.

## Overview

Veridex is designed around three trust problems:

- Identity is fake. Bots and sybils poison every platform.
- Reputation is trapped. People rebuild credibility from zero on every new service.
- AI agents are unaccountable. Nobody knows who is behind the bot.

Veridex combines World ID verification, portable worker reputation, staking-style trust signals, and agent credentials. A user can verify as a human, build a profile, connect supporting evidence like GitHub, and expose a public trust surface that clients, stakers, and agent consumers can inspect. Third-party sites can verify an agent credential and trace it back to the verified human behind that automation.

## Public API

Veridex exposes a small public read API for production trust and verification lookups. The product-facing docs live at `/api-docs` in the frontend app.

- `GET /api/trust/:veridexId` returns the current public trust surface for a user.
- `GET /api/reputation/:userId` returns the public profile payload, active reviews, and stake totals for a user.
- `GET /api/review/:workerId` returns the standalone public review feed for a worker.
- `GET /api/agent/:agentId` is live as a beta credential lookup route, but there is not yet a seeded public example credential.

Only the routes above are part of the documented public contract right now. `GET /api/reputation/browse/workers` is intentionally omitted until its route-order bug is fixed.

## User Types

- Workers verify with World ID, connect GitHub and other evidence sources, and build a trust profile.
- Stakers browse worker profiles and stake internal Veridex credits on workers they believe in.
- Clients evaluate workers, leave reviews, and inspect public trust signals.

## Monorepo Structure

```text
veridex/
|-- frontend/       # Next.js 14 App Router
|-- backend/        # Express + TypeScript API
`-- supabase/       # Database schema and migrations
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project
- World ID app credentials
- World Developer Portal Mini App entry for hackathon demos
- GitHub OAuth app
- Gemini API key

### Installation

1. Install dependencies.

```bash
cd frontend && npm install
cd ../backend && npm install
```

2. Configure environment variables in:

- [frontend/.env.local](/C:/Users/navneeth/Desktop/NavneethThings/Projects/catapult-world/veridex/frontend/.env.local)
- [backend/.env](/C:/Users/navneeth/Desktop/NavneethThings/Projects/catapult-world/veridex/backend/.env)

3. Run the base Supabase schema, then apply the wallet migration for existing deployments.

```sql
-- veridex/supabase/schema.sql
-- veridex/supabase/wallet_migration.sql
```

4. Make sure the following values are configured:

```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WORLD_APP_ID=your_world_app_id

# Backend
WORLDCHAIN_RPC_URL=https://worldchain-mainnet.g.alchemy.com/public
FRONTEND_URL=http://localhost:3000
```

5. Start the local apps.

```bash
# Terminal 1
cd frontend && npm run dev

# Terminal 2
cd backend && npm run dev
```

## Wallet Demo Flow

Veridex supports a browser wallet demo path:

1. Open Veridex in a normal desktop browser.
2. Verify identity.
3. Finish onboarding.
4. Open the dashboard and click `Connect Wallet`.
5. Approve account access in your injected EVM wallet.
6. Sign the Veridex challenge message.
7. View live World Chain balances on the dashboard.

Balances are read from World Chain through backend RPC once the wallet address is linked to the user account.

## Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS, Recharts
- Backend: Express, TypeScript, Supabase, Gemini API
- Wallet reads: Browser signature verification plus World Chain RPC balance reads
- Database: Supabase PostgreSQL
- Auth: World ID

## License

MIT
