/** Minimal ABI for FinvestCertRegistry — read-only methods used by the verify page. */
export const CERT_REGISTRY_ABI = [
  'function isValid(bytes32 certHash) view returns (bool)',
  'function issuedAt(bytes32 certHash) view returns (uint256)',
  'function lookup(bytes32 certHash) view returns (uint256 timestamp, bytes32 kind)',
  'function totalIssued() view returns (uint256)',
];
