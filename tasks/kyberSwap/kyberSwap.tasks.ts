import axios from "axios";
import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, ChainInfo, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import {
    MOCK_USER_AGENT,
    addDust,
    delay,
    getAccounts,
    populateTxnParams,
    waitForGasPrice,
} from "../../utils/Utils";

export const OneInchTasks = {
    oneInchSwap: "1inchSwap",
};

function getChainName(chainInfo: ChainInfo): string | undefined {
    var chainName: string | undefined = undefined;
    switch (chainInfo.chainId) {
        case ChainId.ethereumMainnet:
            chainName = "ethereum";
            break;
        case ChainId.binanceMainnet:
            chainName = "bsc";
            break;
        case ChainId.arbitrumMainnet:
            chainName = "arbitrum";
            break;
        case ChainId.poligonMainnet:
            chainName = "polygon";
            break;
        case ChainId.optimismMainnet:
            chainName = "optimism";
            break;
        case ChainId.avalancheMainnet:
            chainName = "avalanche";
            break;
        case ChainId.baseMainnet:
            chainName = "base";
            break;
        case ChainId.zkSyncEra:
            chainName = "zksync";
            break;
        case ChainId.fantomMainnet:
            chainName = "fantom";
            break;
        case ChainId.lineaMainnet:
            chainName = "linea";
            break;
        case ChainId.zkEvm:
            chainName = "polygon-zkevm";
            break;
        case ChainId.scrollMainnet:
            chainName = "scroll";
            break;
        default:
            break;
    }
    return chainName;
}

task("kyberSwap", "Swap tokens on KyberSwap")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("fromToken", "Token to sell", "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", types.string)
    .addParam("toToken", "Token to buy", "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", types.string) // ETH 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addFlag("randomize", "Randomize accounts execution order")
    .addOptionalParam("randomAccounts", "Random number of accounts", undefined, types.int)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        const apiBaseUrl = `https://aggregator-api.kyberswap.com/${getChainName(chainInfo)}/api/v1/`;

        const isNativeEth = taskArgs.fromToken == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

        let sellToken: any = isNativeEth
            ? undefined
            : ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
        let tokenDecimals: number = isNativeEth ? 18 : await sellToken.decimals();
        const tokenName = isNativeEth ? "ETH" : await sellToken.name();

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    const minBalance = utils.parseEther(addDust({ amount: taskArgs.minBalance }).toString());
                    amount = isNativeEth
                        ? (await account.getBalance()).sub(minBalance)
                        : await sellToken.balanceOf(account.address);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.addDust }).toString(),
                        tokenDecimals
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString(), tokenDecimals);
                }

                if (amount.isZero()) {
                    console.log(`Skip address with zero balance ${account.address}`);
                    continue;
                }

                const walletAddress = account.address;
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                const routeResponce = await axios.get(
                    apiBaseUrl +
                        `routes` +
                        `?tokenIn=${taskArgs.fromToken}` +
                        `&tokenOut=${taskArgs.toToken}` +
                        `&amountIn=${amount.toString()}`,
                    {
                        headers: {
                            "X-Client-Id": "CaMultitool",
                            "User-Agent": MOCK_USER_AGENT,
                        },
                    }
                );

                if (!routeResponce.data.data.routeSummary) {
                    console.log(`Error route response`);
                }

                const swapDataResponse = await axios.post(
                    apiBaseUrl + `route/build`,
                    {
                        routeSummary: routeResponce.data.data.routeSummary,
                        recipient: account.address,
                        sender: account.address,
                        slippageTolerance: 50,
                        source: "CaMultitool",
                    },
                    {
                        headers: {
                            "X-Client-Id": "CaMultitool",
                            "User-Agent": MOCK_USER_AGENT,
                        },
                    }
                );

                if (!swapDataResponse.data.data) {
                    console.log(`Cannot construct swap data`);
                }

                await waitForGasPrice({
                    maxPriceInGwei: taskArgs.gasPrice,
                    provider: hre.ethers.provider,
                });

                if (!isNativeEth) {
                    const allowance: BigNumber = await sellToken.allowance(
                        account.address,
                        swapDataResponse.data.data.routerAddress
                    );

                    if (allowance.lt(amount)) {
                        console.log(
                            `Swap amount - ${utils.formatUnits(
                                amount,
                                tokenDecimals
                            )} ${tokenName} greater then allowance - ${utils.formatUnits(
                                allowance
                            )}\nSending approve txn...`
                        );

                        const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                        const approveTx = await sellToken
                            .connect(account)
                            .approve(swapDataResponse.data.data.routerAddress, amount, { ...txParams });
                        console.log(`Approve tx: ${chainInfo.explorer}${approveTx.hash}`);
                    }
                }

                console.log(`Swapping ${utils.formatUnits(amount, tokenDecimals)} ${tokenName} tokens ...`);

                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const swapTx = await account.sendTransaction({
                    to: swapDataResponse.data.data.routerAddress,
                    data: swapDataResponse.data.data.data,
                    value: isNativeEth ? amount : undefined,
                    ...txParams,
                });
                console.log(`Swap transaction: ${chainInfo.explorer}${swapTx.hash}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process address - ${account.address}`, error);
            }
        }
    });

async function waitRateLimit() {
    await new Promise((r) => setTimeout(r, 1100));
}
