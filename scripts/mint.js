const hre = require("hardhat");

async function main() {
  console.log("Starting mint script...");

  const contractAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

  const badge = await hre.ethers.getContractAt("BadgeNFT", contractAddress);

  const [owner, user] = await hre.ethers.getSigners();

  console.log("Owner:", owner.address);
  console.log("User:", user.address);

  console.log("Calling mint...");

  const tokenURI = "https://gateway.pinata.cloud/ipfs/bafkreiep5tuqispnhw4jfxq27okes63illxqxeukool2aa4dlpulsd4ufy";

  const tx = await badge.mintBadge(user.address, tokenURI);
  await tx.wait();

  console.log("NFT minted successfully");
}

main().catch((error) => {
  console.error("ERROR:", error);
  process.exitCode = 1;
});