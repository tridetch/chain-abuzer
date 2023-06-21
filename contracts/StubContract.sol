// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract Stub {
    string word;
    uint256 private blockNumber;

    constructor() {
        blockNumber = block.number;
    }
}
