const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with:', deployer.address);
  console.log('Network:', hre.network.name, 'chainId:', (await hre.ethers.provider.getNetwork()).chainId);

  const Registry = await hre.ethers.getContractFactory('FinvestCertRegistry');
  const registry = await Registry.deploy();
  await registry.deployed();

  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const rpcUrl =
    hre.network.name === 'localhost'
      ? 'http://127.0.0.1:8545'
      : hre.network.config.url || '';

  const out = {
    contractAddress: registry.address,
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

  console.log('\nFinvestCertRegistry deployed to:', registry.address);
  console.log('Run: node scripts/sync-frontend-env.js  (writes FRONTEND/.env)');
  console.log('FRONTEND .env lines:');
  console.log('  VITE_CERT_REGISTRY_ADDRESS=' + registry.address);
  console.log('  VITE_CERT_REGISTRY_RPC_URL=' + (out.rpcUrl || '(set your RPC for this network)'));
  console.log('  CERT_REGISTRY_ADDRESS=' + registry.address + '   # server-side mirror');
  console.log('  CERT_REGISTRY_RPC_URL=' + (out.rpcUrl || '...') + '   # server-side mirror');
  console.log('  CERT_ISSUER_PRIVATE_KEY=<deployer private key>   # server-only, used by /api/cert-issue');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
