# Player Four (Akhil) — Work Log

This document covers all changes made by Player 4 (Akhil) on the `akhil` branch, including the full context behind each decision.

---

## Overview

Player 4's scope covers two major workstreams:

1. **Staking system** — making staking work end-to-end with real ETH via MetaMask (replacing the internal WLD credit system)
2. **MetaMask wallet onboarding** — adding a wallet connection step to the onboarding flow so users can link their MetaMask wallet during signup

Additionally, all WLD/Worldcoin branding was removed from the site (replaced with ETH and Veridex).

---

## Phase 1: Merge Main into Akhil Branch

Before starting new work, we pulled all updates from `main` into the `akhil` branch. Main had received 8 commits from other team members containing:

- Evidence extraction pipeline (LinkedIn PDF parsing, supporting docs, portfolio/project URLs)
- Contract system (employer creates contract, activates with buy-in, completes with payment distribution)
- Wallet infrastructure (challenge/verify, balance reading, World Chain RPC)
- 6-factor scoring system (identity_assurance 10%, evidence_depth 10%, consistency 10%, recency 5%, employer_outcomes 25%, staking 40%)
- Full UI overhaul (glass card design, bento layout, new browse/dashboard/agents pages)

### Merge Conflicts Resolved
- 6 files conflicted. Took main's version for UI pages (browse, dashboard, agents) and package-lock. Kept both sides for `types/index.ts` and `package.json`.
- Pre-existing TS error in `agents/page.tsx` from merge (AgentWithParent missing new credential fields) — left as-is since it wasn't caused by our changes.

---

## Phase 2: MetaMask Wallet Onboarding Step

### What Changed
Added a new step to the onboarding flow (step 3, right after Profession) where users connect their MetaMask wallet.

### File Modified
- `frontend/src/app/onboarding/page.tsx`

### Details
- Updated `STEPS` array from `['Profile', 'Profession', 'Connect', 'Evidence']` to `['Profile', 'Profession', 'Wallet', 'Connect', 'Evidence']`
- Added wallet state variables: `walletConnected`, `walletConnecting`, `walletError`, `walletAddress`
- Added `handleConnectWallet` handler that:
  1. Calls `connectInjectedWallet()` to open MetaMask
  2. Gets a challenge from backend via `createWalletChallenge(address, token)`
  3. Signs the challenge via `signWalletMessage(challenge.challenge)`
  4. Verifies ownership via `verifyWalletSignature(...)` — backend recovers address from signature
  5. Updates local user state with verified wallet address
- Added wallet step UI with "Connect Wallet" button, connected state display, and "Skip for now" option
- Bumped old step 3 (GitHub Connect) to step 4, old step 4 (Evidence) to step 5
- Updated `OnboardingDraft` interface and sessionStorage persistence to include wallet state
- Hydrates wallet state from `user.wallet_address` on mount

### Existing Infrastructure Reused (no backend changes needed)
- `frontend/src/lib/wallet.ts` — `connectInjectedWallet()`, `signWalletMessage()`
- `frontend/src/lib/api.ts` — `createWalletChallenge()`, `verifyWalletSignature()`
- `backend/src/routes/auth.ts` — `POST /api/auth/wallet/challenge`, `POST /api/auth/wallet/verify`

### Bug Fix
- Initially used `challenge.message` but the API returns `challenge.challenge` — fixed the TypeScript error.

---

## Phase 3: End-to-End Staking with Real ETH

### Context
The original staking system used fake internal "WLD credits" (`users.wld_balance INTEGER DEFAULT 1000`). Every new user got 1000 credits. Staking deducted from this balance. This was a placeholder.

We replaced this with **real ETH staking on World Chain** — users transfer ETH to a platform-controlled wallet via MetaMask, the backend verifies the transaction on-chain, and withdrawals send ETH back from the platform wallet.

