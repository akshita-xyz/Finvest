import { Contract, JsonRpcProvider } from 'ethers';
import { CERT_REGISTRY_ABI } from './certRegistryAbi';

/**
 * @param {{ rpcUrl: string; contractAddress: string; certHash: string }} p
 * @returns {Promise<{ valid: boolean; timestamp: number; kind: string }>}
 */
export async function lookupCertificate(p) {
  const rpc = String(p.rpcUrl || '').trim();
  const addr = String(p.contractAddress || '').trim();
  const hash = String(p.certHash || '').trim();
  if (!rpc || !addr || !hash) {
    throw new Error('Missing rpcUrl, contractAddress, or certHash.');
  }

  const provider = new JsonRpcProvider(rpc);
  const c = new Contract(addr, CERT_REGISTRY_ABI, provider);
  const [tsBig, kindHex] = await c.lookup(hash);
  const timestamp = Number(tsBig?.toString?.() ?? tsBig) || 0;
  return {
    valid: timestamp > 0,
    timestamp,
    kind: String(kindHex || ''),
  };
}
