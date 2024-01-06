import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import fetch, { Headers } from "node-fetch";
import { ERC20__factory } from "../../typechain-types";
import { getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

export const OneInchTasks = {
    oneInchSwap: "1inchSwap",
};

task("1inchSwap", "Swap tokens on 1inch")
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

        const apiBaseUrl = "https://api.1inch.dev/swap/v5.2/" + network.chainId;
        const headers = new Headers();
        headers.append(`accept`, `application/json`);
        headers.append(`Authorization`, `Bearer ${process.env.ONE_INCH_API_KEY}`);

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

                const swapParams = {
                    src: taskArgs.fromToken,
                    dst: taskArgs.toToken,
                    amount: amount.toString(),
                    from: walletAddress,
                    slippage: 0.5,
                    // disableEstimate: false,
                    // allowPartialFill: false,
                };

                const allowance: BigNumber = BigNumber.from(
                    await checkAllowance(swapParams.src, walletAddress)
                );

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                if (allowance.lt(swapParams.amount)) {
                    console.log(
                        `Swap amount - ${utils.formatUnits(
                            swapParams.amount,
                            tokenDecimals
                        )} ${tokenName} greater then allowance - ${utils.formatUnits(
                            allowance
                        )}\nSending approve txn...`
                    );
                    // First, let's build the body of the transaction
                    const transactionForSign = await buildTxForApproveTradeWithRouter(
                        walletAddress,
                        swapParams.src,
                        swapParams.amount.toString()
                    );
                    // console.log("Transaction for approve: ", transactionForSign);

                    // Send a transaction and get its hash
                    const approveTxHash = await signAndSendTransaction(account, transactionForSign);
                    console.log(`Approve tx: ${chainInfo.explorer}${approveTxHash}`);
                }

                // First, let's build the body of the transaction
                const swapTransaction = await buildTxForSwap(swapParams);
                console.log(
                    `Swapping ${utils.formatUnits(swapParams.amount, tokenDecimals)} ${tokenName} tokens ...`
                );
                // console.log("Transaction for swap: ", swapTransaction);

                // Send a transaction and get its hash
                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const swapTxHash = await signAndSendTransaction(account, { ...swapTransaction, ...txParams });
                console.log(`Swap transaction: ${chainInfo.explorer}${swapTxHash}`);
                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process address - ${account.address}`, error);
            }
        }

        //TODO add address

        function apiRequestUrl(methodName: string, queryParams: Record<string, string>) {
            return apiBaseUrl + methodName + "?" + new URLSearchParams(queryParams).toString();
        }

        async function checkAllowance(tokenAddress: string, walletAddress: string) {
            await waitRateLimit();

            const res = await fetch(apiRequestUrl("/approve/allowance", { tokenAddress, walletAddress }), {
                headers: headers,
            });

            const res_1 = await res.json();
            return res_1.allowance;
        }

        async function signAndSendTransaction(account: any, transaction: any) {
            // const rawTransaction = await account.signTransaction(transaction);
            // console.log(`Raw txn`, rawTransaction);
            const txn = await account.sendTransaction(transaction);
            await txn.wait();
            return txn.hash;
            // return await broadCastRawTransaction(rawTransaction);
        }

        async function buildTxForApproveTradeWithRouter(from: string, tokenAddress: string, amount: string) {
            const url = apiRequestUrl(
                "/approve/transaction",
                amount ? { tokenAddress, amount } : { tokenAddress }
            );

            await waitRateLimit();
            const transaction = await fetch(url, { headers: headers }).then((res) => res.json());

            const calculatedGasLimit = await hre.ethers.provider.estimateGas({
                ...transaction,
                from: from,
            });

            return {
                ...transaction,
                value: BigNumber.from(transaction.value),
                gasPrice: BigNumber.from(transaction.gasPrice),
                gasLimit: calculatedGasLimit,
            };
        }

        async function buildTxForSwap(swapParams: any) {
            const url = apiRequestUrl("/swap", swapParams);

            await waitRateLimit();
            return fetch(url, { headers: headers })
                .then((res) => {
                    return res.json();
                })
                .then((res) => {
                    if ("error" in res) {
                        console.log(`\nSwap error responce`, res);
                        throw new Error();
                    }
                    const txn = {
                        from: res.tx.from,
                        to: res.tx.to,
                        data: res.tx.data,
                        value: res.tx.value,
                        gasPrice: res.tx.gasPrice,
                        gasLimit: res.tx.gas,
                    };
                    return txn;
                });
        }
    });

async function waitRateLimit() {
    await new Promise((r) => setTimeout(r, 1100));
}
