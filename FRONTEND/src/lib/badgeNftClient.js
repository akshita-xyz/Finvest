import { Contract, JsonRpcProvider } from 'ethers';
import { BADGE_NFT_ABI } from './badgeNftAbi';

/**
 * @param {{ rpcUrl: string; contractAddress: string; walletAddress: string }} p
 * @returns {Promise<{ id: string; tokenURI: string }[]>}
 */
export async function fetchOnChainBadges(p) {
  const rpc = String(p.rpcUrl || '').trim();
  const addr = String(p.contractAddress || '').trim();
  const wallet = String(p.walletAddress || '').trim();
  if (!rpc || !addr || !wallet) return [];

  const provider = new JsonRpcProvider(rpc);
  const c = new Contract(addr, BADGE_NFT_ABI, provider);
  const ids = await c.badgesOf(wallet);
  const list = Array.isArray(ids) ? ids : [];
  const out = [];
  for (const id of list) {
    const idStr = id?.toString?.() ?? String(id);
    try {
      const uri = await c.tokenURI(id);
      out.push({ id: idStr, tokenURI: String(uri || '') });
    } catch {
      out.push({ id: idStr, tokenURI: '' });
    }
  }
  return out;
}
