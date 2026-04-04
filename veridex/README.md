# Veridex

A decentralized trust platform where verified humans build portable reputation, stake WLD on each other's integrity, and spawn accountable AI agents. Powered by World ID proof-of-personhood.

## Overview

Veridex solves three problems:
- **Identity is fake** — bots and sybils poison every platform
- **Reputation is trapped** — you rebuild credibility from zero on every new service
- **AI agents are unaccountable** — no one knows who's behind the bot

## User Types

- **Workers** — verify with World ID, connect GitHub (and optionally other platforms), get a trust profile built automatically
- **Stakers** — browse worker profiles, stake WLD credits on workers they believe in, earn/lose based on worker performance
- **Clients** — browse workers, evaluate them via an AI chatbot, leave staked reviews after working with someone

## Monorepo Structure

```
veridex/
├── frontend/       # Next.js 14+ App Router
├── backend/        # Express + TypeScript API
└── supabase/       # Database schema
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- World ID app credentials
- GitHub OAuth app
- Gemini API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. Set up environment variables (see `.env.example`)

4. Run the Supabase schema in your Supabase SQL editor

5. Start development servers:
   ```bash
   # Terminal 1 - Frontend
   cd frontend && npm run dev

   # Terminal 2 - Backend
   cd backend && npm run dev
   ```

## Tech Stack

- **Frontend:** Next.js 14+, TypeScript, Tailwind CSS, Recharts
- **Backend:** Express, TypeScript, Supabase, Gemini API
- **Database:** Supabase (PostgreSQL)
- **Auth:** World ID (MiniKit)

## License

MIT
