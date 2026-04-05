import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import {
  getWalletBalances,
  getWalletInfo,
  getWorldChainMetadata,
  parseTrackedTokenAddresses,
  resolveTrackedTokens,
} from '../services/wallet';

const router = Router();

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const chain = getWorldChainMetadata();
  return res.json({
    wallet: getWalletInfo(req.user),
    chain: {
      chainId: chain.chainId,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      blockExplorerUrl: chain.blockExplorerUrl,
    },
  });
});

router.get('/balances', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const walletAddress = req.user?.wallet_address as string | undefined;

    if (!walletAddress) {
      return res.status(400).json({ error: 'No verified wallet is connected to this account' });
    }

    const includeNative = req.query.include_native !== 'false';
    const tokens = parseTrackedTokenAddresses(
      typeof req.query.tokens === 'string' ? req.query.tokens : undefined
    );

    const balances = await getWalletBalances(req.userId!, walletAddress, tokens, includeNative);
    return res.json(balances);
  } catch (error) {
    console.error('Wallet balances error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch wallet balances';
    return res.status(400).json({ error: message });
  }
});

router.post('/tokens/resolve', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tokenAddresses = Array.isArray(req.body?.token_addresses)
      ? req.body.token_addresses
      : [];

    if (tokenAddresses.length === 0) {
      return res.status(400).json({ error: 'token_addresses must be a non-empty array' });
    }

    const tokens = await resolveTrackedTokens(tokenAddresses);
    const chain = getWorldChainMetadata();
    return res.json({
      tokens,
      chain: {
        chainId: chain.chainId,
        name: chain.name,
        nativeCurrency: chain.nativeCurrency,
        blockExplorerUrl: chain.blockExplorerUrl,
      },
    });
  } catch (error) {
    console.error('Resolve tokens error:', error);
    const message = error instanceof Error ? error.message : 'Failed to resolve token metadata';
    return res.status(400).json({ error: message });
  }
});

export default router;
