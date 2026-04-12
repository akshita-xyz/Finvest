/**
 * One-shot: start Hardhat node in background, wait for :8545, deploy BadgeNFT, sync FRONTEND/.env.
 * Windows/macOS/Linux (Node 18+). Leave the node process running for the app to read chain state.
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
  console.log('RPC up. Deploying BadgeNFT…');

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

  console.log('\nDone. Hardhat node is still running in the background (chain id 31337).');
  console.log('Stop it from Task Manager / Activity Monitor, or: npx kill-port 8545 (if you install kill-port).');
  console.log('Use a browser wallet on Localhost 8545 only for demos — do not reuse production keys.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
