import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import "dotenv/config";

async function main() {
  try {
    const staking = await ethers.getContractAt(
      "MainStaking",
      process.env.STAKING_CONTRACT!
    );
    const DAYS_30 = 60 * 60 * 24 * 30;
    const DAYS_60 = 60 * 60 * 24 * 60;
    const DAYS_90 = 60 * 60 * 24 * 90;

    const rewards = [10000, 10000, 10000];
    const periods = [DAYS_30, DAYS_60, DAYS_90];

    const addresses = [
      "0x1130027e765eBee464c25156EA220671Af056F6C",
      "0xb4e561912FA915af8b2595dbeA41fDB55A13c4dB",
      "0xdb8BBcBB6F7e5f1acf0750C7A78CD36cd1DA27d3",
    ];

    for (const token of addresses) {
      const tx = await staking.registerToken(token, periods, rewards); 
      console.log(tx);
    }
    console.log("Done registering tokens");
  } catch (error) {
    console.log(error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