### Key Design Decision
No staking smart contract exists. Staking is tracked in the database but uses real on-chain ETH transfers to/from a platform hot wallet. On-chain escrow via smart contract is a future phase.

---

### 3A. Platform Hot Wallet

**New file:** `backend/src/services/platformWallet.ts`

Generated a new Ethereum wallet using `ethers.Wallet.createRandom()`. Stored address and private key in `backend/.env.local`:
- `PLATFORM_WALLET_ADDRESS`
- `PLATFORM_WALLET_PRIVATE_KEY`

The service exports:
- `getPlatformWallet()` — returns an ethers `Wallet` connected to World Chain RPC
- `getPlatformAddress()` — returns the platform address from env
- `sendETH(to, amountWei)` — sends ETH from platform wallet (used for withdrawals)

---

### 3B. Backend Stake Routes Rewrite

**File:** `backend/src/routes/stake.ts` — completely rewritten

#### New endpoint: `GET /api/stake/platform-address`
Returns the platform wallet address so the frontend knows where to send ETH.

#### Updated: `POST /api/stake`
Old flow: check `wld_balance` → deduct credits → insert stake
New flow:
1. Verify staker has a connected wallet (`user.wallet_address` must be set)
2. Accept `tx_hash` in request body (frontend sends this after MetaMask transfer)
3. Verify the transaction on-chain:
   - Fetch tx receipt, confirm `status === 1`
   - Confirm `tx.to` matches platform wallet address
   - Confirm `tx.from` matches staker's wallet address
   - Confirm `tx.value >= stated stake amount`
4. Check for duplicate `tx_hash` (prevent double-staking same transaction)
5. Insert stake record with `tx_hash`, `amount_wei`, `amount_eth`
6. Trigger `syncWorkerReputation()` to recompute staking score

#### Updated: `POST /api/stake/withdraw`
Old flow: return credits to `wld_balance`
New flow:
1. Look up stake, verify ownership
2. Send ETH back to staker's wallet via `sendETH()`
3. Store `withdrawal_tx_hash` on stake record
4. Mark stake as withdrawn
5. Trigger score recomputation

---

### 3C. Database Schema Updates

**File:** `supabase/schema.sql`

Stakes table — added columns:
- `amount_wei TEXT` — precise wei amount as string
- `amount_eth NUMERIC` — human-readable ETH amount
- `tx_hash TEXT` — deposit transaction hash
- `withdrawal_tx_hash TEXT` — withdrawal transaction hash

Users table:
- Removed `wld_balance INTEGER DEFAULT 1000` (the internal credits column)

---

### 3D. Frontend Staking with MetaMask

**New function in `frontend/src/lib/wallet.ts`:**
```typescript
sendETHToAddress(to: string, amountETH: string): Promise<{ txHash: string }>
```
Uses MetaMask's `signer.sendTransaction()` to send ETH, waits for confirmation.

**Updated `frontend/src/lib/api.ts`:**
- Added `getPlatformAddress()` — fetches platform wallet address
- Updated `createStake()` — now accepts `tx_hash` parameter

**Rewritten `frontend/src/components/StakeButton.tsx`:**
- Imports `useAuth`, `sendETHToAddress`, `createStake`, `getPlatformAddress`
- Full flow: get platform address → MetaMask transfer → verify on-chain → record stake
- Shows wallet requirement if user hasn't connected MetaMask
- Shows step-by-step status messages during staking ("Getting platform address...", "Confirm in MetaMask...", "Verifying on-chain...")
- Preset amounts changed from [50, 100, 250, 500] WLD to [0.005, 0.01, 0.05, 0.1] ETH

**Rewritten `frontend/src/app/staker/page.tsx`:**
- Removed all hardcoded mock data (fake "Alice Developer" stake, fake balances)
- Wired to real `getStakes(userId, token)` API
- Shows on-chain wallet ETH balance via `getWalletBalances()`
- All "WLD" labels replaced with "ETH"

---

### 3E. Removed wld_balance from All Backend Files

