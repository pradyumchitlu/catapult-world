'use client';

import { MiniKit } from '@worldcoin/minikit-js';
import type {
  CommandResultByVia,
  MiniAppWalletAuthSuccessPayload,
  SendTransactionResult,
} from '@worldcoin/minikit-js/commands';
import { createPublicClient, http, parseEther, toHex } from 'viem';
import { worldchain, worldchainSepolia } from 'viem/chains';
import {
  loginWithWorldWallet,
  prepareWorldWalletAuth,
  prepareWorldWalletLogin,
  verifyWorldWalletAuth,
} from '@/lib/api';

const MINI_APP_ID =
  process.env.NEXT_PUBLIC_WORLD_MINI_APP_ID ||
  process.env.NEXT_PUBLIC_WORLD_APP_ID ||
  '';

const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN_ENV?.toLowerCase();
const WORLDCHAIN_RPC_URL =
  process.env.NEXT_PUBLIC_WORLDCHAIN_RPC_URL ||
  process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL ||
  (CHAIN_ENV === 'testnet'
    ? 'https://worldchain-sepolia.g.alchemy.com/public'
    : 'https://worldchain-mainnet.g.alchemy.com/public');

const WORLD_APP_API_BASE_URL = process.env.NEXT_PUBLIC_WORLD_APP_API_BASE_URL || undefined;

export function getMiniAppId() {
  return MINI_APP_ID;
}

export function getWorldAppApiBaseUrl() {
  return WORLD_APP_API_BASE_URL;
}

export function getWorldChain() {
  return CHAIN_ENV === 'testnet' ? worldchainSepolia : worldchain;
}

export function createWorldChainPublicClient() {
  return createPublicClient({
    chain: getWorldChain(),
    transport: http(WORLDCHAIN_RPC_URL),
  });
}

export function isMiniKitConfigured() {
  return Boolean(MINI_APP_ID);
}

export async function linkWorldWalletWithMiniKit(token: string) {
  if (!isMiniKitConfigured()) {
    throw new Error('World App staking is not configured yet. Add NEXT_PUBLIC_WORLD_MINI_APP_ID to the frontend environment.');
  }

  if (!MiniKit.isInstalled()) {
    throw new Error('Open Veridex inside World App to link your World wallet.');
  }

  const prepared = await prepareWorldWalletAuth(token);
  const result = await MiniKit.walletAuth({
    nonce: prepared.nonce,
    statement: prepared.statement,
    expirationTime: new Date(prepared.expires_at),
  });

  if (result.executedWith === 'fallback') {
    throw new Error('Wallet Auth is only available inside World App.');
  }

  return verifyWorldWalletAuth(
    {
      payload: result.data as MiniAppWalletAuthSuccessPayload,
      nonce: prepared.nonce,
      session_token: prepared.session_token,
    },
    token
  );
}

export async function loginWithMiniKitWorldWallet() {
  if (!isMiniKitConfigured()) {
    throw new Error('World App sign-in is not configured yet. Add NEXT_PUBLIC_WORLD_MINI_APP_ID to the frontend environment.');
  }

  if (!MiniKit.isInstalled()) {
    throw new Error('Open Veridex inside World App to sign in with your World wallet.');
  }

  const prepared = await prepareWorldWalletLogin();
  const result = await MiniKit.walletAuth({
    nonce: prepared.nonce,
    statement: prepared.statement,
    expirationTime: new Date(prepared.expires_at),
  });

  if (result.executedWith === 'fallback') {
    throw new Error('World App sign-in is only available inside World App.');
  }

  return loginWithWorldWallet({
    payload: result.data as MiniAppWalletAuthSuccessPayload,
    nonce: prepared.nonce,
    session_token: prepared.session_token,
  });
}

export async function sendMiniKitStakeTransaction(
  recipient: string,
  amountEth: string
): Promise<CommandResultByVia<SendTransactionResult>> {
  if (!MiniKit.isInstalled()) {
    throw new Error('Open Veridex inside World App to stake with your World wallet.');
  }

  return MiniKit.sendTransaction({
    chainId: getWorldChain().id,
    transactions: [
      {
        to: recipient,
        value: toHex(parseEther(amountEth)),
      },
    ],
  });
}
