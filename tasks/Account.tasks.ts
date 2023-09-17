import * as dotenv from "dotenv";
import { BigNumber, ethers, utils } from "ethers";
import { subtask, task, types } from "hardhat/config";
import { ERC20__factory } from "../typechain-types";
import { ChainId, getChainInfo } from "../utils/ChainInfoUtils";
import "../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams, waitForGasPrice } from "../utils/Utils";

dotenv.config();

export const AccountsTasks = {
    chainInfo: "chainInfo",
    accounts: "accounts",
    balances: "balances",
    balancesWeth: "balancesWeth",
    disperse: "disperse",
    wrapEth: "wrapEth",
    unwrapEth: "unwrapEth",
};

task("chainInfo", "Print chain info").setAction(async (taskArgs, hre) => {
    const network = await hre.ethers.provider.getNetwork();
    const chainInfo = getChainInfo(network.chainId);
    console.log(`Network: `, network);
    console.log(`ChainInfo: `, chainInfo);
});

task("gasPrice", "Print chain info").setAction(async (taskArgs, hre) => {
    console.log(`Gas price: ${utils.formatUnits(await hre.ethers.provider.getGasPrice(), "gwei")}`);
});

task("accounts", "Show accounts")
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        for (const account of accounts) {
            try {
                if (chainInfo.chainId == ChainId.ethereumMainnet) {
                    console.log(
                        `#${accounts.indexOf(account)} Address: ${
                            account.address
                        } ENS: ${await hre.ethers.provider.lookupAddress(account.address)}`
                    );
                } else {
                    console.log(`#${accounts.indexOf(account)} Address: ${account.address}`);
                }
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }

        console.log(`Total account: ${accounts.length}`);
    });

task("accountsPrivateKeys", "Show accounts private keys")
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(
                    `#${accounts.indexOf(account)} Addr: ${account.address} Pk: ${account.privateKey}`
                );
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("balances", "Show accounts balances")
    .addOptionalParam("tokenAddress", "Token address")
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        if (taskArgs.tokenAddress == undefined) {
            for (const account of accounts) {
                await hre.run("printNativeBalances", {
                    walletAddress: account.address,
                    accountId: accounts.indexOf(account).toString(),
                });
            }
        } else {
            for (const account of accounts) {
                await hre.run("printTokenBalance", {
                    tokenAddress: taskArgs.tokenAddress,
                    walletAddress: account.address,
                });
            }
        }
    });

task("tokenBalances", "Print accounts token balances")
    .addParam("address", "Token address", undefined, types.string)
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const tokenContract = ERC20__factory.connect(taskArgs.address, hre.ethers.provider);
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();

        for (const account of accounts) {
            const balance = utils.formatUnits(await tokenContract.balanceOf(account.address), decimals);
            console.log(
                `#${accounts.indexOf(account)} Address: ${account.address} Balance: ${balance} ${symbol}`
            );
        }
    });

task("balancesCrossChain", "Show accounts balances")
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
        interface AccountInfo {
            Address: string;
            Ethereum: string;
            Arbitrum: string;
            Linea: string;
            Optimism: string;
            ZkEvm: string;
            ZksyncEra: string;
            Base: string;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const ethProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_URL);
        const arbProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ARBITRUM_MAINNET_URL);
        const lineaProvider = new hre.ethers.providers.JsonRpcProvider(process.env.LINEA_MAINNET);
        const optimismProvider = new hre.ethers.providers.JsonRpcProvider(process.env.OPTIMISM_MAINNET_URL);
        const zkEvmProvider = new hre.ethers.providers.JsonRpcProvider(process.env.POLYGON_ZK_EVM_URL);
        const zksyncEraProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ZKSYNC_ERA_URL);
        const baseProvider = new hre.ethers.providers.JsonRpcProvider(process.env.BASE_MAINNET_URL);

        let accountBalances: AccountInfo[] = [];

        for (const account of accounts) {
            let accountInfo: AccountInfo = {
                Address: account.address,
                Ethereum: utils.formatEther(await ethProvider.getBalance(account.address)).substring(0, 8),
                Arbitrum: utils.formatEther(await arbProvider.getBalance(account.address)).substring(0, 8),
                Optimism: utils
                    .formatEther(await optimismProvider.getBalance(account.address))
                    .substring(0, 8),
                Linea: utils.formatEther(await lineaProvider.getBalance(account.address)).substring(0, 8),
                ZksyncEra: utils
                    .formatEther(await zksyncEraProvider.getBalance(account.address))
                    .substring(0, 8),
                Base: utils.formatEther(await baseProvider.getBalance(account.address)).substring(0, 8),
                ZkEvm: utils.formatEther(await zkEvmProvider.getBalance(account.address)).substring(0, 8),
            };
            accountBalances.push(accountInfo);
        }
        console.table(accountBalances);
    });

