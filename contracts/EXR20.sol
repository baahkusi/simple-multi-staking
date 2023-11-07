// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract EXRC20 is ERC20 {
    constructor(uint256 supply) ERC20("My Ex Token", "EXR") {
        _mint(msg.sender, supply);
    }
}