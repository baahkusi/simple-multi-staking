import '@nomicfoundation/hardhat-toolbox'
import 'dotenv/config'
import { NetworkUserConfig, HardhatUserConfig } from 'hardhat/types'

const bscTestnet: NetworkUserConfig = {
  url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  chainId: 97,
  accounts: [process.env.KEY_ONE!]
}

const bscMainnet: NetworkUserConfig = {
  url: 'https://bsc-dataseed.binance.org/',
  chainId: 56,
  accounts: {
    mnemonic: process.env.KEY_ONE,
    path: "m/44'/60'/0'/0",
    initialIndex: 0,
    count: 1,
    passphrase: ''
  }
}

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  networks: {
    testnet: bscTestnet,
    // mainnet: bscMainnet,
    sepolia: {
      url: 'https://sepolia.infura.io/v3/82de4c56f4364dd899635d8ebbc349cc',
      accounts: [process.env.KEY_ONE! as string]
    }
  },
  // paths: {
  //   sources: "./contracts",
  //   tests: "./test",
  //   cache: "./cache",
  //   artifacts: "./artifacts",
  // },
  // abiExporter: {
  //   path: "./data/abi",
  //   clear: true,
  //   flat: false,
  // },
  etherscan: {
    apiKey: {sepolia: 'DUU2RIG2D7G2NT3FST6HHJNRQSVQFD1XCI', bsc: '3RTKWAUP47Z76R2GJS95CAP64398MMH633'}
  }
}

export default config
