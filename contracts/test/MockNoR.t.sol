// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

import {MockNoR} from "../src/MockNoR.sol";
import {Test} from "forge-std/Test.sol";

contract MockNoRTest is Test {
    address internal constant HOLDER = address(0xA11CE);
    uint256 internal constant SUPPLY = 1_000_000 ether;

    MockNoR internal token;

    function setUp() public {
        token = new MockNoR(HOLDER, SUPPLY);
    }

    function test_matchesTheRealTokensShape() public view {
        assertEq(token.decimals(), 18);
        assertEq(token.symbol(), "NoR");
        assertEq(token.name(), "NoR (test)");
    }

    function test_mintsTheWholeSupplyToTheHolderOnce() public view {
        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.balanceOf(HOLDER), SUPPLY);
    }

    function test_hasNoPermit() public {
        // The real NoR has no EIP-2612 permit; nothing may come to rely on one.
        (bool ok,) = address(token).call(abi.encodeWithSignature("DOMAIN_SEPARATOR()"));
        assertFalse(ok);
        (ok,) = address(token).call(abi.encodeWithSignature("nonces(address)", HOLDER));
        assertFalse(ok);
    }

    function test_rejectsAZeroHolder() public {
        vm.expectRevert(MockNoR.InvalidHolder.selector);
        new MockNoR(address(0), SUPPLY);
    }

    function test_rejectsAZeroSupply() public {
        vm.expectRevert(MockNoR.InvalidTotalSupply.selector);
        new MockNoR(HOLDER, 0);
    }

    function testFuzz_transfersMoveExactAmounts(address to, uint256 amount) public {
        vm.assume(to != address(0) && to != HOLDER);
        amount = bound(amount, 0, SUPPLY);
        vm.prank(HOLDER);
        assertTrue(token.transfer(to, amount));
        assertEq(token.balanceOf(to), amount);
        assertEq(token.balanceOf(HOLDER), SUPPLY - amount);
        assertEq(token.totalSupply(), SUPPLY);
    }
}
