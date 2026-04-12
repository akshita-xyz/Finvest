require('@nomiclabs/hardhat-ethers');
require('dotenv').config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || process.env.ALCHEMY_SEPOLIA_URL || '';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.19',
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {},
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC || 'https://rpc.sepolia.org',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};
