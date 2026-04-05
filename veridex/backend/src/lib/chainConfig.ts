export interface ChainConfig {
  chainId: number;
  name: string;
  nativeSymbol: string;
  rpcUrl: string;
  blockExplorerUrl: string;
}

const MAINNET: ChainConfig = {
  chainId: 480,
  name: 'World Chain',
  nativeSymbol: 'ETH',
  rpcUrl: 'https://worldchain-mainnet.g.alchemy.com/public',
  blockExplorerUrl: 'https://worldscan.org',
};

const TESTNET: ChainConfig = {
  chainId: 4801,
  name: 'World Chain Sepolia',
  nativeSymbol: 'ETH',
  rpcUrl: 'https://worldchain-sepolia.g.alchemy.com/public',
  blockExplorerUrl: 'https://sepolia.worldscan.org',
};

export function getChainConfig(): ChainConfig {
  const env = process.env.CHAIN_ENV?.toLowerCase();
  const base = env === 'testnet' ? TESTNET : MAINNET;

  return {
    ...base,
    rpcUrl: process.env.WORLDCHAIN_RPC_URL || process.env.WORLD_CHAIN_RPC_URL || base.rpcUrl,
    blockExplorerUrl: process.env.WORLDCHAIN_BLOCK_EXPLORER_URL || base.blockExplorerUrl,
  };
}
