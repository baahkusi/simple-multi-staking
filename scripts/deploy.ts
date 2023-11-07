import { ethers } from "hardhat";
import 'dotenv/config'

async function main() {

  const staking = await ethers.deployContract("MainStaking", [process.env.REWARD_TOKEN]);

  const { ...tx} = staking.deploymentTransaction()?.toJSON();
  tx.data = await staking.getAddress();

  console.log(`deployed to ${JSON.stringify(tx, null, 2)}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
