import { BigNumber, Wallet, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams } from "../../utils/Utils";

import {
    Currency,
    CurrencyAmount,
    Ether,
    Percent,
    SUPPORTED_CHAINS,
    Token,
    TradeType,
} from "@uniswap/sdk-core";
import { AlphaRouter, SwapOptionsSwapRouter02, SwapRoute, SwapType } from "@uniswap/smart-order-router";
import IUniswapV3Factory from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json";
import IUniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import QuoterABI from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";
import { Pool } from "@uniswap/v3-sdk";
import { getV3SwapRouterAddress } from "./UniswapConstants";

task("uniswapTrade", "Swap tokens on Uniswap")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("fromToken", "Token to sell", "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", types.string)
    .addParam("toToken", "Token to buy", "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", types.string) // ETH 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addFlag("randomize", "Randomize accounts execution order")
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (!SUPPORTED_CHAINS.includes(chainInfo.chainId)) {
            console.log(`Task not supported at ${chainInfo.chainName}`);
            return;
        }

        const v3SwapRouterAddress = getV3SwapRouterAddress(chainInfo.chainId);

        const isNativeEth = taskArgs.fromToken == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

        let sellToken: any = isNativeEth
            ? undefined
            : ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
        let tokenDecimals: number = isNativeEth ? 18 : await sellToken.decimals();

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

                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                const route = await generateRoute(
                    amount,
                    network.chainId,
                    account.address,
                    taskArgs.fromToken,
                    taskArgs.toToken
                );

                if (!isNativeEth) {
                    let tokenContract = ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
                    const allowance: BigNumber = await tokenContract.allowance(
                        account.address,
                        v3SwapRouterAddress
                    );

                    if (allowance.lt(amount)) {
                        console.log(
                            `Swap amount - ${utils.formatUnits(
                                amount,
                                tokenDecimals
                            )} ${await tokenContract.name()} greater then allowance - ${utils.formatUnits(
                                allowance
                            )}\nSending approve txn...`
                        );

                        // Send a transaction and get its hash
                        var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                        const approveTxHash = await tokenContract
                            .connect(account)
                            .approve(v3SwapRouterAddress, amount, { ...txParams });
                        console.log(`Approve tx: ${chainInfo.explorer}${approveTxHash.hash}`);
                        await approveTxHash.wait(2);
                    }
                }

                if (route) {
                    const tx = await executeRoute(account, route);
                    console.log(`Swap transaction: ${chainInfo.explorer}${tx}`);

                    if (taskArgs.delay != undefined) {
                        await delay(taskArgs.delay);
                    }
                } else {
                    console.log(`Cannot find route for swap`);
                }
            } catch (error) {
                console.log(`Error when process address - ${account.address}`, error);
            }
        }

        async function generateRoute(
            amount: BigNumber,
            chainId: number,
            recipient: string,
            fromToken: string,
            toToken: string
        ): Promise<SwapRoute | null> {
            const tokenIn = await getTokenFromContractAddress(fromToken, hre.ethers.provider);
            const tokenOut = await getTokenFromContractAddress(toToken, hre.ethers.provider);

            // console.log(`tokenIn`);
            // console.log(tokenIn);
            // console.log(`tokenOut`);
            // console.log(tokenOut);

            const router = new AlphaRouter({
                chainId: chainId,
                provider: hre.ethers.provider,
            });

            const options: SwapOptionsSwapRouter02 = {
                recipient: recipient,
                slippageTolerance: new Percent(1, 100),
                deadline: Math.floor(Date.now() / 1000 + 1800),
                type: SwapType.SWAP_ROUTER_02,
            };

            const currencyAmount = CurrencyAmount.fromRawAmount(tokenIn, amount.toString());

            const route = await router.route(currencyAmount, tokenOut, TradeType.EXACT_INPUT, options);

            if (route) {
                console.log(`You'll get ${route.quote.toFixed()} of ${tokenOut.symbol}`);

                // output quote minus gas fees
                // console.log(`Gas Adjusted Quote: ${route.quoteGasAdjusted.toFixed()}`);
                // console.log(`Gas Used Quote Token: ${route.estimatedGasUsedQuoteToken.toFixed()}`);
                // console.log(`Gas Used USD: ${route.estimatedGasUsedUSD.toFixed()}`);
                // console.log(`Gas Used: ${route.estimatedGasUsed.toString()}`);
                // console.log(`Gas Price Wei: ${route.gasPriceWei}`);
            }

            return route;
        }

        async function executeRoute(account: Wallet, route: SwapRoute): Promise<string> {
            var txParams = await populateTxnParams({ signer: account, chain: chainInfo });

            const tx = await account.sendTransaction({
                data: route.methodParameters?.calldata,
                to: v3SwapRouterAddress,
                value: route.methodParameters?.value,
                ...txParams,
            });

            return tx.hash;
        }
    });

async function getTokenFromContractAddress(
    address: string,
    provider: ethers.providers.JsonRpcProvider
): Promise<Currency> {
    const chainId = (await provider.getNetwork()).chainId;

    if (address != "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        let tokenContract = ERC20__factory.connect(address, provider);
        return new Token(
            chainId,
            address,
            await tokenContract.decimals(),
            await tokenContract.symbol(),
            await tokenContract.name()
        );
    } else {
        return Ether.onChain((await provider.getNetwork()).chainId);
    }
}
