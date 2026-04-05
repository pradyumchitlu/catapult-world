'use client';

import { useEffect, useState } from 'react';
import GlassCard from './GlassCard';
import LoadingSpinner from './LoadingSpinner';
import { createWalletChallenge, getWalletBalances, verifyWalletSignature } from '@/lib/api';
import { connectInjectedWallet, signWalletMessage } from '@/lib/wallet';
import { colors, gradientText, sectionLabel, textMuted, textSecondary } from '@/lib/styles';
import type { User, WalletBalancesResponse } from '@/types';
import { useMiniApp } from '@/contexts/MiniAppContext';
import { linkWorldWalletWithMiniKit } from '@/lib/minikit';

interface WalletBalancesCardProps {
  token: string | null;
  user: User;
  onUserUpdated: (user: User) => void;
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
  const { isInWorldApp, isMiniKitReady } = useMiniApp();
  const isWorldWalletLinked = user.wallet_verification_method === 'world_app_wallet_auth';
  const showWalletAction = !user.wallet_address || !isWorldWalletLinked;
  const [balances, setBalances] = useState<WalletBalancesResponse | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalances = async (walletAddressOverride?: string) => {
    const effectiveWalletAddress = walletAddressOverride || user.wallet_address;
    if (!token || !effectiveWalletAddress) return;

    setIsLoadingBalances(true);
    setError(null);
    try {
      const result = await getWalletBalances(token, {
        includeNative: true,
      });
      setBalances(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load on-chain balances');
    } finally {
      setIsLoadingBalances(false);
    }
  };

  useEffect(() => {
    if (!user.wallet_address || !token) return;
    loadBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.wallet_address, token]);

  const handleConnectWallet = async () => {
    if (!token) return;

    setIsConnecting(true);
    setError(null);

    try {
      if (isInWorldApp && isMiniKitReady) {
        const result = await linkWorldWalletWithMiniKit(token);
        onUserUpdated(result.user);
        setBalances(null);
        await loadBalances(result.wallet_address);
        return;
      }

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
      await loadBalances(result.wallet_address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <GlassCard style={{ padding: '28px' }}>
      <span style={sectionLabel}>Wallet Balance</span>
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
              ? isWorldWalletLinked
                ? `World Wallet: ${shortenAddress(user.wallet_address)}`
                : `Connected Wallet: ${shortenAddress(user.wallet_address)}`
              : isInWorldApp && isMiniKitReady
                ? 'Your World wallet can be linked natively for balances, staking, and payouts.'
                : 'Connect wallet to view real World Chain balances.'}
          </p>
          {user.wallet_verified_at && (
            <p style={{ ...textMuted, marginTop: '6px' }}>
              {isWorldWalletLinked ? 'Linked via World App Wallet Auth' : 'Verified'} {new Date(user.wallet_verified_at).toLocaleString()}
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
          {showWalletAction && (
            <button
              onClick={handleConnectWallet}
              className="btn-primary"
              style={{ padding: '10px 16px' }}
              disabled={isConnecting || !token}
            >
              {isConnecting
                ? 'Connecting...'
                : user.wallet_address
                  ? isInWorldApp && isMiniKitReady
                    ? 'Link World Wallet'
                    : 'Reconnect Wallet'
                  : isInWorldApp && isMiniKitReady
                    ? 'Link World Wallet'
                    : 'Connect Wallet'}
            </button>
          )}
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
            {isInWorldApp && isMiniKitReady
              ? 'After World ID verification, Veridex can link your World wallet through World App Wallet Auth and use it as your native balance and payout address on World Chain.'
              : 'Veridex will verify wallet ownership with a signed message, then read your native ETH balance on World Chain through backend-owned RPC.'}
          </p>
        </div>
      )}

      {user.wallet_address && (
        <>
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
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>Linked Wallet ETH</div>
                      <div style={textMuted}>{shortenAddress(balances.wallet_address)} on {balances.chain_name}</div>
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
