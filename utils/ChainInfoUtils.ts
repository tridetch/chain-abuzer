import yesno from "yesno";
import chainInfo from "./ChainInfo.json";

export interface ChainInfo {
    chainId: number;
    chainName: string;
    explorer: string;
    wethAddress: string;
    usdcAddress: string;
    usdtAddress: string;
}

export enum ChainId {
    ethereumMainnet = chainInfo.ethereumMainnetChainInfo.chainId,
    ethereumGoerli = chainInfo.ethereumGoerliChainInfo.chainId,
    ethereumSepolia = chainInfo.ethereumSepoliaChainInfo.chainId,
    arbitrumMainnet = chainInfo.arbitrumMainnetChainInfo.chainId,
    arbitrumNova = chainInfo.arbitrumNovaChainInfo.chainId,
    arbitrumGoerli = chainInfo.arbitrumGoerliChainInfo.chainId,
    arbbitrumSepolia = chainInfo.arbitrumSepoliaChainInfo.chainId,
    arbbitrumStylus = chainInfo.arbitrumStylusChainInfo.chainId,
    binanceMainnet = chainInfo.binanceMainnetChainInfo.chainId,
    optimismMainnet = chainInfo.optimismMainnetChainInfo.chainId,
    poligonMainnet = chainInfo.polygonMainnetChainInfo.chainId,
    fantomMainnet = chainInfo.fantomMainnetChainInfo.chainId,
    avalancheMainnet = chainInfo.avalancheMainnetChainInfo.chainId,
    baseGoerli = chainInfo.baseGoerliChainInfo.chainId,
    baseMainnet = chainInfo.baseMainnetChainInfo.chainId,
    lineaGoerli = chainInfo.lineaGoerlyChainInfo.chainId,
    lineaMainnet = chainInfo.lineaMainnetChainInfo.chainId,
    scrollAlphaGoerli = chainInfo.scrollAlphaChainInfo.chainId,
    scrollSepolia = chainInfo.scrollSepoliaChainInfo.chainId,
    zkSyncEra = chainInfo.zksyncEraChainInfo.chainId,
    zkEvm = chainInfo.polygonZkEvmChainInfo.chainId,
    zoraMainnet = chainInfo.zoraMainnetChainInfo.chainId,
    zoraTestnet = chainInfo.zoraTestnetChainInfo.chainId,
    taikoA3 = chainInfo.taikoAlpha3ChainInfo.chainId,
    pgnSepolia = chainInfo.pgnSepoliaChainInfo.chainId,
}

export function getChainInfo(chainId: number): ChainInfo {
    switch (chainId) {
        case ChainId.ethereumMainnet:
            return chainInfo.ethereumMainnetChainInfo;
        case ChainId.ethereumGoerli:
            return chainInfo.ethereumGoerliChainInfo;
        case ChainId.optimismMainnet:
            return chainInfo.optimismMainnetChainInfo;
        case ChainId.arbitrumMainnet:
            return chainInfo.arbitrumMainnetChainInfo;
        case ChainId.arbitrumNova:
            return chainInfo.arbitrumNovaChainInfo;
        case ChainId.arbitrumGoerli:
            return chainInfo.arbitrumGoerliChainInfo;
        case ChainId.binanceMainnet:
            return chainInfo.binanceMainnetChainInfo;
        case ChainId.poligonMainnet:
            return chainInfo.polygonMainnetChainInfo;
        case ChainId.fantomMainnet:
            return chainInfo.fantomMainnetChainInfo;
        case ChainId.baseGoerli:
            return chainInfo.baseGoerliChainInfo;
        case ChainId.baseMainnet:
            return chainInfo.baseMainnetChainInfo;
        case ChainId.scrollAlphaGoerli:
            return chainInfo.scrollAlphaChainInfo;
        case ChainId.scrollSepolia:
            return chainInfo.scrollSepoliaChainInfo;
        case ChainId.zkSyncEra:
            return chainInfo.zksyncEraChainInfo;
        case ChainId.avalancheMainnet:
            return chainInfo.avalancheMainnetChainInfo;
        case ChainId.lineaGoerli:
            return chainInfo.lineaGoerlyChainInfo;
        case ChainId.lineaMainnet:
            return chainInfo.lineaMainnetChainInfo;
        case ChainId.ethereumSepolia:
            return chainInfo.ethereumSepoliaChainInfo;
        case ChainId.zkEvm:
            return chainInfo.polygonZkEvmChainInfo;
        case ChainId.zoraMainnet:
            return chainInfo.zoraMainnetChainInfo;
        case ChainId.zoraTestnet:
            return chainInfo.zoraTestnetChainInfo;
        case ChainId.taikoA3:
            return chainInfo.taikoAlpha3ChainInfo;
        case ChainId.pgnSepolia:
            return chainInfo.pgnSepoliaChainInfo;
        case ChainId.arbbitrumStylus:
            return chainInfo.arbitrumStylusChainInfo;
        case ChainId.arbbitrumStylus:
            return chainInfo.arbitrumStylusChainInfo;
        case ChainId.arbbitrumSepolia:
            return chainInfo.arbitrumSepoliaChainInfo;
        default:
            throw new Error("Unknown network!");
    }
}

export async function warnIfMainnet(chainId: number) {
    const mainnets = [
        ChainId.ethereumMainnet,
        ChainId.arbitrumMainnet,
        ChainId.arbitrumNova,
        ChainId.binanceMainnet,
        ChainId.optimismMainnet,
        ChainId.poligonMainnet,
        ChainId.fantomMainnet,
        ChainId.zkSyncEra,
        ChainId.avalancheMainnet,
    ];
    if (mainnets.includes(chainId)) {
        const ok = await yesno({
            question: `Confirm action on ${getChainInfo(chainId).chainName} (y/n) ...`,
        });
        if (!ok) {
            throw new Error("Rejected by user");
        }
    }
}
