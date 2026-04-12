const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);
  console.log('Network:', hre.network.name, 'chainId:', (await hre.ethers.provider.getNetwork()).chainId);

  const BadgeNFT = await hre.ethers.getContractFactory('BadgeNFT');
  const badge = await BadgeNFT.deploy();
  await badge.deployed();

  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const rpcUrl =
    hre.network.name === 'localhost'
      ? 'http://127.0.0.1:8545'
      : hre.network.config.url || '';

  const out = {
    contractAddress: badge.address,
    network: hre.network.name,
    chainId: Number(chainId),
    rpcUrl,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  const dir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${hre.network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', file);

  console.log('\nBadgeNFT deployed to:', badge.address);
  console.log('Run: npm run env:sync --workspace finvest-blockchain (from repo root) or: node blockchain/scripts/sync-frontend-env.js');
  console.log('FRONTEND .env lines:\n  VITE_BADGE_NFT_CONTRACT_ADDRESS=' + badge.address);
  console.log('  VITE_NFT_RPC_URL=' + (out.rpcUrl || '(set your RPC for this network)'));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
