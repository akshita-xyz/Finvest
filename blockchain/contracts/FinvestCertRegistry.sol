// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FinvestCertRegistry
 * @notice Tamper-evident certificate registry. The owner publishes the keccak256 hash of each
 *         issued certificate's canonical JSON. Anyone can later re-hash a certificate and check
 *         that it was issued by Finvest, and when. The certificate itself never goes on-chain —
 *         only its fingerprint does — so this is gas-cheap and privacy-preserving.
 *
 *         Verification flow: dApp serializes cert → keccak256 → calls `isValid(hash)`.
 */
contract FinvestCertRegistry is Ownable {
    /// @dev hash → unix timestamp at which it was issued (0 means "not issued").
    mapping(bytes32 => uint256) public issuedAt;

    /// @dev Optional, opaque "type" tag for analytics (e.g. keccak256("portfolio")). Not enforced.
    mapping(bytes32 => bytes32) public certKind;

    /// @notice How many distinct certificates the contract has ever issued.
    uint256 public totalIssued;

    event CertificateIssued(bytes32 indexed certHash, bytes32 indexed kind, uint256 timestamp);

    constructor() Ownable() {}

    /**
     * @notice Issue (publish) a certificate hash. Idempotent: re-issuing the same hash reverts.
     * @param certHash keccak256 of the canonical certificate JSON.
     * @param kind opaque tag (e.g. keccak256("portfolio")). Pass bytes32(0) if unused.
     */
    function issue(bytes32 certHash, bytes32 kind) external onlyOwner {
        require(certHash != bytes32(0), "empty hash");
        require(issuedAt[certHash] == 0, "already issued");
        issuedAt[certHash] = block.timestamp;
        certKind[certHash] = kind;
        unchecked {
            totalIssued += 1;
        }
        emit CertificateIssued(certHash, kind, block.timestamp);
    }

    /// @notice Convenience reader: was this certificate ever issued?
    function isValid(bytes32 certHash) external view returns (bool) {
        return issuedAt[certHash] != 0;
    }

    /// @notice Tuple reader for the verify page (one RPC call).
    function lookup(bytes32 certHash) external view returns (uint256 timestamp, bytes32 kind) {
        return (issuedAt[certHash], certKind[certHash]);
    }
}