task("balancesWeth", "Show WETH accounts balances").setAction(async (taskArgs, hre) => {
    await hre.run("printWethBalances");
});

subtask("printNativeBalances", "Print accounts balances")
    .addParam("walletAddress", "Account address")
    .addParam("accountId", "Account address", "", types.string, true)
    .setAction(async (taskArgs, hre) => {
        const account = (await getAccounts(taskArgs, hre.ethers.provider)).find(
            (acc) => acc.address === taskArgs.walletAddress
        );
        if (account == undefined) return;

        const balance = utils.formatEther(await account.getBalance());
        console.log(`#${taskArgs.accountId} Address: ${account.address} Balance: ${balance}`);
    });

task("disperseEth", "Disperse ETH from main account to all others")
    .addParam("amount", "Amount to send", undefined, types.float)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("senderAccount", "Disperse start account index", undefined, types.int)
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.int)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addFlag("randomize", "Randomize account execution order")
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const recepientAccounts = await getAccounts(taskArgs, hre.ethers.provider);

        taskArgs.startAccount = undefined;
        taskArgs.endAccount = undefined;
        taskArgs.accountIndex = undefined;

        const sender = (await getAccounts(taskArgs, hre.ethers.provider))[taskArgs.senderAccount];

        console.log(`Sender ${sender.address}`);

        for (const account of recepientAccounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const txn = await sender.sendTransaction({
                    to: account.address,
                    value: amount,
                });
                console.log(
                    `\n#${recepientAccounts.indexOf(account)} Address ${account.address} ${utils.formatEther(
                        amount
                    )} ETH sended\nTxn: ${chainInfo.explorer}${txn.hash}`
                );
                await txn.wait();
                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(
                    `Error when process account #${recepientAccounts.indexOf(account)} Address: ${
                        account.address
                    }`
                );
                console.log(error);
            }
        }
        console.log("\n");
    });

// task("doubleAccounts", "Double number of your account")
//     .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
//     .addParam("delay", "Add delay", undefined, types.float, true)
//     .addParam(
//         "lastActiveAccount",
//         "Account index starting from which need to top up new empty accounts",
//         undefined,
//         types.int
//     )
//     .setAction(async (taskArgs, hre) => {
//         const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);

//         taskArgs.endAccount = taskArgs.lastActiveAccount;
//         const accounts = await getAccounts(taskArgs, hre.ethers.provider);
//         const newAccounts
//         var index: number = taskArgs.lastActiveAccount;

//         for (const account of accounts) {
//             try {
//                 let amount: BigNumber = percentOf(await account.getBalance(), 50);

//                 await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

//                 const txn = await account.sendTransaction({
//                     to: account.address,
//                     value: amount,
//                 });
//                 console.log(
//                     `\n#${accounts.indexOf(account)} Address ${account.address} ${utils.formatEther(
//                         amount
//                     )} ETH sended\nTxn: ${chainInfo.explorer}${txn.hash}`
//                 );
//                 index += 1;
//                 if (taskArgs.delay != undefined) {
//                     await delay(taskArgs.delay);
//                 }
//             } catch (error) {
//                 console.log(
//                     `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
//                 );
//                 console.log(error);
//             }
//         }
//         console.log("\n");
//     });

task("wrapEth", "Wrap native ETH to WETH")
    .addParam("amount", "Amount to wrap", undefined, types.float)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const wethContract = await hre.ethers.getContractAt("WETH9", chainInfo.wethAddress);

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString(), await wethContract.decimals());
                }

                const balance = await account.getBalance();
                if (balance.gte(amount)) {
                    await waitForGasPrice({
                        maxPriceInGwei: taskArgs.gasPrice,
                        provider: hre.ethers.provider,
                    });

                    const txn = await wethContract.connect(account).deposit({ value: amount });
                    console.log(
                        `Deposit ${utils.formatUnits(amount)} WETH to ${account.address} txn: ${txn.hash}`
                    );
                } else {
                    console.log(
                        `Skip ${account.address} - not enought funds (${utils.formatEther(balance)})`
                    );
                }
                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("unwrapEth", "Unwrap WETH to native ether")
    .addParam("amount", "Amount to deposit", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const wethContract = await hre.ethers.getContractAt("WETH9", chainInfo.wethAddress);

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await wethContract.connect(account).balanceOf(account.address);
                } else {
                    amount = utils.parseUnits(taskArgs.amount, await wethContract.decimals());
                }

                if (amount.gt(hre.ethers.constants.Zero)) {
                    await waitForGasPrice({
                        maxPriceInGwei: taskArgs.gasPrice,
                        provider: hre.ethers.provider,
                    });

                    const txn = await wethContract.connect(account).withdraw(amount);
                    console.log(`Address: ${account.address} WETH withdraw txn: ${txn.hash}`);
                } else {
                    console.log(`Skip ${account.address} - not enought funds (${utils.formatUnits(amount)})`);
                }
                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

