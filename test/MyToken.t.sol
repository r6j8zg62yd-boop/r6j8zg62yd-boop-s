// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MyToken} from "../contracts/MyToken.sol";

contract MyTokenTest is Test {
    function testMintsFixedSupplyToDeployer() public {
        MyToken token = new MyToken();

        assertEq(token.name(), "MyToken");
        assertEq(token.symbol(), "MTK");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 1000e18);
        assertEq(token.balanceOf(address(this)), 1000e18);
    }
}
