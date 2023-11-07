# Description

- A staking contract allows users to lock one token for a period of time and earn rewards tokens after the staking period is over.

- The staking token and the reward token are two seperate tokens.

- In this contract users can stake and unstake tokens at any time.

- If tokens are unstaked before the said period the user looses their rewards.

- Users will gain full rewards if they unstake at the right time.

- Contract owner can set the various staking periods and the daily rewards associated with them.

## Deployments

#### Staking 
- `npx hardhat run ./scripts/deploy.ts --network sepolia`
- `npx hardhat verify --network sepolia [contract address] [REWARD_TOKEN]`

#### Sepolia
============
```json
{
  "_type": "TransactionReceipt",
  "accessList": [],
  "blockNumber": null,
  "blockHash": null,
  "chainId": "11155111",
  "data": "0x4FDABf81E94EB84E78298dCe906a7ff6904dd6A7",
  "from": "0xb3fAED28554eF9F249873Bae907564cFB20410b6",
  "gasLimit": "3132680",
  "gasPrice": "1000000011",
  "hash": "0xb26aa14bc015691ab413b7b15d2060f75cd08473372f78e29304b302eb4c9e0f",
  "maxFeePerGas": "1000000011",
  "maxPriorityFeePerGas": "1000000000",
  "nonce": 98,
  "signature": {
    "_type": "signature",
    "networkV": null,
    "r": "0xab9d8f9a2c0a8956e767e5825941b48f29800b7d26f5b16a15233d9062b8ad1c",
    "s": "0x0adbfb41684bbf56c3c2980fe3bb05bfef00c5ffcfafa1f53a3e076daefc121e",
    "v": 27
  },
  "to": null,
  "type": 2,
  "value": "0"
}
```