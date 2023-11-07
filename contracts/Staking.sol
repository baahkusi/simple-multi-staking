// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// import "hardhat/console.sol";

contract MainStaking is ReentrancyGuard {
    address public owner;
    address public rewardToken;
    bool public frozen;
    uint256 private constant ONE_DAY_IN_SECS = 86400;
    uint256 private constant DAYS_30 = 30 days;
    uint256 private constant DAYS_60 = 60 days;
    uint256 private constant DAYS_90 = 90 days;

    struct StakeToken {
        uint256 rewardsRate; // daily reward token for staking on this token
        bool registered;
        uint256 totalStaked;
    }

    struct UserStake {
        uint256 stakeAmount;
        uint256 rewardsRate; // daily reward token to be added
        uint256 recentRewardsTime;
    }
    // token address -> stake period -> StakeToken
    mapping(address => mapping(uint256 => StakeToken)) public stakeTokens;
    // user address -> token address -> stake period -> UserStake
    mapping(address => mapping(address => mapping(uint256 => UserStake)))
        public userStakings;
    // user address -> token address -> stake period -> reward gained
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        public userRewards;
    // user address -> token address -> stake period -> reward claimed
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        public userClaimedRewards;
    mapping(uint256 => bool) public stakePeriods;

    event Stake(address stakeToken, uint256 amountStaked);
    event UnStake(address stakeToken, uint256 amountUnStaked);

    constructor(address _rewardToken) {
        owner = msg.sender;
        rewardToken = _rewardToken;
        stakePeriods[DAYS_30] = true;
        stakePeriods[DAYS_60] = true;
        stakePeriods[DAYS_90] = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "OnlyOwner");
        _;
    }

    modifier notFrozen() {
        require(!frozen, "Frozen");
        _;
    }

    modifier registeredToken(address _tokenAddress) {
        require(isTokenRegistered(_tokenAddress), "StakeTokenNotRegistered");
        _;
    }

    modifier notRewardToken(address _tokenAddress) {
        require(_tokenAddress != rewardToken, "NotRewardToken");
        _;
    }

    modifier validPeriod(uint256 _period) {
        require(isValidPeriod(_period), "InvalidPeriod");
        _;
    }

    modifier notValidPeriod(uint256 _period) {
        require(!isValidPeriod(_period), "ValidPeriod");
        _;
    }

    modifier nonZero(uint256 _amount) {
        require(_amount > 0, "ZeroAmount");
        _;
    }

    function changeOwner(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }

    function changeFrozen(bool _frozen) external onlyOwner {
        frozen = _frozen;
    }

    function transferRewardToken(address _receipient) external onlyOwner {
        SafeERC20.safeTransfer(
            IERC20(rewardToken),
            _receipient,
            IERC20(rewardToken).balanceOf(address(this))
        );
    }

    function registerPeriod(
        uint256 _period
    ) external onlyOwner notValidPeriod(_period) {
        require(_period > 1 days, "PeriodLessThanADay");
        stakePeriods[_period] = true;
    }

    function registerToken(
        address _tokenAddress,
        uint256[] calldata _periods,
        uint256[] calldata _rewards
    ) external onlyOwner notRewardToken(_tokenAddress) {
        require(
            _periods.length == _rewards.length,
            "PeriodsRewardsLengthMisMatch"
        );
        for (uint256 i = 0; i < _periods.length; i++) {
            isValidPeriod(_periods[i]);
            require(_rewards[i] > 0, "ZeroReward");
            stakeTokens[_tokenAddress][_periods[i]] = StakeToken(
                _rewards[i],
                true,
                0
            );
        }
        require(isTokenRegistered(_tokenAddress), "30-60-90-DaysUnspecified");
    }

    function deRegisterToken(
        address _tokenAddress
    ) external onlyOwner registeredToken(_tokenAddress) {
        stakeTokens[_tokenAddress][DAYS_30].registered = false;
        stakeTokens[_tokenAddress][DAYS_60].registered = false;
        stakeTokens[_tokenAddress][DAYS_90].registered = false;
    }

    function stake(
        address _tokenAddress,
        uint256 _amount,
        uint256 _period
    )
        external
        nonReentrant
        notFrozen
        nonZero(_amount)
        registeredToken(_tokenAddress)
        validPeriod(_period)
    {
        SafeERC20.safeTransferFrom(
            IERC20(_tokenAddress),
            msg.sender,
            address(this),
            _amount
        );
        if (userStakings[msg.sender][_tokenAddress][_period].stakeAmount == 0) {
            userStakings[msg.sender][_tokenAddress][_period] = UserStake({
                stakeAmount: _amount,
                rewardsRate: stakeTokens[_tokenAddress][_period].rewardsRate,
                recentRewardsTime: block.timestamp
            });
        } else {
            _updateRewards(msg.sender, _tokenAddress, _period);
            userStakings[msg.sender][_tokenAddress][_period]
                .stakeAmount += _amount;
            userStakings[msg.sender][_tokenAddress][_period]
                .rewardsRate = stakeTokens[_tokenAddress][_period].rewardsRate;
            userStakings[msg.sender][_tokenAddress][_period]
                .recentRewardsTime = block.timestamp;
        }
        stakeTokens[_tokenAddress][_period].totalStaked += _amount;
        emit Stake(_tokenAddress, _amount);
    }

    function unStake(
        address _tokenAddress,
        uint256 _amount,
        uint256 _period
    )
        external
        nonReentrant
        notFrozen
        nonZero(_amount)
        registeredToken(_tokenAddress)
        validPeriod(_period)
    {
        require(
            userStakings[msg.sender][_tokenAddress][_period].stakeAmount >=
                _amount,
            "InsufficientStakeBalance"
        );
        if (
            (block.timestamp -
                userStakings[msg.sender][_tokenAddress][_period]
                    .recentRewardsTime) >= _period
        ) {
            uint256 contractRewardTokenBalance = IERC20(rewardToken).balanceOf(
                address(this)
            );
            _updateRewards(msg.sender, _tokenAddress, _period);
            SafeERC20.safeTransfer(
                IERC20(rewardToken),
                msg.sender,
                userRewards[msg.sender][_tokenAddress][_period]
            );
            userClaimedRewards[msg.sender][_tokenAddress][
                _period
            ] += userRewards[msg.sender][_tokenAddress][_period];
            require(
                (contractRewardTokenBalance -
                    userRewards[msg.sender][_tokenAddress][_period]) ==
                    IERC20(rewardToken).balanceOf(address(this)),
                "RewardTokenTransferInvariantFailed"
            );
        }
        uint256 contractStakeTokenBalance = IERC20(_tokenAddress).balanceOf(
            address(this)
        );
        userRewards[msg.sender][_tokenAddress][_period] = 0;
        userStakings[msg.sender][_tokenAddress][_period].stakeAmount -= _amount;
        stakeTokens[_tokenAddress][_period].totalStaked -= _amount;
        SafeERC20.safeTransfer(IERC20(_tokenAddress), msg.sender, _amount);
        userClaimedRewards[msg.sender][_tokenAddress][_period] += _amount;
        require(
            (contractStakeTokenBalance - _amount) ==
                IERC20(_tokenAddress).balanceOf(address(this)),
            "StakeTokenTransferInvariantFailed"
        );
        emit UnStake(_tokenAddress, _amount);
    }

    function isValidPeriod(uint256 _period) public view returns (bool) {
        return stakePeriods[_period];
    }

    function isTokenRegistered(
        address _tokenAddress
    ) public view returns (bool) {
        return
            stakeTokens[_tokenAddress][DAYS_30].registered &&
            stakeTokens[_tokenAddress][DAYS_60].registered &&
            stakeTokens[_tokenAddress][DAYS_90].registered;
    }

    function calculateReward(
        address _userAddress,
        address _tokenAddress,
        uint256 _period
    )
        public
        view
        registeredToken(_tokenAddress)
        validPeriod(_period)
        returns (uint256)
    {
        return
            (userStakings[_userAddress][_tokenAddress][_period].stakeAmount /
                userStakings[_userAddress][_tokenAddress][_period]
                    .rewardsRate) *
            Math.min(
                _period / ONE_DAY_IN_SECS,
                (block.timestamp -
                    userStakings[_userAddress][_tokenAddress][_period]
                        .recentRewardsTime) / ONE_DAY_IN_SECS
            );
    }

    function _updateRewards(
        address _userAddress,
        address _tokenAddress,
        uint256 _period
    ) internal {
        userRewards[_userAddress][_tokenAddress][_period] += calculateReward(
            _userAddress,
            _tokenAddress,
            _period
        );
    }
}
