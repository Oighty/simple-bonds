// hardhat.config.js - Hardhat Configuration File
require("dotenv").config();

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

module.exports = {
  solidity: "0.8.10",
  networks: {
    hardhat: {
      chainId: 1337,
      forking: {
        url: process.env.POLYGON_ARCHIVE_URL,
        blockNumber: 21996800,
      },
      accounts: [
        {privateKey: process.env.PRIVATE_KEY_1, balance: (100 * (10 ** 18)).toString()},
        {privateKey: process.env.PRIVATE_KEY_2, balance: (100 * (10 ** 18)).toString()},
        {privateKey: process.env.PRIVATE_KEY_3, balance: (100 * (10 ** 18)).toString()},
      ],
      initialBaseFeePerGas: 0, // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
    },
    // mumbai: {
    //   chainId: 80001,
    //   url: process.env.MUMBAI_URL || "",
    //   accounts: process.env.PRIVATE_KEY,
    // },
    polygon: {
      chainId: 137,
      url: process.env.POLYGON_ARCHIVE_URL,
      accounts: [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2], // Owner and Manager accounts
      gasPrice: 100000000000
    },
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY,
  },
  mocha: {
    timeout: 100000
  }
};
