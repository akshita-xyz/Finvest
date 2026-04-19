/**
 * Merges VITE_CERT_REGISTRY_ADDRESS + VITE_CERT_REGISTRY_RPC_URL (and the server-side mirrors)
 * into FRONTEND/.env from deployments/<network>.json (default: localhost).
 *
 * Usage: node scripts/sync-frontend-env.js [network]
 */
const fs = require('fs');
const path = require('path');

const network = process.argv[2] || 'localhost';
const root = path.join(__dirname, '..');
const deploymentPath = path.join(root, 'deployments', `${network}.json`);
const frontendEnv = path.join(root, '..', 'FRONTEND', '.env');

if (!fs.existsSync(deploymentPath)) {
  console.error('Missing', deploymentPath, '— deploy first: npx hardhat run scripts/deploy.js --network', network);
  process.exit(1);
}

const { contractAddress, rpcUrl } = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
if (!contractAddress || !rpcUrl) {
  console.error('deployment file missing contractAddress or rpcUrl');
  process.exit(1);
}

function upsertEnvFile(filePath, pairs) {
  let raw = '';
  if (fs.existsSync(filePath)) raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.length ? raw.split(/\r?\n/) : [];

  for (const key of Object.keys(pairs)) {
    const value = pairs[key];
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^\\s*#?\\s*${esc}=`);
    let hit = false;
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        lines[i] = `${key}=${value}`;
        hit = true;
        break;
      }
    }
    if (!hit) lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, lines.join('\n').replace(/\n+$/, '\n'), 'utf8');
}

upsertEnvFile(frontendEnv, {
  VITE_CERT_REGISTRY_ADDRESS: contractAddress,
  VITE_CERT_REGISTRY_RPC_URL: rpcUrl,
  CERT_REGISTRY_ADDRESS: contractAddress,
  CERT_REGISTRY_RPC_URL: rpcUrl,
});

console.log('Updated', frontendEnv);
console.log('  VITE_CERT_REGISTRY_ADDRESS=' + contractAddress);
console.log('  VITE_CERT_REGISTRY_RPC_URL=' + rpcUrl);
console.log('  CERT_REGISTRY_ADDRESS=' + contractAddress);
console.log('  CERT_REGISTRY_RPC_URL=' + rpcUrl);
console.log('\nNow set CERT_ISSUER_PRIVATE_KEY in FRONTEND/.env (the deployer wallet key).');
console.log('On localhost, copy any of the prefunded keys printed by `hardhat node` (account #0).');
console.log('Restart the Vite dev server (FRONTEND) so env vars load.');
