'use client';

import { BrowserProvider, formatEther, parseEther } from 'ethers';

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

type WalletContext = {
  provider: BrowserProvider;
  signer: Awaited<ReturnType<BrowserProvider['getSigner']>>;
  address: string;
};

function formatEthAmount(amountWei: bigint): string {
  const amount = Number(formatEther(amountWei));
  if (!Number.isFinite(amount)) return formatEther(amountWei);
  if (amount >= 1) return amount.toFixed(4).replace(/\.?0+$/, '');
  if (amount >= 0.001) return amount.toFixed(6).replace(/\.?0+$/, '');
  return amount.toFixed(8).replace(/\.?0+$/, '');
}

async function getOrCreateSigner(): Promise<WalletContext> {
  const ethereum = getInjectedEthereum();
  await ensureCorrectChain(ethereum);
  const provider = new BrowserProvider(ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
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

export async function ensureCanSendETH(to: string, amountETH: string): Promise<{
  balanceEth: string;
  totalRequiredEth: string;
  gasEstimateEth: string;
}> {
  const { provider, signer, address } = await getOrCreateSigner();
  const value = parseEther(amountETH);
  const balance = await provider.getBalance(address);

  let gasLimit = BigInt(21000);
  try {
    gasLimit = await signer.estimateGas({ to, value });
  } catch {
    // Fall back to the standard ETH transfer gas cost if wallet estimation is flaky.
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;

  if (!gasPrice || gasPrice <= BigInt(0)) {
    throw new Error('Could not estimate the current World Chain gas fee. Please try again in a moment.');
  }

  const gasEstimate = gasLimit * gasPrice;
  const totalRequired = value + gasEstimate;

  if (balance < totalRequired) {
    const shortfall = totalRequired - balance;
    throw new Error(
      `Insufficient ETH on World Chain. Need about ${formatEthAmount(totalRequired)} ETH total (${amountETH} ETH + ~${formatEthAmount(gasEstimate)} ETH gas), but this wallet only has ${formatEthAmount(balance)} ETH. Add about ${formatEthAmount(shortfall)} ETH and try again.`
    );
  }

  return {
    balanceEth: formatEther(balance),
    totalRequiredEth: formatEther(totalRequired),
    gasEstimateEth: formatEther(gasEstimate),
  };
}

export async function sendETHToAddress(to: string, amountETH: string): Promise<{ txHash: string }> {
  await ensureCanSendETH(to, amountETH);
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
