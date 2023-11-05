import { ethers } from "ethers";
import { ChainId } from "../../utils/ChainInfoUtils";
import { SyncSwapClassicPoolFactoryAbi, SyncSwapRouterContractAbi, SyncSwapStablePoolFactoryAbi } from "./SyncsSwapContractsAbi";

interface SyncSwapContracts {
    classicPoolFactoryContract: ethers.Contract;
    stablePoolFactoryContract: ethers.Contract;
    routerContract: ethers.Contract;
}

export function getSyncSwapContracts(
    chainId: number,
    provider: ethers.providers.JsonRpcProvider
): SyncSwapContracts | undefined {
    let contractInfo: SyncSwapContracts | undefined = undefined;
    switch (chainId) {
        case ChainId.zkSyncEra:
            contractInfo = {
                classicPoolFactoryContract: new ethers.Contract(
                    "0xf2DAd89f2788a8CD54625C60b55cD3d2D0ACa7Cb",
                    SyncSwapClassicPoolFactoryAbi,
                    provider
                ),
                stablePoolFactoryContract: new ethers.Contract(
                    "0x5b9f21d407F35b10CbfDDca17D5D84b129356ea3",
                    SyncSwapStablePoolFactoryAbi,
                    provider
                ),
                routerContract: new ethers.Contract(
                    "0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295",
                    SyncSwapRouterContractAbi,
                    provider
                ),
            };
            break;

        case ChainId.lineaMainnet:
            contractInfo = {
                classicPoolFactoryContract: new ethers.Contract(
                    "0x37BAc764494c8db4e54BDE72f6965beA9fa0AC2d",
                    SyncSwapClassicPoolFactoryAbi,
                    provider
                ),
                stablePoolFactoryContract: new ethers.Contract(
                    "0xE4CF807E351b56720B17A59094179e7Ed9dD3727",
                    SyncSwapStablePoolFactoryAbi,
                    provider
                ),
                routerContract: new ethers.Contract(
                    "0x80e38291e06339d10AAB483C65695D004dBD5C69",
                    SyncSwapRouterContractAbi,
                    provider
                ),
            };
            break;

        case ChainId.scrollMainnet:
            contractInfo = {
                classicPoolFactoryContract: new ethers.Contract(
                    "0x37BAc764494c8db4e54BDE72f6965beA9fa0AC2d",
                    SyncSwapClassicPoolFactoryAbi,
                    provider
                ),
                stablePoolFactoryContract: new ethers.Contract(
                    "0xE4CF807E351b56720B17A59094179e7Ed9dD3727",
                    SyncSwapStablePoolFactoryAbi,
                    provider
                ),
                routerContract: new ethers.Contract(
                    "0x80e38291e06339d10AAB483C65695D004dBD5C69",
                    SyncSwapRouterContractAbi,
                    provider
                ),
            };
            break;

        default:
            contractInfo = undefined;
    }

    return contractInfo;
}
