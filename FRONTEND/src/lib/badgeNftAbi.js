/** Minimal ABI for Finvest `BadgeNFT` (read + owner mint off-chain tooling). */
export const BADGE_NFT_ABI = [
  'function badgesOf(address owner) view returns (uint256[])', 'function tokenURI(uint256 tokenId) view returns (string)', 'function balanceOf(address owner) view returns (uint256)', 'function tokenCounter() view returns (uint256)', ];
