import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import fetch from "node-fetch";
import { ERC20__factory } from "../../typechain-types";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts } from "../../utils/Utils";

export const OneInchTasks = {
    oneInchSwap: "1inchSwap",
};

task("1inchSwap", "Swap tokens on 1inch")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("fromToken", "Token to sell", "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", types.string)
    .addParam("toToken", "Token to buy", "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", types.string) // ETH 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const network = await hre.ethers.provider.getNetwork();
        const apiBaseUrl = "https://api.1inch.io/v5.0/" + network.chainId;

        const isNativeEth = taskArgs.fromToken == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

        let sellToken: any = isNativeEth
            ? undefined
            : ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
        let tokenDecimals: number = isNativeEth ? 18 : await sellToken.decimals();
        const tokenName = isNativeEth ? "ETH" : await sellToken.name();

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
                    fromTokenAddress: taskArgs.fromToken,
                    toTokenAddress: taskArgs.toToken,
                    amount: amount.toString(),
                    fromAddress: walletAddress,
                    slippage: 1,
                    disableEstimate: false,
                    allowPartialFill: false,
                };

                const allowance: BigNumber = BigNumber.from(
                    await checkAllowance(swapParams.fromTokenAddress, walletAddress)
                );

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
                        swapParams.fromTokenAddress,
                        swapParams.amount.toString()
                    );
                    // console.log("Transaction for approve: ", transactionForSign);

                    // Send a transaction and get its hash
                    const approveTxHash = await signAndSendTransaction(account, transactionForSign);

                    console.log("Approve tx hash: ", approveTxHash);
                }

                // First, let's build the body of the transaction
                const swapTransaction = await buildTxForSwap(swapParams);
                console.log(
                    `Swapping ${utils.formatUnits(swapParams.amount, tokenDecimals)} ${tokenName} tokens ...`
                );
                // console.log("Transaction for swap: ", swapTransaction);

                // Send a transaction and get its hash
                const swapTxHash = await signAndSendTransaction(account, swapTransaction);
                console.log(`Swap transaction hash: ${swapTxHash}\n`);
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
            const res = await fetch(apiRequestUrl("/approve/allowance", { tokenAddress, walletAddress }));
            const res_1 = await res.json();
            return res_1.allowance;
        }

        async function signAndSendTransaction(account: any, transaction: any) {
            // const rawTransaction = await account.signTransaction(transaction);
            // console.log(`Raw txn`, rawTransaction);
            const txn = await account.sendTransaction(transaction);
            txn.wait();
            return txn.hash;
            // return await broadCastRawTransaction(rawTransaction);
        }

        async function buildTxForApproveTradeWithRouter(from: string, tokenAddress: string, amount: string) {
            const url = apiRequestUrl(
                "/approve/transaction",
                amount ? { tokenAddress, amount } : { tokenAddress }
            );

            const transaction = await fetch(url).then((res) => res.json());

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

            return fetch(url)
                .then((res) => res.json())
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