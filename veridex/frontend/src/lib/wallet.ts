'use client';

import { BrowserProvider, parseEther } from 'ethers';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
    };
  }
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

export async function connectInjectedWallet(): Promise<{ address: string }> {
  const ethereum = getInjectedEthereum();
  const provider = new BrowserProvider(ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { address };
}

export async function signWalletMessage(message: string): Promise<{ address: string; signature: string }> {
  const ethereum = getInjectedEthereum();
  const provider = new BrowserProvider(ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(message);
  const address = await signer.getAddress();
  return { address, signature };
}

export async function sendETHToAddress(to: string, amountETH: string): Promise<{ txHash: string }> {
  const ethereum = getInjectedEthereum();
  const provider = new BrowserProvider(ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
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
