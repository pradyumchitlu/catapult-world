'use client';

import { MiniKit } from '@worldcoin/minikit-js';
import type {
  CommandResultByVia,
  MiniAppWalletAuthSuccessPayload,
  SendTransactionResult,
} from '@worldcoin/minikit-js/commands';
import { createPublicClient, encodeFunctionData, http, parseEther, parseUnits, toHex } from 'viem';
import { worldchain, worldchainSepolia } from 'viem/chains';
import {
  loginWithWorldWallet,
  prepareWorldWalletAuth,
  prepareWorldWalletLogin,
  verifyWorldWalletAuth,
} from '@/lib/api';
import type { PaymentAsset } from '@/types';

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
const DEFAULT_WORLDCHAIN_ETH_FORWARDER_ADDRESS = '0x087d5449a126e4e439495fcBc62A853eB3257936';
const DEFAULT_WORLDCHAIN_WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const ETH_FORWARDER_ABI = [
  {
    name: 'pay',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'to',
        type: 'address',
      },
    ],
    outputs: [],
  },
] as const;
const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
  },
] as const;

export function getMiniAppId() {
  return MINI_APP_ID;
}

export function getWorldAppApiBaseUrl() {
  return WORLD_APP_API_BASE_URL;
}

export function getWorldChain() {
  return CHAIN_ENV === 'testnet' ? worldchainSepolia : worldchain;
}

export function getWorldChainEthForwarderAddress() {
  const configured =
    process.env.NEXT_PUBLIC_WORLDCHAIN_ETH_FORWARDER_ADDRESS ||
    process.env.NEXT_PUBLIC_WORLDCHAIN_FORWARDER_ADDRESS ||
    '';

  if (configured) {
    return configured;
  }

  if (CHAIN_ENV === 'testnet') {
    throw new Error(
      'NEXT_PUBLIC_WORLDCHAIN_ETH_FORWARDER_ADDRESS must be set for World Chain Sepolia MiniKit ETH transfers.'
    );
  }

  return DEFAULT_WORLDCHAIN_ETH_FORWARDER_ADDRESS;
}

export function getWorldChainWethAddress() {
  return (
    process.env.NEXT_PUBLIC_WORLDCHAIN_WETH_ADDRESS ||
    process.env.NEXT_PUBLIC_WORLD_CHAIN_WETH_ADDRESS ||
    process.env.NEXT_PUBLIC_WORLDCHAIN_WRAPPED_ETH_ADDRESS ||
    DEFAULT_WORLDCHAIN_WETH_ADDRESS
  );
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

  const forwarderAddress = getWorldChainEthForwarderAddress();

  return MiniKit.sendTransaction({
    chainId: getWorldChain().id,
    transactions: [
      {
        to: forwarderAddress,
        data: encodeFunctionData({
          abi: ETH_FORWARDER_ABI,
          functionName: 'pay',
          args: [recipient as `0x${string}`],
        }),
        value: toHex(parseEther(amountEth)),
      },
    ],
  });
}

export async function sendMiniKitAssetTransfers(
  transfers: Array<{ to: string; amountEth: string }>,
  asset: PaymentAsset = 'ETH'
): Promise<CommandResultByVia<SendTransactionResult>> {
  if (!MiniKit.isInstalled()) {
    throw new Error('Open Veridex inside World App to complete payouts with your World wallet.');
  }

  if (transfers.length === 0) {
    throw new Error('No payout transfers were prepared for this contract.');
  }

  if (asset === 'WETH') {
    const wethAddress = getWorldChainWethAddress();

    return MiniKit.sendTransaction({
      chainId: getWorldChain().id,
      transactions: transfers.map((transfer) => ({
        to: wethAddress,
        data: encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [transfer.to as `0x${string}`, parseUnits(transfer.amountEth, 18)],
        }),
        value: '0x0',
      })),
    });
  }

  const forwarderAddress = getWorldChainEthForwarderAddress();

  return MiniKit.sendTransaction({
    chainId: getWorldChain().id,
    transactions: transfers.map((transfer) => ({
      to: forwarderAddress,
      data: encodeFunctionData({
        abi: ETH_FORWARDER_ABI,
        functionName: 'pay',
        args: [transfer.to as `0x${string}`],
      }),
      value: toHex(parseEther(transfer.amountEth)),
    })),
  });
}

function describeAllowlistTarget(feature: 'stake' | 'contract', asset: PaymentAsset): string {
  if (feature === 'stake' || asset === 'ETH') {
    try {
      return `ETH forwarder contract ${getWorldChainEthForwarderAddress()}`;
    } catch {
      return 'ETH forwarder contract';
    }
  }

  try {
    return `WETH token contract ${getWorldChainWethAddress()}`;
  } catch {
    return 'WETH token contract';
  }
}

export function getMiniKitTransactionErrorMessage(
  error: unknown,
  options: { feature: 'stake' | 'contract'; asset?: PaymentAsset } = { feature: 'contract', asset: 'ETH' }
): string {
  const asset = options.asset || 'ETH';
  const maybeError = error as { code?: string; message?: string };

  if (maybeError?.code === 'invalid_contract') {
    const target = describeAllowlistTarget(options.feature, asset);
    return `World App rejected this transaction because ${target} is not allowlisted for this mini app. Add it in the World Developer Portal and try again.`;
  }

  if (maybeError?.code === 'user_rejected') {
    return 'You canceled the World App transaction before it was submitted.';
  }

  if (typeof maybeError?.message === 'string' && maybeError.message.trim()) {
    return maybeError.message;
  }

  return 'World App transaction failed.';
}