**`backend/src/routes/auth.ts`:**
- Removed `wld_balance: 1000` from new user creation

**`backend/src/routes/contract.ts`:**
- Removed employer `wld_balance` checks and escrow deductions from contract creation/activation
- Added comment: "On-chain escrow for contract payments is a future feature"

**`backend/src/services/contractPayment.ts`:**
- Removed all `wld_balance` credit transfers (worker payout, staker shares)
- Kept payment ledger recording (contract_payments table) for audit trail
- Buy-in calculation logic preserved (still calculates staker reward based on total staked)

**`backend/src/services/agent.ts`:**
- Removed `wld_balance` deduction for agent stake collateral
- Agent staking will be a future feature

**`backend/src/routes/review.ts`:**
- Removed `wld_balance` check and deduction for review stakes
- `stake_amount` field kept on reviews (used for scoring weight)

---

## Phase 4: Remove All WLD/Worldcoin References

### Scope
~200+ references across 32+ files

### What Was Replaced

| Old | New | Scope |
|-----|-----|-------|
| `worldcoin-gray-*` (CSS classes) | `veridex-gray-*` | 7 component files, ~37 occurrences |
| `WLD` (currency text in UI) | `ETH` | 15+ frontend files, ~100 occurrences |
| `wld_balance` (mock data) | Removed | 5 files with hardcoded mock objects |
| `wld_balance` (display) | Replaced with trust score or removed | Navbar, dashboard, employer page |
| `worldcoin` (Tailwind config) | `veridex` | `tailwind.config.js` color palette key |
| `WLD` (backend comments/errors) | `ETH` or removed | agent.ts, review.ts, gemini.ts, stake.ts |

### What Was Preserved (NOT removed)
- `World ID` — actual auth protocol name
- `world_id_hash` — database column for World ID verification
- `@worldcoin/idkit-server` — npm package for World ID
- World Chain RPC URLs — actual blockchain name
- `WorldIDButton.tsx` — component for World ID auth flow

---

## Frontend Types Updated

**`frontend/src/types/index.ts`:**
- `User.wld_balance` marked as optional/deprecated
- `Stake` interface: added `amount_wei?: string`, `amount_eth?: number`, `tx_hash?: string`, `withdrawal_tx_hash?: string`

---

## Files Modified (Complete List)

### New Files
| File | Purpose |
|------|---------|
| `backend/src/services/platformWallet.ts` | Hot wallet signer for receiving stakes and sending withdrawals |

### Backend
| File | Changes |
|------|---------|
| `backend/.env.local` | Added PLATFORM_WALLET_ADDRESS, PLATFORM_WALLET_PRIVATE_KEY |
| `backend/src/routes/stake.ts` | Complete rewrite — on-chain TX verification, ETH withdrawal, platform address endpoint |
| `backend/src/routes/auth.ts` | Removed wld_balance from user creation |
| `backend/src/routes/contract.ts` | Removed wld_balance checks/escrow |
| `backend/src/routes/review.ts` | Removed wld_balance check/deduction for review stakes |
| `backend/src/services/contractPayment.ts` | Removed wld_balance credit transfers, kept ledger recording |
| `backend/src/services/agent.ts` | Removed wld_balance deduction for agent stakes |
| `backend/src/services/gemini.ts` | WLD → ETH in chatbot prompt text |
| `backend/src/__tests__/fixtures.ts` | Removed wld_balance from test fixtures |
| `backend/src/__tests__/services/agent.test.ts` | Updated tests for no-balance-check agent staking |
| `backend/src/__tests__/routes/agent.test.ts` | Removed wld_balance mock responses |

