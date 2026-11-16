// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

import {DeployMockNoR} from "../script/DeployMockNoR.s.sol";
import {MockNoR} from "../src/MockNoR.sol";
import {Test} from "forge-std/Test.sol";

contract DeployMockNoRTest is Test {
    DeployMockNoR internal script;

    function setUp() public {
        script = new DeployMockNoR();
    }

    function test_refusesAvalancheMainnet() public {
        vm.chainId(43_114);
        vm.expectRevert(DeployMockNoR.MainnetRefused.selector);
        script.run();
    }

    function test_refusesMainnetEvenWithAllowMainnet() public {
        vm.setEnv("ALLOW_MAINNET", "true");
        vm.chainId(43_114);
        vm.expectRevert(DeployMockNoR.MainnetRefused.selector);
        script.run();
    }

    function test_deploysOnTheLocalChain() public {
        vm.chainId(31_337);
        MockNoR token = script.run();
        assertEq(token.totalSupply(), script.TOTAL_SUPPLY());
        assertEq(token.decimals(), 18);
    }

    function test_deploysOnFuji() public {
        vm.chainId(43_113);
        MockNoR token = script.run();
        assertGt(address(token).code.length, 0);
    }
}
