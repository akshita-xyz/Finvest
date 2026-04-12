/**
 * Merges VITE_BADGE_NFT_CONTRACT_ADDRESS + VITE_NFT_RPC_URL into FRONTEND/.env
 * from deployments/<network>.json (default: localhost).
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
  const keys = Object.keys(pairs);

  for (const key of keys) {
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
  VITE_BADGE_NFT_CONTRACT_ADDRESS: contractAddress,
  VITE_NFT_RPC_URL: rpcUrl,
});

console.log('Updated', frontendEnv);
console.log('  VITE_BADGE_NFT_CONTRACT_ADDRESS=' + contractAddress);
console.log('  VITE_NFT_RPC_URL=' + rpcUrl);
console.log('\nRestart the Vite dev server (FRONTEND) so env vars load.');
