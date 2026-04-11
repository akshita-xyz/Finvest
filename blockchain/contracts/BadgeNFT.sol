// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Achievement badges / certificates as ERC-721 (Finvest).
 * Only the contract owner can mint — use a backend or deployer wallet in production.
 * `badgesOf` lists token IDs per holder for easy frontend reads.
 */
contract BadgeNFT is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;

    mapping(address => uint256[]) private _badgesByOwner;

    constructor() ERC721("FinvestAchievement", "FNFT") Ownable() {
        tokenCounter = 0;
    }

    function mintBadge(address to, string memory tokenURI_) external onlyOwner {
        uint256 id = tokenCounter;
        _safeMint(to, id);
        _setTokenURI(id, tokenURI_);
        _badgesByOwner[to].push(id);
        unchecked {
            tokenCounter++;
        }
    }

    function badgesOf(address owner) external view returns (uint256[] memory) {
        return _badgesByOwner[owner];
    }

    function getTotalMinted() external view returns (uint256) {
        return tokenCounter;
    }
}
