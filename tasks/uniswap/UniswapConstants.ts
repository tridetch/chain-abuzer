import { ChainId } from "../../utils/ChainInfoUtils";

export function getV3SwapRouterAddress(chainId: number): string {
    let address: string = "";
    switch (chainId) {
        case ChainId.baseMainnet:
            address = "0x2626664c2603336E57B271c5C0b26F421741e481";
            break;
        case ChainId.binanceMainnet:
            address = "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2";
            break;
        default:
            address = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
    }

    return address;
}
