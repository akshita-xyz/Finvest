const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const BadgeNFT = await hre.ethers.getContractFactory('BadgeNFT');
  const badge = await BadgeNFT.deploy();
  await badge.deployed();

  console.log('BadgeNFT deployed to:', badge.address);
  console.log('Set in FRONTEND .env: VITE_BADGE_NFT_CONTRACT_ADDRESS=' + badge.address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
