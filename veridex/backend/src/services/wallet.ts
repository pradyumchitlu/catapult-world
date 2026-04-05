import crypto from 'crypto';
import { Contract, JsonRpcProvider, ethers } from 'ethers';
import supabase from '../lib/supabase';
import { getChainConfig } from '../lib/chainConfig';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_TRACKED_TOKENS = 25;

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
] as const;

export interface WalletChallenge {
  challenge: string;
  nonce: string;
  expires_at: string;
}

export interface WalletInfo {
  wallet_address: string | null;
  wallet_verified_at: string | null;
  wallet_verification_method: string | null;
  wallet_last_balance_sync_at: string | null;
}

export interface ResolvedToken {
  token_address: string;
  symbol: string;
  name: string;
  decimals: number | null;
  is_valid: boolean;
  error?: string;
}

export interface TokenBalance extends ResolvedToken {
  raw_balance: string | null;
  formatted_balance: string | null;
}

export interface WalletBalancesResponse {
  wallet_address: string;
  chain_id: number;
  chain_name: string;
  native_balance: {
    symbol: string;
    decimals: number;
    raw_balance: string;
    formatted_balance: string;
  } | null;
  tokens: TokenBalance[];
  fetched_at: string;
}

interface WalletChallengeRow {
  id: string;
  user_id: string;
  wallet_address: string;
  nonce: string;
  challenge: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

let provider: JsonRpcProvider | null = null;
const tokenMetadataCache = new Map<string, ResolvedToken>();

export function getWorldChainMetadata() {
  const chain = getChainConfig();
  return {
    chainId: chain.chainId,
    name: chain.name,
    nativeCurrency: {
      symbol: chain.nativeSymbol,
      decimals: 18,
    },
    rpcUrl: chain.rpcUrl,
    blockExplorerUrl: chain.blockExplorerUrl,
  };
}

function getProvider(): JsonRpcProvider {
  if (!provider) {
    const chain = getChainConfig();
    provider = new JsonRpcProvider(chain.rpcUrl, chain.chainId, {
      staticNetwork: true,
    });
  }
  return provider;
}

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 12000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function normalizeAddress(address: string): string {
  return ethers.getAddress(address);
}

export function parseTrackedTokenAddresses(value: string[] | string | undefined | null): string[] {
  const rawTokens = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map((token) => token.trim())
      : [];

  const normalized = new Set<string>();
  for (const token of rawTokens) {
    if (!token) continue;
    if (!isValidAddress(token)) {
      throw new Error(`Invalid token address: ${token}`);
    }
    normalized.add(normalizeAddress(token));
  }

  return [...normalized].slice(0, MAX_TRACKED_TOKENS);
}

function buildChallenge(address: string, nonce: string, issuedAt: string, expiresAt: string): string {
  return [
    'Veridex Wallet Verification',
    '',
    'Sign this message to connect your wallet to your Veridex account.',
    'This does not trigger a blockchain transaction or cost gas.',
    '',
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expires At: ${expiresAt}`,
    '',
    'By signing, you prove you control this wallet address for read-only World Chain balance lookups.',
  ].join('\n');
}

export async function createWalletChallenge(userId: string, walletAddress: string): Promise<WalletChallenge> {
  const normalizedAddress = normalizeAddress(walletAddress);
  const nonce = crypto.randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const challenge = buildChallenge(normalizedAddress, nonce, issuedAt, expiresAt);

  await supabase
    .from('wallet_verification_challenges')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null);

  const { error } = await supabase
    .from('wallet_verification_challenges')
    .insert({
      user_id: userId,
      wallet_address: normalizedAddress,
      nonce,
      challenge,
      expires_at: expiresAt,
    });

  if (error) {
    throw error;
  }

  return {
    challenge,
    nonce,
    expires_at: expiresAt,
  };
}

export async function verifyWalletChallenge(params: {
  userId: string;
  walletAddress: string;
  nonce: string;
  message: string;
  signature: string;
}) {
  const normalizedAddress = normalizeAddress(params.walletAddress);

  const { data: challengeRow, error } = await supabase
    .from('wallet_verification_challenges')
    .select('*')
    .eq('user_id', params.userId)
    .eq('wallet_address', normalizedAddress)
    .eq('nonce', params.nonce)
    .is('used_at', null)
    .single();

  if (error || !challengeRow) {
    throw new Error('Wallet challenge not found or already used');
  }

  const typedChallenge = challengeRow as WalletChallengeRow;

  if (typedChallenge.challenge !== params.message) {
    throw new Error('Wallet challenge mismatch');
  }

  if (new Date(typedChallenge.expires_at).getTime() < Date.now()) {
    throw new Error('Wallet challenge expired');
  }

  const recoveredAddress = normalizeAddress(ethers.verifyMessage(params.message, params.signature));
  if (recoveredAddress !== normalizedAddress) {
    throw new Error('Wallet signature does not match the provided address');
  }

  const now = new Date().toISOString();

  const { data: updatedUser, error: userError } = await supabase
    .from('users')
    .update({
      wallet_address: normalizedAddress,
      wallet_verified_at: now,
      wallet_verification_method: 'signature',
    })
    .eq('id', params.userId)
    .select('*')
    .single();

  if (userError || !updatedUser) {
    throw userError || new Error('Failed to persist wallet verification');
  }

  await supabase
    .from('wallet_verification_challenges')
    .update({ used_at: now })
    .eq('id', typedChallenge.id);

  return {
    wallet_address: normalizedAddress,
    verified_at: now,
    user: updatedUser,
  };
}

export function getWalletInfo(user: Record<string, any>): WalletInfo {
  return {
    wallet_address: user.wallet_address || null,
    wallet_verified_at: user.wallet_verified_at || null,
    wallet_verification_method: user.wallet_verification_method || null,
    wallet_last_balance_sync_at: user.wallet_last_balance_sync_at || null,
  };
}

async function resolveTokenMetadata(tokenAddress: string): Promise<ResolvedToken> {
  const normalizedAddress = normalizeAddress(tokenAddress);
  const cached = tokenMetadataCache.get(normalizedAddress);
  if (cached) {
    return cached;
  }

  const contract = new Contract(normalizedAddress, ERC20_ABI, getProvider());

  try {
    const [symbolResult, nameResult, decimalsResult] = await Promise.allSettled([
      withTimeout<string>(contract.symbol(), `symbol(${normalizedAddress})`),
      withTimeout<string>(contract.name(), `name(${normalizedAddress})`),
      withTimeout<number>(contract.decimals(), `decimals(${normalizedAddress})`),
    ]);

    const decimals = decimalsResult.status === 'fulfilled' ? Number(decimalsResult.value) : null;

    if (decimals === null || Number.isNaN(decimals)) {
      const invalid: ResolvedToken = {
        token_address: normalizedAddress,
        symbol: shortenAddress(normalizedAddress),
        name: shortenAddress(normalizedAddress),
        decimals: null,
        is_valid: false,
        error: 'Token contract is missing a valid decimals() response',
      };
      tokenMetadataCache.set(normalizedAddress, invalid);
      return invalid;
    }

    const token: ResolvedToken = {
      token_address: normalizedAddress,
      symbol: symbolResult.status === 'fulfilled' && symbolResult.value
        ? symbolResult.value
        : shortenAddress(normalizedAddress),
      name: nameResult.status === 'fulfilled' && nameResult.value
        ? nameResult.value
        : shortenAddress(normalizedAddress),
      decimals,
      is_valid: true,
    };

    tokenMetadataCache.set(normalizedAddress, token);
    return token;
  } catch (error) {
    return {
      token_address: normalizedAddress,
      symbol: shortenAddress(normalizedAddress),
      name: shortenAddress(normalizedAddress),
      decimals: null,
      is_valid: false,
      error: error instanceof Error ? error.message : 'Failed to resolve token metadata',
    };
  }
}

function shortenAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function resolveTrackedTokens(tokenAddresses: string[]) {
  const normalized = parseTrackedTokenAddresses(tokenAddresses);
  return Promise.all(normalized.map((tokenAddress) => resolveTokenMetadata(tokenAddress)));
}

export async function getWalletBalances(
  userId: string,
  walletAddress: string,
  tokenAddresses: string[],
  includeNative: boolean
): Promise<WalletBalancesResponse> {
  const normalizedAddress = normalizeAddress(walletAddress);
  const normalizedTokens = parseTrackedTokenAddresses(tokenAddresses);
  const resolvedTokens = await resolveTrackedTokens(normalizedTokens);

  const nativeBalancePromise = includeNative
    ? withTimeout(getProvider().getBalance(normalizedAddress), 'native balance')
    : Promise.resolve(null);

  const tokenBalancePromises = resolvedTokens.map(async (token): Promise<TokenBalance> => {
    if (!token.is_valid || token.decimals === null) {
      return {
        ...token,
        raw_balance: null,
        formatted_balance: null,
      };
    }

    try {
      const contract = new Contract(token.token_address, ERC20_ABI, getProvider());
      const rawBalance = await withTimeout<bigint>(
        contract.balanceOf(normalizedAddress),
        `balanceOf(${token.token_address})`
      );

      return {
        ...token,
        raw_balance: rawBalance.toString(),
        formatted_balance: ethers.formatUnits(rawBalance, token.decimals),
      };
    } catch (error) {
      return {
        ...token,
        raw_balance: null,
        formatted_balance: null,
        is_valid: false,
        error: error instanceof Error ? error.message : 'Failed to fetch token balance',
      };
    }
  });

  const [nativeBalanceRaw, tokenBalances] = await Promise.all([
    nativeBalancePromise,
    Promise.all(tokenBalancePromises),
  ]);

  const fetchedAt = new Date().toISOString();
  const chain = getChainConfig();

  await supabase
    .from('users')
    .update({ wallet_last_balance_sync_at: fetchedAt })
    .eq('id', userId);

  return {
    wallet_address: normalizedAddress,
    chain_id: chain.chainId,
    chain_name: chain.name,
    native_balance: nativeBalanceRaw !== null
      ? {
          symbol: chain.nativeSymbol,
          decimals: 18,
          raw_balance: nativeBalanceRaw.toString(),
          formatted_balance: ethers.formatEther(nativeBalanceRaw),
        }
      : null,
    tokens: tokenBalances,
    fetched_at: fetchedAt,
  };
}
