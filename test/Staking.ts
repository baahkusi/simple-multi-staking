import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Staking", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployStaking() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const DEFAULT_MINT = BigInt(1e18) * BigInt(100 * 1e9);

    const TRANSFER_AMNT = DEFAULT_MINT / BigInt(5);

    const LOCK_FOR_STAKE = DEFAULT_MINT / BigInt(2);

    const DAYS_30 = 60 * 60 * 24 * 30;
    const DAYS_60 = 60 * 60 * 24 * 60;
    const DAYS_90 = 60 * 60 * 24 * 90;

    const Reward = await ethers.getContractFactory("EXRC20");
    const rewardToken = await Reward.deploy(DEFAULT_MINT);

    const Stake1 = await ethers.getContractFactory("EXRC20");
    const stakeToken1 = await Stake1.deploy(DEFAULT_MINT);

    const Stake2 = await ethers.getContractFactory("EXRC20");
    const stakeToken2 = await Stake2.deploy(DEFAULT_MINT);

    const Unregistered = await ethers.getContractFactory("EXRC20");
    const unregisteredToken = await Unregistered.deploy(DEFAULT_MINT);

    await stakeToken1.transfer(otherAccount, TRANSFER_AMNT);
    await stakeToken2.transfer(otherAccount, TRANSFER_AMNT);
    await rewardToken.transfer(otherAccount, TRANSFER_AMNT);

    const Staking = await ethers.getContractFactory("MainStaking");
    const staking = await Staking.deploy(await rewardToken.getAddress());
    await rewardToken.transfer(staking, LOCK_FOR_STAKE);

    return {
      staking,
      rewardToken,
      stakeToken1,
      stakeToken2,
      unregisteredToken,
      owner,
      otherAccount,
      DAYS_30,
      DAYS_60,
      DAYS_90,
    };
  }

  async function registeredTokensFixture() {
    const {
      staking,
      rewardToken,
      stakeToken1,
      stakeToken2,
      unregisteredToken,
      owner,
      otherAccount,
      DAYS_30,
      DAYS_60,
      DAYS_90,
    } = await loadFixture(deployStaking);
    const periods = [DAYS_30, DAYS_60, DAYS_90];
    const rewards = [10000, 10000, 10000];
    await staking.registerToken(
      await stakeToken1.getAddress(),
      periods,
      rewards
    );
    await staking.registerToken(
      await stakeToken2.getAddress(),
      periods,
      rewards
    );
    expect(await staking.isTokenRegistered(stakeToken1.getAddress())).to.be
      .true;
    expect(await staking.isTokenRegistered(stakeToken2.getAddress())).to.be
      .true;
    return {
      staking,
      rewardToken,
      stakeToken1,
      stakeToken2,
      unregisteredToken,
      owner,
      otherAccount,
      DAYS_30,
      DAYS_60,
      DAYS_90,
    };
  }

  async function stakeTokenFixture() {
    const {
      staking,
      stakeToken1,
      stakeToken2,
      otherAccount,
      DAYS_30,
      DAYS_60,
      DAYS_90,
      rewardToken,
      unregisteredToken,
      owner,
    } = await loadFixture(registeredTokensFixture);
    const STAKE_AMNT = BigInt(1e18) * BigInt(5 * 1e9);
    const DOUBLE_STAKE = STAKE_AMNT + STAKE_AMNT;
    await stakeToken1
      .connect(otherAccount)
      .approve(await staking.getAddress(), STAKE_AMNT);
    await stakeToken2
      .connect(otherAccount)
      .approve(await staking.getAddress(), STAKE_AMNT);
    await staking
      .connect(otherAccount)
      .stake(await stakeToken1.getAddress(), STAKE_AMNT, DAYS_30);
    await staking
      .connect(otherAccount)
      .stake(await stakeToken2.getAddress(), STAKE_AMNT, DAYS_60);
    const [stake1Amount, stake1RewardsRate, stake1RecentRewardsTime] =
      await staking.userStakings(
        await otherAccount.getAddress(),
        await stakeToken1.getAddress(),
        DAYS_30
      );
    const [stake2Amount, stake2RewardsRate, stake2RecentRewardsTime] =
      await staking.userStakings(
        await otherAccount.getAddress(),
        await stakeToken2.getAddress(),
        DAYS_60
      );
    const [token1RewardsRate, token1Registered, token1TotalStake] =
      await staking.stakeTokens(await stakeToken1.getAddress(), DAYS_30);
    const [token2RewardsRate, token2Registered, token2TotalStake] =
      await staking.stakeTokens(await stakeToken2.getAddress(), DAYS_60);
    const token1UserReward = await staking.userRewards(
      await otherAccount.getAddress(),
      await stakeToken1.getAddress(),
      DAYS_30
    );
    const token2UserReward = await staking.userRewards(
      await otherAccount.getAddress(),
      await stakeToken2.getAddress(),
      DAYS_60
    );
    expect(stake1Amount).to.equal(STAKE_AMNT);
    expect(stake2Amount).to.equal(STAKE_AMNT);
    expect(stake1Amount).to.equal(token1TotalStake);
    expect(stake2Amount).to.equal(token2TotalStake);
    expect(stake1RewardsRate).to.equal(token1RewardsRate);
    expect(stake2RewardsRate).to.equal(token2RewardsRate);
    expect(token1UserReward).to.equal(0);
    expect(token2UserReward).to.equal(0);
    expect(await stakeToken1.balanceOf(await staking.getAddress())).to.equal(
      STAKE_AMNT
    );
    expect(await stakeToken2.balanceOf(await staking.getAddress())).to.equal(
      STAKE_AMNT
    );
    await time.increase(DAYS_30 / 2);
    const token1CalculateReward = await staking.calculateReward(
      otherAccount,
      await stakeToken1.getAddress(),
      DAYS_30
    );
    const token2CalculateReward = await staking.calculateReward(
      otherAccount,
      await stakeToken2.getAddress(),
      DAYS_60
    );
    await stakeToken1
      .connect(otherAccount)
      .approve(await staking.getAddress(), STAKE_AMNT);
    await stakeToken2
      .connect(otherAccount)
      .approve(await staking.getAddress(), STAKE_AMNT);
    await staking
      .connect(otherAccount)
      .stake(await stakeToken1.getAddress(), STAKE_AMNT, DAYS_30);
    await staking
      .connect(otherAccount)
      .stake(await stakeToken2.getAddress(), STAKE_AMNT, DAYS_60);
    const [stake1Amount2, stake1RewardsRate2, stake1RecentRewardsTime2] =
      await staking.userStakings(
        await otherAccount.getAddress(),
        await stakeToken1.getAddress(),
        DAYS_30
      );
    const [stake2Amount2, stake2RewardsRate2, stake2RecentRewardsTime2] =
      await staking.userStakings(
        await otherAccount.getAddress(),
        await stakeToken2.getAddress(),
        DAYS_60
      );
    const [token1RewardsRate2, token1Registered2, token1TotalStake2] =
      await staking.stakeTokens(await stakeToken1.getAddress(), DAYS_30);
    const [token2RewardsRate2, token2Registered2, token2TotalStake2] =
      await staking.stakeTokens(await stakeToken2.getAddress(), DAYS_60);
    const token1UserReward2 = await staking.userRewards(
      await otherAccount.getAddress(),
      await stakeToken1.getAddress(),
      DAYS_30
    );
    const token2UserReward2 = await staking.userRewards(
      await otherAccount.getAddress(),
      await stakeToken2.getAddress(),
      DAYS_60
    );
    const token1CalculateReward2 = await staking.calculateReward(
      otherAccount,
      await stakeToken1.getAddress(),
      DAYS_30
    );
    const token2CalculateReward2 = await staking.calculateReward(
      otherAccount,
      await stakeToken2.getAddress(),
      DAYS_60
    );
    expect(stake1Amount2).to.equal(DOUBLE_STAKE);
    expect(stake2Amount2).to.equal(DOUBLE_STAKE);
    expect(stake1Amount2).to.equal(token1TotalStake2);
    expect(stake2Amount2).to.equal(token2TotalStake2);
    expect(stake1RewardsRate2).to.equal(token1RewardsRate2);
    expect(stake2RewardsRate2).to.equal(token2RewardsRate2);
    expect(token1UserReward2).to.equal(token1CalculateReward);
    expect(token2UserReward2).to.equal(token2CalculateReward);
    expect(token1CalculateReward2).to.equal(0);
    expect(token2CalculateReward2).to.equal(0);
    expect(await stakeToken1.balanceOf(await staking.getAddress())).to.equal(
      DOUBLE_STAKE
    );
    expect(await stakeToken2.balanceOf(await staking.getAddress())).to.equal(
      DOUBLE_STAKE
    );
    return {
      staking,
      rewardToken,
      stakeToken1,
      stakeToken2,
      unregisteredToken,
      owner,
      otherAccount,
      DAYS_30,
      DAYS_60,
      DAYS_90,
      STAKE_AMNT,
      stake1Amount,
      stake1RewardsRate,
      stake1RecentRewardsTime,
      stake2Amount,
      stake2RewardsRate,
      stake2RecentRewardsTime,
      token1RewardsRate,
      token1Registered,
      token1TotalStake,
      token2RewardsRate,
      token2Registered,
      token2TotalStake,
      token1CalculateReward,
      token2CalculateReward,
      stake1Amount2,
      stake1RewardsRate2,
      stake1RecentRewardsTime2,
      stake2Amount2,
      stake2RewardsRate2,
      stake2RecentRewardsTime2,
      token1RewardsRate2,
      token1Registered2,
      token1TotalStake2,
      token2RewardsRate2,
      token2Registered2,
      token2TotalStake2,
      token1UserReward,
      token2UserReward,
      token1UserReward2,
      token2UserReward2,
      token1CalculateReward2,
      token2CalculateReward2,
      DOUBLE_STAKE,
    };
  }

  describe("Deployment", function () {
    it("Should set constructor", async function () {
      const { staking, rewardToken, owner, DAYS_30, DAYS_60, DAYS_90 } =
        await loadFixture(deployStaking);
      expect(await staking.owner()).to.equal(owner.address);
      expect(await staking.rewardToken()).to.equal(
        await rewardToken.getAddress()
      );
      expect(await staking.stakePeriods(DAYS_30)).to.be.true;
      expect(await staking.stakePeriods(DAYS_60)).to.be.true;
      expect(await staking.stakePeriods(DAYS_90)).to.be.true;
    });
  });
  describe("Controls", function () {
    it("Should change owner", async function () {
      const { staking, otherAccount, owner } = await loadFixture(deployStaking);
      expect(await staking.owner()).to.equal(owner.address);
      await staking.changeOwner(otherAccount.address);
      expect(await staking.owner()).to.equal(otherAccount.address);
    });
    it("Should freeze contract", async function () {
      const { staking } = await loadFixture(deployStaking);
      await staking.changeFrozen(true);
      expect(await staking.frozen()).to.equal(true);
    });
    it("Should transfer reward token", async function () {
      const { staking, otherAccount, rewardToken } = await loadFixture(
        deployStaking
      );
      const otherAccountRewardBalanceBefore = await rewardToken.balanceOf(
        await otherAccount.getAddress()
      );
      const stakingContractRewardBalanceBefore = await rewardToken.balanceOf(
        await staking.getAddress()
      );
      expect(stakingContractRewardBalanceBefore).to.be.greaterThan(0);      
      await staking.transferRewardToken(otherAccount);
      const otherAccountRewardBalanceAfter = await rewardToken.balanceOf(
        await otherAccount.getAddress()
      );
      const stakingContractRewardBalanceAfter = await rewardToken.balanceOf(
        await staking.getAddress()
      );
      expect(stakingContractRewardBalanceAfter).to.equal(0);
      expect(otherAccountRewardBalanceAfter).to.equal(
        otherAccountRewardBalanceBefore + stakingContractRewardBalanceBefore
      );
    });
    it("Should change owner", async function () {
      const { staking, otherAccount, owner } = await loadFixture(deployStaking);
      expect(await staking.owner()).to.equal(owner.address);
      await staking.changeOwner(otherAccount.address);
      expect(await staking.owner()).to.equal(otherAccount.address);
    });
    it("Should not change owner if sender is not owner", async function () {
      const { staking, otherAccount } = await loadFixture(deployStaking);
      await expect(
        staking.connect(otherAccount).changeOwner(otherAccount)
      ).to.revertedWith("OnlyOwner");
    });
    it("Should not freeze contract if sender is not owner", async function () {
      const { staking, otherAccount } = await loadFixture(deployStaking);
      await expect(
        staking.connect(otherAccount).changeFrozen(true)
      ).to.revertedWith("OnlyOwner");
    });
    it("Should not transfer reward token if sender is not owner", async function () {
      const { staking, otherAccount } = await loadFixture(deployStaking);
      await expect(
        staking.connect(otherAccount).transferRewardToken(otherAccount)
      ).to.revertedWith("OnlyOwner");
    });
  });
  describe("Register Period", function () {
    it("Should register period", async function () {
      const { staking, DAYS_60 } = await loadFixture(deployStaking);
      const DAYS_120 = DAYS_60 * 2;
      await staking.registerPeriod(DAYS_120);
      expect(await staking.isValidPeriod(DAYS_120)).to.be.true;
      expect(await staking.stakePeriods(DAYS_120)).to.be.true;
    });
    it("Should not register period if sender is not owner", async function () {
      const { staking, DAYS_60, otherAccount } = await loadFixture(
        deployStaking
      );
      const DAYS_120 = DAYS_60 * 2;
      await expect(
        staking.connect(otherAccount).registerPeriod(DAYS_120)
      ).to.be.revertedWith("OnlyOwner");
    });
    it("Should not register period if period is valid", async function () {
      const { staking, DAYS_30 } = await loadFixture(deployStaking);
      await expect(staking.registerPeriod(DAYS_30)).to.be.revertedWith(
        "ValidPeriod"
      );
    });
  });
  describe("Register Token", function () {
    it("Should register token", async function () {
      const { staking, stakeToken1, stakeToken2, DAYS_30, DAYS_60, DAYS_90 } =
        await loadFixture(deployStaking);
      const periods = [DAYS_30, DAYS_60, DAYS_90];
      const rewards = [10000, 10000, 10000];
      await staking.registerToken(
        await stakeToken1.getAddress(),
        periods,
        rewards
      );
      await staking.registerToken(
        await stakeToken2.getAddress(),
        periods,
        rewards
      );
      expect(await staking.isTokenRegistered(stakeToken1.getAddress())).to.be
        .true;
      expect(await staking.isTokenRegistered(stakeToken2.getAddress())).to.be
        .true;
    });
    it("Should not register token if sender is not owner", async function () {
      const { staking, otherAccount, stakeToken1, DAYS_30, DAYS_60, DAYS_90 } =
        await loadFixture(deployStaking);
      const periods = [DAYS_30, DAYS_60, DAYS_90];
      const rewards = [10000, 10000, 10000];
      await expect(
        staking
          .connect(otherAccount)
          .registerToken(stakeToken1.getAddress(), periods, rewards)
      ).to.be.revertedWith("OnlyOwner");
    });
    it("Should not register token if periods and rewards length mistmatch", async function () {
      const { staking, otherAccount, stakeToken1, DAYS_30, DAYS_60, DAYS_90 } =
        await loadFixture(deployStaking);
      const periods = [DAYS_30, DAYS_60, DAYS_90];
      const rewards = [10000, 10000];
      await expect(
        staking.registerToken(stakeToken1.getAddress(), periods, rewards)
      ).to.be.revertedWith("PeriodsRewardsLengthMisMatch");
    });
    it("Should not register token if token is rewardToken", async function () {
      const { staking, otherAccount, rewardToken, DAYS_30, DAYS_60, DAYS_90 } =
        await loadFixture(deployStaking);
      const periods = [DAYS_30, DAYS_60, DAYS_90];
      const rewards = [10000, 10000, 10000];
      await expect(
        staking.registerToken(rewardToken.getAddress(), periods, rewards)
      ).to.be.revertedWith("NotRewardToken");
    });
    it("Should not register token if DAYS_30, DAYS_60 or DAYS_90 is omitted", async function () {
      const { staking, stakeToken1, DAYS_30, DAYS_60, DAYS_90 } =
        await loadFixture(deployStaking);
      const periodsNo30 = [DAYS_60, DAYS_90];
      const periodsNo60 = [DAYS_30, DAYS_90];
      const periodsNo90 = [DAYS_30, DAYS_60];
      const rewards = [10000, 10000];
      await expect(
        staking.registerToken(stakeToken1.getAddress(), periodsNo30, rewards)
      ).to.be.revertedWith("30-60-90-DaysUnspecified");
      await expect(
        staking.registerToken(stakeToken1.getAddress(), periodsNo60, rewards)
      ).to.be.revertedWith("30-60-90-DaysUnspecified");
      await expect(
        staking.registerToken(stakeToken1.getAddress(), periodsNo90, rewards)
      ).to.be.revertedWith("30-60-90-DaysUnspecified");
    });
    it("Should not register token if DAYS_30, DAYS_60 or DAYS_90 is omitted", async function () {
      const { staking, stakeToken1, DAYS_30, DAYS_60, DAYS_90 } =
        await loadFixture(deployStaking);
      const periodsNo30 = [DAYS_60, DAYS_90];
      const periodsNo60 = [DAYS_30, DAYS_90];
      const periodsNo90 = [DAYS_30, DAYS_60];
      const rewards = [10000, 10000];
      await expect(
        staking.registerToken(stakeToken1.getAddress(), periodsNo30, rewards)
      ).to.be.revertedWith("30-60-90-DaysUnspecified");
      await expect(
        staking.registerToken(stakeToken1.getAddress(), periodsNo60, rewards)
      ).to.be.revertedWith("30-60-90-DaysUnspecified");
      await expect(
        staking.registerToken(stakeToken1.getAddress(), periodsNo90, rewards)
      ).to.be.revertedWith("30-60-90-DaysUnspecified");
    });
    it("Should not register token if reward is 0", async function () {
      const { staking, stakeToken1, DAYS_30, DAYS_60, DAYS_90 } =
        await loadFixture(deployStaking);
      const periods = [DAYS_30, DAYS_60, DAYS_90];
      const rewards = [10000, 10000, 0];
      await expect(
        staking.registerToken(stakeToken1.getAddress(), periods, rewards)
      ).to.be.revertedWith("ZeroReward");
    });
  });
  describe("Deregister Token", function () {
    it("Should deregister token", async function () {
      const { staking, stakeToken1 } = await loadFixture(
        registeredTokensFixture
      );

      await staking.deRegisterToken(stakeToken1);
      expect(await staking.isTokenRegistered(stakeToken1.getAddress())).to.be
        .false;
    });
    it("Should not deregister token if sender is not owner", async function () {
      const { staking, stakeToken1, otherAccount } = await loadFixture(
        registeredTokensFixture
      );
      await expect(
        staking.connect(otherAccount).deRegisterToken(stakeToken1.getAddress())
      ).to.be.revertedWith("OnlyOwner");
    });
    it("Should not deregister token if token is unregistered", async function () {
      const { staking, unregisteredToken } = await loadFixture(
        registeredTokensFixture
      );
      await expect(
        staking.deRegisterToken(unregisteredToken.getAddress())
      ).to.be.revertedWith("StakeTokenNotRegistered");
    });
  });
  describe("Stake Token", function () {
    it("Should stake token", async function () {
      await loadFixture(stakeTokenFixture);
    });
    it("Should not stake token if _amount is zero", async function () {
      const { staking, stakeToken1, otherAccount, DAYS_30 } = await loadFixture(
        registeredTokensFixture
      );
      const STAKE_AMNT = BigInt(0);
      await stakeToken1
        .connect(otherAccount)
        .approve(await staking.getAddress(), STAKE_AMNT);
      await expect(
        staking
          .connect(otherAccount)
          .stake(await stakeToken1.getAddress(), STAKE_AMNT, DAYS_30)
      ).to.be.revertedWith("ZeroAmount");
    });
    it("Should not stake token if token is unregistered", async function () {
      const { staking, unregisteredToken, otherAccount, DAYS_30 } =
        await loadFixture(registeredTokensFixture);
      const STAKE_AMNT = BigInt(1e18) * BigInt(5 * 1e9);
      await unregisteredToken
        .connect(otherAccount)
        .approve(await staking.getAddress(), STAKE_AMNT);
      await expect(
        staking
          .connect(otherAccount)
          .stake(await unregisteredToken.getAddress(), STAKE_AMNT, DAYS_30)
      ).to.be.revertedWith("StakeTokenNotRegistered");
    });
    it("Should not stake token if period is not valid", async function () {
      const { staking, stakeToken1, otherAccount, DAYS_30 } = await loadFixture(
        registeredTokensFixture
      );
      const STAKE_AMNT = BigInt(1e18) * BigInt(5 * 1e9);
      await stakeToken1
        .connect(otherAccount)
        .approve(await staking.getAddress(), STAKE_AMNT);
      await expect(
        staking
          .connect(otherAccount)
          .stake(await stakeToken1.getAddress(), STAKE_AMNT, DAYS_30 * 9)
      ).to.be.revertedWith("InvalidPeriod");
    });
    it("Should not stake token if contract is frozen", async function () {
      const { staking, stakeToken1, otherAccount, DAYS_30 } = await loadFixture(
        registeredTokensFixture
      );
      const STAKE_AMNT = BigInt(1e18) * BigInt(5 * 1e9);
      await staking.changeFrozen(true);
      await stakeToken1
        .connect(otherAccount)
        .approve(await staking.getAddress(), STAKE_AMNT);
      await expect(
        staking
          .connect(otherAccount)
          .stake(await stakeToken1.getAddress(), STAKE_AMNT, DAYS_30)
      ).to.be.revertedWith("Frozen");
    });
  });
  describe("Unstake Token", function () {
    it("Should unstake token", async function () {
      const {
        staking,
        rewardToken,
        stakeToken1,
        otherAccount,
        DAYS_30,
        token1CalculateReward,
        DOUBLE_STAKE,
      } = await loadFixture(stakeTokenFixture);
      await time.increase(DAYS_30);
      const token1CalculateReward3 = await staking.calculateReward(
        otherAccount,
        await stakeToken1.getAddress(),
        DAYS_30
      );
      const otherAccountStakeBalanceBefore = await stakeToken1.balanceOf(
        await otherAccount.getAddress()
      );
      const otherAccountRewardBalanceBefore = await rewardToken.balanceOf(
        await otherAccount.getAddress()
      );
      const stakingRewardBalanceBefore = await rewardToken.balanceOf(
        staking.getAddress()
      );
      await staking
        .connect(otherAccount)
        .unStake(await stakeToken1.getAddress(), DOUBLE_STAKE, DAYS_30);
      const otherAccountStakeBalanceAfter = await stakeToken1.balanceOf(
        await otherAccount.getAddress()
      );
      const otherAccountRewardBalanceAfter = await rewardToken.balanceOf(
        await otherAccount.getAddress()
      );
      expect(otherAccountStakeBalanceBefore + DOUBLE_STAKE).to.equal(
        otherAccountStakeBalanceAfter
      );
      expect(
        otherAccountRewardBalanceBefore +
          token1CalculateReward +
          token1CalculateReward3
      ).to.equal(otherAccountRewardBalanceAfter);
      const stakingRewardBalanceAfter = await rewardToken.balanceOf(
        staking.getAddress()
      );
      expect(stakingRewardBalanceBefore).to.equal(
        stakingRewardBalanceAfter +
          token1CalculateReward +
          token1CalculateReward3
      );
    });
    it("Should not unstake token if _amount is zero", async function () {
      const { staking, stakeToken1, otherAccount, DAYS_30 } = await loadFixture(
        stakeTokenFixture
      );
      await time.increase(DAYS_30);
      await expect(
        staking
          .connect(otherAccount)
          .unStake(await stakeToken1.getAddress(), 0, DAYS_30)
      ).to.revertedWith("ZeroAmount");
    });
    it("Should not unstake token if token is unregistered", async function () {
      const {
        staking,
        unregisteredToken,
        otherAccount,
        DAYS_30,
        DOUBLE_STAKE,
      } = await loadFixture(stakeTokenFixture);
      await time.increase(DAYS_30);
      await expect(
        staking
          .connect(otherAccount)
          .unStake(await unregisteredToken.getAddress(), DOUBLE_STAKE, DAYS_30)
      ).to.revertedWith("StakeTokenNotRegistered");
    });
    it("Should not unstake token if period is not valid", async function () {
      const { staking, stakeToken1, otherAccount, DAYS_30, DOUBLE_STAKE } =
        await loadFixture(stakeTokenFixture);
      await time.increase(DAYS_30);
      await expect(
        staking
          .connect(otherAccount)
          .unStake(await stakeToken1.getAddress(), DOUBLE_STAKE, DAYS_30 * 4)
      ).to.revertedWith("InvalidPeriod");
    });
    it("Should not unstake token if contract is frozen", async function () {
      const { staking, stakeToken1, otherAccount, DAYS_30, DOUBLE_STAKE } =
        await loadFixture(stakeTokenFixture);
      await time.increase(DAYS_30);
      await staking.changeFrozen(true);
      await expect(
        staking
          .connect(otherAccount)
          .unStake(await stakeToken1.getAddress(), DOUBLE_STAKE, DAYS_30 * 4)
      ).to.revertedWith("Frozen");
    });
  });
});
