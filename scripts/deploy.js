const hre = require("hardhat");

async function main() {
  console.log("Deploying contract...");

  const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");
  const badge = await BadgeNFT.deploy();

  await badge.deployed();

  console.log("Contract deployed to:", badge.address);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});