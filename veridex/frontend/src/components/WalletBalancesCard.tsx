'use client';

import { useEffect, useMemo, useState } from 'react';
import GlassCard from './GlassCard';
import LoadingSpinner from './LoadingSpinner';
import { createWalletChallenge, getWalletBalances, resolveWalletTokens, verifyWalletSignature } from '@/lib/api';
import { connectInjectedWallet, signWalletMessage } from '@/lib/wallet';
import { colors, gradientText, sectionLabel, textMuted, textSecondary } from '@/lib/styles';
import type { TokenBalance, User, WalletBalancesResponse } from '@/types';

const WATCHLIST_STORAGE_PREFIX = 'veridex_wallet_watchlist_';

interface WalletBalancesCardProps {
  token: string | null;
  user: User;
  onUserUpdated: (user: User) => void;
}

function getStorageKey(userId: string) {
  return `${WATCHLIST_STORAGE_PREFIX}${userId}`;
}

function shortenAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatBalance(value: string | null, digits = 4) {
  if (!value) return '0';

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  if (numeric === 0) {
    return '0';
  }

  if (numeric < 0.0001) {
    return '<0.0001';
  }

  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export default function WalletBalancesCard({ token, user, onUserUpdated }: WalletBalancesCardProps) {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [balances, setBalances] = useState<WalletBalancesResponse | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey(user.id));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWatchlist(parsed.filter((item): item is string => typeof item === 'string'));
        }
      } catch {
        localStorage.removeItem(getStorageKey(user.id));
      }
    }
    setIsHydrated(true);
  }, [user.id]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(watchlist));
  }, [isHydrated, user.id, watchlist]);

  const loadBalances = async (
    trackedTokens: string[] = watchlist,
    walletAddressOverride?: string
  ) => {
    const effectiveWalletAddress = walletAddressOverride || user.wallet_address;
    if (!token || !effectiveWalletAddress) return;

    setIsLoadingBalances(true);
    setError(null);
    try {
      const result = await getWalletBalances(token, {
        tokens: trackedTokens,
        includeNative: true,
      });
      setBalances(result);
      onUserUpdated({
        ...user,
        wallet_last_balance_sync_at: result.fetched_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load on-chain balances');
    } finally {
      setIsLoadingBalances(false);
    }
  };

  useEffect(() => {
    if (!isHydrated || !user.wallet_address || !token) return;
    loadBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, user.wallet_address, token]);

  const handleConnectWallet = async () => {
    if (!token) return;

    setIsConnecting(true);
    setError(null);

    try {
      const { address } = await connectInjectedWallet();
      const challenge = await createWalletChallenge(address, token);
      const signed = await signWalletMessage(challenge.challenge);

      if (signed.address.toLowerCase() !== address.toLowerCase()) {
        throw new Error('The connected wallet changed during signing. Please try again.');
      }

      const result = await verifyWalletSignature({
        wallet_address: address,
        message: challenge.challenge,
        signature: signed.signature,
        nonce: challenge.nonce,
      }, token);

      onUserUpdated(result.user);
      setBalances(null);
      await loadBalances(watchlist, result.wallet_address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAddToken = async () => {
    if (!token) return;
    const trimmed = newTokenAddress.trim();
    if (!trimmed) return;

    setIsAddingToken(true);
    setError(null);

    try {
      const response = await resolveWalletTokens([trimmed], token);
      const resolved = response.tokens[0];
      if (!resolved?.is_valid) {
        throw new Error(resolved?.error || 'Invalid ERC-20 token contract');
      }

      const nextWatchlist = Array.from(new Set([...watchlist, resolved.token_address])).slice(0, 25);
      setWatchlist(nextWatchlist);
      setNewTokenAddress('');
      await loadBalances(nextWatchlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add token');
    } finally {
      setIsAddingToken(false);
    }
  };

  const handleRemoveToken = async (tokenAddress: string) => {
    const nextWatchlist = watchlist.filter((item) => item !== tokenAddress);
    setWatchlist(nextWatchlist);
    if (user.wallet_address && token) {
      await loadBalances(nextWatchlist);
    }
  };

  const tokenRows = useMemo(() => balances?.tokens || [], [balances]);

  return (
    <GlassCard style={{ padding: '28px' }}>
      <span style={sectionLabel}>On-chain Balances</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: '26px',
              fontWeight: 700,
              ...gradientText,
              marginBottom: '4px',
            }}
          >
            World Chain
          </div>
          <p style={textSecondary}>
            {user.wallet_address
              ? `Connected Wallet: ${shortenAddress(user.wallet_address)}`
              : 'Connect wallet to view real World Chain balances.'}
          </p>
          {user.wallet_verified_at && (
            <p style={{ ...textMuted, marginTop: '6px' }}>
              Verified {new Date(user.wallet_verified_at).toLocaleString()}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
          {user.wallet_address && (
            <button
              onClick={() => loadBalances()}
              className="btn-secondary"
              style={{ padding: '10px 16px' }}
              disabled={isLoadingBalances}
            >
              {isLoadingBalances ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
          <button
            onClick={handleConnectWallet}
            className="btn-primary"
            style={{ padding: '10px 16px' }}
            disabled={isConnecting || !token}
          >
            {isConnecting
              ? 'Connecting...'
              : user.wallet_address
                ? 'Reconnect Wallet'
                : 'Connect Wallet'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(244,63,94,0.2)',
            background: 'rgba(244,63,94,0.08)',
            color: colors.rose,
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {!user.wallet_address && (
        <div
          style={{
            borderRadius: '14px',
            padding: '18px',
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(37,99,235,0.14)',
          }}
        >
          <p style={textSecondary}>
            Veridex will verify wallet ownership with a signed message, then read your on-chain native and ERC-20 balances through backend-owned World Chain RPC.
          </p>
        </div>
      )}

      {user.wallet_address && (
        <>
          <div
            style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="Add ERC-20 contract address"
              value={newTokenAddress}
              onChange={(event) => setNewTokenAddress(event.target.value)}
              className="input"
              style={{ flex: '1 1 280px' }}
            />
            <button
              onClick={handleAddToken}
              className="btn-secondary"
              style={{ padding: '10px 16px' }}
              disabled={isAddingToken || !newTokenAddress.trim()}
            >
              {isAddingToken ? 'Validating...' : 'Add Token'}
            </button>
          </div>

          {isLoadingBalances && !balances ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.textSecondary }}>
              <LoadingSpinner />
              <span>Loading on-chain balances…</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {balances?.native_balance && (
                <div
                  style={{
                    borderRadius: '14px',
                    padding: '18px',
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(37,99,235,0.14)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>Native Balance</div>
                      <div style={textMuted}>World Chain gas token</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                        {formatBalance(balances.native_balance.formatted_balance)} {balances.native_balance.symbol}
                      </div>
                      <div style={textMuted}>{balances.native_balance.raw_balance} wei</div>
                    </div>
                  </div>
                </div>
              )}

              {tokenRows.length === 0 && (
                <div
                  style={{
                    borderRadius: '14px',
                    padding: '18px',
                    background: 'rgba(255,255,255,0.42)',
                    border: '1px dashed rgba(37,99,235,0.16)',
                    color: colors.textSecondary,
                  }}
                >
                  No ERC-20 watchlist tokens yet. Add any World Chain token contract address to track it here.
                </div>
              )}

              {tokenRows.map((tokenRow: TokenBalance) => (
                <div
                  key={tokenRow.token_address}
                  style={{
                    borderRadius: '14px',
                    padding: '18px',
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(37,99,235,0.14)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                        {tokenRow.symbol} {!tokenRow.is_valid && <span style={{ color: colors.rose }}>(Invalid)</span>}
                      </div>
                      <div style={textMuted}>{tokenRow.name}</div>
                      <div style={{ ...textMuted, marginTop: '4px' }}>{tokenRow.token_address}</div>
                      {tokenRow.error && (
                        <div style={{ ...textMuted, color: colors.rose, marginTop: '6px' }}>{tokenRow.error}</div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>
                        {tokenRow.formatted_balance !== null ? `${formatBalance(tokenRow.formatted_balance)} ${tokenRow.symbol}` : 'Unavailable'}
                      </div>
                      <button
                        onClick={() => handleRemoveToken(tokenRow.token_address)}
                        style={{
                          marginTop: '8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: colors.textTertiary,
                          fontSize: '13px',
                          padding: 0,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {balances?.fetched_at && (
                <p style={textMuted}>Last synced {new Date(balances.fetched_at).toLocaleString()}</p>
              )}
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
