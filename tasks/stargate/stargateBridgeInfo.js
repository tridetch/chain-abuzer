"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stargateBridgeInfo = void 0;
const ethers_1 = require("ethers");
exports.stargateBridgeInfo = {
    ethereum: {
        chainId: "101",
        routerEthAddress: "0x150f94B44927F078737562f0fcF3C95c01Cc2376",
        routerErcAddress: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
        usdcPoolId: 1,
        usdtPoolId: 2,
        refuelAmount: ethers_1.utils.parseEther("0.005"),
    },
    binance: {
        chainId: "102",
        routerEthAddress: "",
        routerErcAddress: "0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8",
        usdcPoolId: 1,
        usdtPoolId: 2,
        refuelAmount: ethers_1.utils.parseEther("0.025"),
    },
    avalanche: {
        chainId: "106",
        routerEthAddress: "",
        routerErcAddress: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
        usdcPoolId: 1,
        usdtPoolId: 2,
        refuelAmount: ethers_1.utils.parseEther("0.5"),
    },
    polygon: {
        chainId: "109",
        routerEthAddress: "",
        routerErcAddress: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
        usdcPoolId: 1,
        usdtPoolId: 2,
        refuelAmount: ethers_1.utils.parseEther("4"),
    },
    arbitrum: {
        chainId: "110",
        routerEthAddress: "0xbf22f0f184bCcbeA268dF387a49fF5238dD23E40",
        routerErcAddress: "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614",
        usdcPoolId: 1,
        usdtPoolId: 2,
        refuelAmount: ethers_1.utils.parseEther("0.005"),
    },
    optimism: {
        chainId: "111",
        routerEthAddress: "0xB49c4e680174E331CB0A7fF3Ab58afC9738d5F8b",
        routerErcAddress: "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b",
        usdcPoolId: 1,
        usdtPoolId: undefined,
        refuelAmount: ethers_1.utils.parseEther("0.005"),
    },
};