subtask("printWethBalances", "Print accounts token balances")
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
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            const wethContract = ERC20__factory.connect(chainInfo.wethAddress, hre.ethers.provider);
            const balance = utils.formatUnits(
                await wethContract.balanceOf(account.address),
                await wethContract.decimals()
            );
            console.log(`#${accounts.indexOf(account)} Address: ${account.address} Balance: ${balance} WETH`);
        }
    });

subtask("printTokenBalance", "Print accounts token balances")
    .addParam("tokenAddress", "Token address", undefined, types.string)
    .addParam("walletAddress", "Account address")
    .setAction(async (taskArgs, hre) => {
        const address = taskArgs.walletAddress;

        const tokenContract = ERC20__factory.connect(taskArgs.tokenAddress, hre.ethers.provider);
        const balance = utils.formatUnits(
            await tokenContract.balanceOf(taskArgs.walletAddress),
            await tokenContract.decimals()
        );
        console.log(`Address: ${address} Balance: ${balance} ${await tokenContract.symbol()}`);
    });

task("sendEth", "Send ETH to address")
    .addParam("amount", "Amount to send", undefined, types.float)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("to", "Destination address", undefined, types.string)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.int)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addFlag("randomize", "Randomize account execution order")
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        let amount: BigNumber;
        if (taskArgs.dust) {
            amount = utils.parseEther(
                addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
            );
        } else {
            amount = utils.parseEther(taskArgs.amount.toString());
        }

        for (const account of accounts) {
            try {
                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                const balance = await account.getBalance();
                if (balance.gte(amount)) {
                    const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                    const txn = await account.sendTransaction({
                        to: taskArgs.to,
                        value: amount,
                        ...txParams,
                    });

                    console.log(
                        `Send ${utils.formatUnits(amount)} ETH to ${taskArgs.to} \ntxn: ${
                            chainInfo.explorer
                        }${txn.hash}`
                    );
                } else {
                    console.log(
                        `#${accounts.indexOf(account)} Address: ${
                            account.address
                        } not enought funds (${utils.formatEther(balance)})`
                    );
                }
                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("txCount", "Show account transaction count")
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(
                    `#${accounts.indexOf(account)} Address: ${
                        account.address
                    } Txn count: ${await account.getTransactionCount()}`
                );
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("approve", "Approve token to spender")
    .addParam("tokenAddress", "Token address", undefined, types.string)
    .addParam("spenderAddress", "Spender address", undefined, types.string)
    .addParam("amount", "Amount to deposit", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const tokenContract = ERC20__factory.connect(taskArgs.tokenAddress, hre.ethers.provider);
        const decimals = await tokenContract.decimals();
        const symbol = await tokenContract.symbol();

        for (const account of accounts) {
            let amount: BigNumber;
            if (taskArgs.all) {
                amount = await tokenContract.balanceOf(account.address);
            } else if (taskArgs.dust) {
                amount = utils.parseUnits(
                    addDust({
                        amount: taskArgs.amount,
                        upToPercent: taskArgs.dust,
                    }).toString(),
                    decimals
                );
            } else {
                amount = utils.parseUnits(taskArgs.amount.toString(), decimals);
            }

            console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

            await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

            const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
            const tx = await tokenContract
                .connect(account)
                .approve(taskArgs.spenderAddress, amount, { ...txParams });
            console.log(
                `Approved ${utils.formatUnits(amount, decimals)} ${symbol} tx ${chainInfo.explorer}${tx.hash}`
            );

            if (taskArgs.delay != undefined) {
                await delay(taskArgs.delay);
            }
        }
    });

task("testRpcMethod", "Test rpc")
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const zoraNetwork = {
            name: "Zora",
            chainId: 7777777,
        };
        const zoraProvider = new ethers.providers.StaticJsonRpcProvider("https://rpc.zora.co", zoraNetwork);
        zoraProvider.on("debug", console.log);
        console.log(zoraProvider.connection);

        const accounts = await getAccounts(taskArgs, zoraProvider);
        console.log(await accounts[0].getBalance());

        try {
            const network = await zoraProvider.getNetwork();
            console.log(network);
        } catch (error) {
            console.log(`Error when process account`);
            console.log(error);
        }
    });
