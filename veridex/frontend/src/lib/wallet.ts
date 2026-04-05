'use client';

import { BrowserProvider, parseEther } from 'ethers';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
    };
  }
}

const CHAINS = {
  mainnet: {
    chainId: '0x1E0',     // 480
    chainName: 'World Chain',
    rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
    blockExplorerUrl: 'https://worldscan.org',
  },
  testnet: {
    chainId: '0x12C1',    // 4801
    chainName: 'World Chain Sepolia',
    rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
    blockExplorerUrl: 'https://sepolia.worldscan.org',
  },
} as const;

function getTargetChain() {
  const env = process.env.NEXT_PUBLIC_CHAIN_ENV?.toLowerCase();
  return env === 'testnet' ? CHAINS.testnet : CHAINS.mainnet;
}

function getInjectedEthereum() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No EVM wallet was detected. Install a wallet like World App browser wallet or MetaMask.');
  }

  if (typeof window.ethereum.request !== 'function') {
    throw new Error('The detected wallet provider does not support EVM requests.');
  }

  return window.ethereum;
}

async function ensureCorrectChain(ethereum: ReturnType<typeof getInjectedEthereum>) {
  const target = getTargetChain();
  const currentChainId = await ethereum.request({ method: 'eth_chainId' }) as string;

  if (currentChainId.toLowerCase() === target.chainId.toLowerCase()) return;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: target.chainId }],
    });
  } catch (switchError: any) {
    // 4902 = chain not added to wallet yet
    if (switchError?.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: target.chainId,
          chainName: target.chainName,
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [target.rpcUrl],
          blockExplorerUrls: [target.blockExplorerUrl],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

let cachedSigner: { signer: Awaited<ReturnType<BrowserProvider['getSigner']>>; address: string } | null = null;

async function getOrCreateSigner(): Promise<{ signer: Awaited<ReturnType<BrowserProvider['getSigner']>>; address: string }> {
  if (cachedSigner) return cachedSigner;
  const ethereum = getInjectedEthereum();
  await ensureCorrectChain(ethereum);
  const provider = new BrowserProvider(ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  cachedSigner = { signer, address };
  return cachedSigner;
}

export async function connectInjectedWallet(): Promise<{ address: string }> {
  const { address } = await getOrCreateSigner();
  return { address };
}

export async function signWalletMessage(message: string): Promise<{ address: string; signature: string }> {
  const { signer, address } = await getOrCreateSigner();
  const signature = await signer.signMessage(message);
  return { address, signature };
}

export async function sendETHToAddress(to: string, amountETH: string): Promise<{ txHash: string }> {
  const { signer } = await getOrCreateSigner();
  const tx = await signer.sendTransaction({
    to,
    value: parseEther(amountETH),
  });
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error('Transaction failed — no receipt');
  }
  return { txHash: receipt.hash };
}
