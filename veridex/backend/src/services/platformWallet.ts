import { JsonRpcProvider, Wallet, parseEther, formatEther } from 'ethers';

const DEFAULT_RPC_URL = 'https://worldchain-mainnet.g.alchemy.com/public';

function getRpcUrl(): string {
  return process.env.WORLDCHAIN_RPC_URL || process.env.WORLD_CHAIN_RPC_URL || DEFAULT_RPC_URL;
}

let _wallet: Wallet | null = null;

export function getPlatformWallet(): Wallet {
  if (_wallet) return _wallet;

  const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PLATFORM_WALLET_PRIVATE_KEY is not configured');
  }

  const provider = new JsonRpcProvider(getRpcUrl());
  _wallet = new Wallet(privateKey, provider);
  return _wallet;
}

export function getPlatformAddress(): string {
  const address = process.env.PLATFORM_WALLET_ADDRESS;
  if (!address) {
    throw new Error('PLATFORM_WALLET_ADDRESS is not configured');
  }
  return address;
}

export async function sendETH(to: string, amountWei: bigint): Promise<string> {
  const wallet = getPlatformWallet();
  const tx = await wallet.sendTransaction({ to, value: amountWei });
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error('ETH transfer failed on-chain');
  }
  return receipt.hash;
}
