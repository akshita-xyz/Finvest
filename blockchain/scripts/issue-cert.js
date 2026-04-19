/**
 * Manual issue helper for testing. Hashes a JSON file and publishes the hash.
 *
 *   CERT_REGISTRY_ADDRESS=0x... CERT_FILE=./sample.json \
 *     npx hardhat run scripts/issue-cert.js --network localhost
 *
 * The JSON file MUST be the exact certificate object you want to verify later.
 * Canonicalisation (sorted keys, no whitespace) is applied here so the hash matches
 * what the frontend / verify page computes from the same object.
 */
const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

async function main() {
  const address = process.env.CERT_REGISTRY_ADDRESS;
  const certFile = process.env.CERT_FILE;
  if (!address || !certFile) {
    console.error('Set CERT_REGISTRY_ADDRESS and CERT_FILE env vars.');
    process.exitCode = 1;
    return;
  }

  const abs = path.resolve(certFile);
  const raw = fs.readFileSync(abs, 'utf8');
  const obj = JSON.parse(raw);
  const json = canonicalize(obj);
  const hash = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(json));
  const kindStr = String(obj.type || '');
  const kind = kindStr ? hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(kindStr)) : hre.ethers.constants.HashZero;

  const registry = await hre.ethers.getContractAt('FinvestCertRegistry', address);
  const [signer] = await hre.ethers.getSigners();
  console.log('Issuer:', signer.address);
  console.log('Cert hash:', hash);
  console.log('Kind:    ', kindStr || '(none)');
  const tx = await registry.issue(hash, kind);
  console.log('Tx sent:', tx.hash);
  await tx.wait();
  console.log('Issued. Verify URL: /verify?cert=' + Buffer.from(json).toString('base64url'));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
