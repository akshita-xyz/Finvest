// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BadgeNFT is ERC721URIStorage {

    uint256 public tokenCounter;

    constructor() ERC721("AchievementBadge", "BADGE") {
        tokenCounter = 0;
    }

    function mintBadge(address user, string memory tokenURI) public {
        _safeMint(user, tokenCounter);
        _setTokenURI(tokenCounter, tokenURI);
        tokenCounter++;
    }

    function getTotalMinted() public view returns (uint256) {
        return tokenCounter;
    }
}