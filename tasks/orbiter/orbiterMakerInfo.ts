// export const MAKER_ADDRESS = "0x80c67432656d59144ceff962e8faf8926599bcf8";
export const MAKER_ADDRESS = "0xe4edb277e41dc89ab076a1f049f4a3efa700bce8"; //SECOND

export interface OrbiterBridgeInfo {
    name: string;
    chainId: number;
    identificationCode: number;
}

export const OrbiterBridges: OrbiterBridgeInfo[] = [
    { name: "Ethereum", chainId: 1, identificationCode: 9001 },
    { name: "Arbitrum", chainId: 42161, identificationCode: 9002 },
    { name: "ArbitrumNova", chainId: 42170, identificationCode: 9016 },
    { name: "Polygon", chainId: 137, identificationCode: 9006 },
    { name: "Optimism", chainId: 10, identificationCode: 9007 },
    { name: "ZksyncLite", chainId: 323, identificationCode: 9003 },
    { name: "ZksyncEra", chainId: 324, identificationCode: 9014 },
    { name: "BinanceSmartChain", chainId: 56, identificationCode: 9015 },
    { name: "zkEvm", chainId: 1101, identificationCode: 9017 },
    { name: "base", chainId: 8453, identificationCode: 9021 },
    { name: "linea", chainId: 59144, identificationCode: 9023 },
];
