// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockNoR
/// @notice Test-only stand-in for the NoR token on the local chain (Anvil) and Fuji.
///         It behaves like the real token where YazeSim depends on it: 18 decimals,
///         no permit, and the whole fixed supply minted once at deployment.
/// @dev Never deployed to Avalanche mainnet, where the real NoR exists: the deploy
///      script refuses chain 43114 unconditionally.
contract MockNoR is ERC20 {
    /// @notice The holder address is zero.
    error InvalidHolder();

    /// @notice The total supply is zero.
    error InvalidTotalSupply();

    /// @param holder Receives the entire supply (the local deployer, or a test treasury).
    /// @param totalSupply_ Fixed total supply in wei.
    constructor(address holder, uint256 totalSupply_) ERC20("NoR (test)", "NoR") {
        if (holder == address(0)) revert InvalidHolder();
        if (totalSupply_ == 0) revert InvalidTotalSupply();
        _mint(holder, totalSupply_);
    }
}
