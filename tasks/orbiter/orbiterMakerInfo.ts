export const MAKER_ADDRESS = "0x80c67432656d59144ceff962e8faf8926599bcf8";
export const MAKER_ADDRESS_ERC = "0x41d3D33156aE7c62c094AAe2995003aE63f587B3";
export const L2_20_INSCRIPTION_ADDRESS = "0x0a88bc5c32b684d467b43c06d9e0899efeaf59df";
// export const MAKER_ADDRESS = "0xe4edb277e41dc89ab076a1f049f4a3efa700bce8"; //SECOND
export const MAKER_ADDRESS_STARKNET = "0x07b393627bd514d2aa4c83e9f0c468939df15ea3c29980cd8e7be3ec847795f0";
export const MAKER_CONTRACT_ADDRESS = "0xD9D74a29307cc6Fc8BF424ee4217f1A587FBc8Dc";

export interface OrbiterBridgeInfo {
    name: string;
    chainId: number;
    identificationCode: number;
}

export const OrbiterBridges: OrbiterBridgeInfo[] = [
    { name: "Ethereum", chainId: 1, identificationCode: 9001 },
    { name: "Arbitrum", chainId: 42161, identificationCode: 9002 },
    { name: "ZksyncLite", chainId: 323, identificationCode: 9003 },
    { name: "Starknet", chainId: 23448594291968334, identificationCode: 9004 },
    { name: "ArbitrumNova", chainId: 42170, identificationCode: 9016 },
    { name: "Polygon", chainId: 137, identificationCode: 9006 },
    { name: "Optimism", chainId: 10, identificationCode: 9007 },
    { name: "ZksyncEra", chainId: 324, identificationCode: 9014 },
    { name: "BinanceSmartChain", chainId: 56, identificationCode: 9015 },
    { name: "zkEvm", chainId: 1101, identificationCode: 9017 },
    { name: "Scroll", chainId: 534352, identificationCode: 9019 },
    { name: "Base", chainId: 8453, identificationCode: 9021 },
    { name: "Linea", chainId: 59144, identificationCode: 9023 },
    { name: "Zora", chainId: 7777777, identificationCode: 9030 },
    { name: "ZKFair", chainId: 42766, identificationCode: 9038 },
];

export const L2_20Inscriptions: OrbiterBridgeInfo[] = [
    { name: "Arbitrum", chainId: 42161, identificationCode: 9002 },
    { name: "Optimism", chainId: 10, identificationCode: 9007 },
    { name: "ZksyncEra", chainId: 324, identificationCode: 9014 },
    { name: "zkEvm", chainId: 1101, identificationCode: 9017 },
    { name: "Scroll", chainId: 534352, identificationCode: 9019 },
    { name: "Base", chainId: 8453, identificationCode: 9021 },
    { name: "Linea", chainId: 59144, identificationCode: 9023 },
];
