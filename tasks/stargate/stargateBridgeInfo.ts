import { BigNumber, utils } from "ethers";

export interface StargateInfo {
    ethereum: BridgeInfo;
    binance: BridgeInfo;
    optimism: BridgeInfo;
    arbitrum: BridgeInfo;
    polygon: BridgeInfo;
    avalanche: BridgeInfo;
    base: BridgeInfo;
    linea: BridgeInfo;
}

export interface BridgeInfo {
    chainId: string;
    routerEthAddress: string;
    routerErcAddress: string;
    usdcPoolId: number | undefined;
    usdtPoolId: number | undefined;
    refuelAmount: BigNumber;
}

export const stargateBridgeInfo: StargateInfo = {
    ethereum: {
        chainId: "101",
        routerEthAddress: "0x150f94B44927F078737562f0fcF3C95c01Cc2376",
        routerErcAddress: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
        usdcPoolId: 1,
        usdtPoolId: 2,
        refuelAmount: utils.parseEther("0.005"),
    },
    binance: {
        chainId: "102",
        routerEthAddress: "",
        routerErcAddress: "0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8",
        usdcPoolId: undefined,
        usdtPoolId: 2,
        refuelAmount: utils.parseEther("0.02"),
    },
    avalanche: {
        chainId: "106",
        routerEthAddress: "",
        routerErcAddress: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
        usdcPoolId: 1,
        usdtPoolId: 2,
        refuelAmount: utils.parseEther("0.3"),
    },
    polygon: {
        chainId: "109",
        routerEthAddress: "",
        routerErcAddress: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
        usdcPoolId: 1,
        usdtPoolId: 2,
        refuelAmount: utils.parseEther("10"),
    },
    arbitrum: {
        chainId: "110",
        routerEthAddress: "0xbf22f0f184bCcbeA268dF387a49fF5238dD23E40",
        routerErcAddress: "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614",
        usdcPoolId: 1,
        usdtPoolId: 2,
        refuelAmount: utils.parseEther("0.005"),
    },
    optimism: {
        chainId: "111",
        routerEthAddress: "0xB49c4e680174E331CB0A7fF3Ab58afC9738d5F8b",
        routerErcAddress: "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b",
        usdcPoolId: 1,
        usdtPoolId: undefined,
        refuelAmount: utils.parseEther("0.005"),
    },
    base: {
        chainId: "184",
        routerEthAddress: "0x50B6EbC2103BFEc165949CC946d739d5650d7ae4",
        routerErcAddress: "0x45f1A95A4D3f3836523F5c83673c797f4d4d263B",
        usdcPoolId: 1,
        usdtPoolId: undefined,
        refuelAmount: utils.parseEther("0.005"),
    },
    linea: {
        chainId: "183",
        routerEthAddress: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
        routerErcAddress: "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",
        usdcPoolId: undefined,
        usdtPoolId: undefined,
        refuelAmount: utils.parseEther("0"),
    }
};
