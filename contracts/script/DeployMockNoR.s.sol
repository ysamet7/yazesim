// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

import {MockNoR} from "../src/MockNoR.sol";
import {Script} from "forge-std/Script.sol";

/// @title DeployMockNoR
/// @notice Deploys the test NoR token, giving the whole supply to the sender.
///         Locally `pnpm bootstrap` runs it against Anvil with an unlocked
///         development account, so no private key is ever handled.
/// @dev Refuses Avalanche mainnet (43114) unconditionally, even with
///      ALLOW_MAINNET=true: a fake NoR on mainnet is never right (golden rule 5).
contract DeployMockNoR is Script {
    /// @notice Avalanche C-Chain mainnet, where the real NoR lives.
    uint256 public constant AVALANCHE_MAINNET = 43_114;

    /// @notice One billion NoR, enough for every local test account.
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;

    /// @notice The script was started against Avalanche mainnet.
    error MainnetRefused();

    function run() external returns (MockNoR token) {
        if (block.chainid == AVALANCHE_MAINNET) revert MainnetRefused();
        vm.startBroadcast();
        token = new MockNoR(msg.sender, TOTAL_SUPPLY);
        vm.stopBroadcast();
    }
}
