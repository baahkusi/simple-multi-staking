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
  "data": "0x7a15D19088ED248C91Dd489afEE9a13581334514",
  "from": "0xb3fAED28554eF9F249873Bae907564cFB20410b6",
  "gasLimit": "3387633",
  "gasPrice": "78102081413",
  "hash": "0x7905baf5803416bc33a083ab4bab45ec31bf9e8db4308266f27d29bbb8ad7842",
  "maxFeePerGas": "78102081413",
  "maxPriorityFeePerGas": "1500000000",
  "nonce": 129,
  "signature": {
    "_type": "signature",
    "networkV": null,
    "r": "0x6924194f7f64437a7baad7e5996bcddc427d4283fa64611aa071f400e8494efd",
    "s": "0x793d5b5bea9fcba6e9bf42950b01d0b29da634398db053ee0854b2c1adde3401",
    "v": 27
  },
  "to": null,
  "type": 2,
  "value": "0"
}
```