### Frontend
| File | Changes |
|------|---------|
| `frontend/src/app/onboarding/page.tsx` | Added wallet step (step 3), bumped subsequent steps |
| `frontend/src/lib/wallet.ts` | Added sendETHToAddress() |
| `frontend/src/lib/api.ts` | Added getPlatformAddress(), updated createStake() with tx_hash |
| `frontend/src/types/index.ts` | Deprecated wld_balance, added Stake tx fields |
| `frontend/src/components/StakeButton.tsx` | Complete rewrite — MetaMask ETH transfer flow |
| `frontend/src/app/staker/page.tsx` | Complete rewrite — real API, on-chain balance |
| `frontend/src/components/Navbar.tsx` | Replaced credits display with user display name |
| `frontend/src/app/dashboard/page.tsx` | Replaced wld_balance with trust score |
| `frontend/src/app/employer/page.tsx` | Removed balance display and new_balance update |
| `frontend/tailwind.config.js` | Renamed worldcoin → veridex color palette |
| 7 component files | worldcoin-gray → veridex-gray CSS classes |
| 15+ files | WLD → ETH currency text |
| 4 files | Removed wld_balance from mock data objects |

### Schema
| File | Changes |
|------|---------|
| `supabase/schema.sql` | Added tx_hash columns to stakes, removed wld_balance from users |

---

## Scoring System Context

The 6-factor scoring system was already implemented by another team member on `main`. Player 4's staking work feeds into the `staking` factor (40% weight).

**Formula:**
```
overall = 0.10 * identity_assurance
        + 0.10 * evidence_depth
        + 0.10 * consistency
        + 0.05 * recency
        + 0.25 * employer_outcomes
        + 0.40 * staking
```

**Staking score calculation** (in `backend/src/services/scoring.ts`):
```
effectiveStake = applyStakeTranches(rawAmount) * max(stakerVeridexScore / 100, 0.10)
```
- Tranches: first 100 at 100%, next 100 at 50%, remaining at 25%
- Normalized to 0-100 (500 effective = 100)
- Staker's own trust score weights their stake

The `syncWorkerReputation()` function (called after every stake/withdrawal) loads all active stakes, computes the staking factor, and updates the worker's `overall_trust_score`.

---

## How to Test

1. Start backend (`cd veridex/backend && npm run dev`) and frontend (`cd veridex/frontend && npm run dev`)
2. Create a new user via World ID → go through onboarding
3. At step 3 (Wallet), click "Connect Wallet" → MetaMask popup → sign challenge → wallet verified
4. Continue through GitHub connect and evidence steps
5. Navigate to a worker profile, click "Stake ETH"
6. MetaMask opens with ETH transfer to platform address → confirm transaction
7. Backend verifies tx on-chain → stake recorded in DB
8. Check staker page (`/staker`) — shows real stake data from API
9. Verify `worker_profiles.score_components.staking` updated after stake
10. Test withdrawal — ETH returns to user's wallet

---

## DB Migration (for existing databases)

If the database already exists, run this migration:

```sql
-- Add new columns to stakes
ALTER TABLE stakes ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE stakes ADD COLUMN IF NOT EXISTS withdrawal_tx_hash TEXT;
ALTER TABLE stakes ADD COLUMN IF NOT EXISTS amount_wei TEXT;
ALTER TABLE stakes ADD COLUMN IF NOT EXISTS amount_eth NUMERIC;

-- Optionally drop wld_balance (or leave as deprecated)
-- ALTER TABLE users DROP COLUMN IF EXISTS wld_balance;
```

---

## What's Deferred (Future Work)

1. **On-chain staking smart contract** — currently DB-tracked with real ETH transfers to a hot wallet. A proper staking contract would add trustless escrow.
2. **On-chain contract payments** — employer buy-in/escrow currently just records to DB. On-chain settlement needed.
3. **Agent staking with ETH** — agent collateral currently stored as DB integer, not backed by real ETH.
4. **Review staking with ETH** — review stake_amount is still a DB integer, not backed by real ETH.
5. **Yield calculation** — `yield_earned` is still a placeholder (returns 0). Needs score-history tracking to compute real yield.
6. **7-day lock period** — withdrawal lock period code is commented out, needs enabling.
