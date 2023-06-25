// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Erc721Stub is ERC721 {
    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}
}