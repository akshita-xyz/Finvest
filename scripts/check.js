const hre = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const badge = await hre.ethers.getContractAt(
    "BadgeNFT",
    contractAddress
  );

  const count = await badge.tokenCounter();

  console.log("Total NFTs minted:", count.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});