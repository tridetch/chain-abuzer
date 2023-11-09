import { ethers } from "ethers";
import { ChainId } from "../../utils/ChainInfoUtils";

export interface MetamaskBridgeInfo {
    estimatedProcessingTimeInSeconds: string;
    quote: {
        steps: BridgeStep[];
    };
    trade: {
        chainId: number;
        data: string;
        from: string;
        gasLimit: number;
        to: string;
        value: string;
    };
}

export interface BridgeStep {
    action: string;
    protocol: {
        displayName: string;
    };
    destChainId: number;
}
