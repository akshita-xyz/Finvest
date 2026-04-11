/**
 * Owner-only mint (run after deploy). Example:
 *   BADGE_NFT_ADDRESS=0x... RECIPIENT=0x... TOKEN_URI=ipfs://... npx hardhat run scripts/mint-badge.js --network sepolia
 */
const hre = require('hardhat');

async function main() {
  const address = process.env.BADGE_NFT_ADDRESS;
  const recipient = process.env.RECIPIENT;
  const tokenURI = process.env.TOKEN_URI || 'https://example.com/badge.json';
  if (!address || !recipient) {
    console.error('Set BADGE_NFT_ADDRESS and RECIPIENT env vars.');
    process.exitCode = 1;
    return;
  }

  const badge = await hre.ethers.getContractAt('BadgeNFT', address);
  const [signer] = await hre.ethers.getSigners();
  console.log('Minting as', signer.address, '→', recipient);
  const tx = await badge.mintBadge(recipient, tokenURI);
  await tx.wait();
  console.log('Minted. Token ids for recipient — call badgesOf on explorer or the app profile.');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
