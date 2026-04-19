/**
 * One-shot: start Hardhat node in background, wait for :8545, deploy FinvestCertRegistry,
 * sync FRONTEND/.env. Cross-platform (Node 18+). Leave the node process running.
 *
 * The Hardhat node prints 20 prefunded test wallets at startup (each with 10 000 ETH).
 * Copy account #0's private key into FRONTEND/.env as CERT_ISSUER_PRIVATE_KEY=0x... so
 * /api/cert-issue can sign issuance transactions locally. NEVER reuse that key on mainnet.
 */
const { spawn } = require('child_process');
const net = require('net');
const { execSync } = require('child_process');
const path = require('path');

const blockchainRoot = path.join(__dirname, '..');

function waitPort(port, host = '127.0.0.1', timeoutMs = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.createConnection({ port, host }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error(`Port ${port} did not open within ${timeoutMs}ms`));
        else setTimeout(tryOnce, 350);
      });
    };
    tryOnce();
  });
}

async function main() {
  console.log('Starting Hardhat node in background (127.0.0.1:8545)…');
  const nodeProc = spawn('npx', ['hardhat', 'node'], {
    cwd: blockchainRoot,
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
  nodeProc.unref();

  await waitPort(8545);
  console.log('RPC up. Deploying FinvestCertRegistry…');

  execSync('npx hardhat run scripts/deploy.js --network localhost', {
    cwd: blockchainRoot,
    stdio: 'inherit',
    shell: true,
  });

  execSync('node scripts/sync-frontend-env.js localhost', {
    cwd: blockchainRoot,
    stdio: 'inherit',
    shell: true,
  });

  console.log('\nDone. Hardhat node is still running (chain id 31337) in the background.');
  console.log('Stop it via Task Manager / Activity Monitor, or: npx kill-port 8545');
  console.log('\nNEXT: paste a prefunded private key into FRONTEND/.env as CERT_ISSUER_PRIVATE_KEY.');
  console.log('Run `npx hardhat node` separately once to see the list of accounts (or check Hardhat docs).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
