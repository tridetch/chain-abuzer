import SafeTxnUrl from "./SafeTxnServiceUrl.json";
import { ChainId } from "../../utils/ChainInfoUtils";

export function getSafeTxnServiceUrl(chainId: number): string {
    switch (chainId) {
        case ChainId.ethereumMainnet:
            return SafeTxnUrl.ethereumMainnet;
        case ChainId.ethereumGoerli:
            return SafeTxnUrl.ethereumGoerli;
        case ChainId.arbitrumMainnet:
            return SafeTxnUrl.arbitrum;
        default:
            throw new Error("Unknown network!");
    }
}
