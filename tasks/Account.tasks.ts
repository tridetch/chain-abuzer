import * as dotenv from "dotenv";
import { BigNumber, ethers, utils } from "ethers";
import { subtask, task, types } from "hardhat/config";
import { ERC20__factory } from "../typechain-types";
import { ChainId, getChainInfo } from "../utils/ChainInfoUtils";
import "../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams, shuffle, waitForGasPrice } from "../utils/Utils";

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
    .addParam("amount", "Amount to wrap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
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
                    const minBalance = utils.parseEther(addDust({ amount: taskArgs.minBalance }).toString());
                    amount = (await account.getBalance()).sub(minBalance);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.addDust }).toString()
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString());
                }

                const balance = await account.getBalance();
                if (balance.gte(amount)) {
                    await waitForGasPrice({
                        maxPriceInGwei: taskArgs.gasPrice,
                        provider: hre.ethers.provider,
                    });

                    const txn = await wethContract.connect(account).deposit({ value: amount });
                    console.log(
                        `#${accounts.indexOf(account)} Deposit ${utils.formatUnits(amount)} WETH to ${
                            account.address
                        } txn: ${chainInfo.explorer}${txn.hash}`
                    );
                } else {
                    console.log(
                        `#${accounts.indexOf(account)} Skip ${
                            account.address
                        } - not enought funds (${utils.formatEther(balance)})`
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
                    console.log(
                        `#${accounts.indexOf(account)} Address: ${account.address} WETH withdraw txn: ${
                            chainInfo.explorer
                        }${txn.hash}`
                    );
                    if (taskArgs.delay != undefined) {
                        await delay(taskArgs.delay);
                    }
                } else {
                    console.log(
                        `#${accounts.indexOf(account)} ${
                            account.address
                        } Skip - not enought funds (${utils.formatUnits(amount)})`
                    );
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
    .addParam("amount", "Amount to appove", undefined, types.float, true)
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
            await tx.wait();
            
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

task("ethereumContractInteractions", "Interact with erc-20 contracts")
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("interactions", "Number of contracts to interact", undefined, types.int, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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

        if (network.chainId != ChainId.ethereumMainnet) {
            throw new Error("Task allowed only on Ethereum Mainnet");
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const erc20Contracts = [
            ERC20__factory.connect("0xdac17f958d2ee523a2206206994597c13d831ec7", hre.ethers.provider),
            ERC20__factory.connect("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", hre.ethers.provider),
            ERC20__factory.connect("0xae7ab96520de3a18e5e111b5eaab095312d7fe84", hre.ethers.provider),
            ERC20__factory.connect("0x514910771af9ca656af840dff83e8264ecf986ca", hre.ethers.provider),
            ERC20__factory.connect("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", hre.ethers.provider),
            ERC20__factory.connect("0x6b175474e89094c44da98b954eedeac495271d0f", hre.ethers.provider),
            ERC20__factory.connect("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", hre.ethers.provider),
            ERC20__factory.connect("0xae78736cd615f374d3085123a210448e74fc6393", hre.ethers.provider),
            ERC20__factory.connect("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", hre.ethers.provider),
            ERC20__factory.connect("0xd33526068d116ce69f19a9ee46f0bd304f21a51f", hre.ethers.provider),
            ERC20__factory.connect("0x111111111117dc0aa78b770fa6a738034120c302", hre.ethers.provider),
            ERC20__factory.connect("0x6810e776880c02933d47db1b9fc05908e5386b96", hre.ethers.provider),
            ERC20__factory.connect("0x6123b0049f904d730db3c36a31167d9d4121fa6b", hre.ethers.provider),
            ERC20__factory.connect("0xdeFA4e8a7bcBA345F687a2f1456F5Edd9CE97202", hre.ethers.provider),
            ERC20__factory.connect("0x582d872a1b094fc48f5de31d3b73f2d9be47def1", hre.ethers.provider),
            ERC20__factory.connect("0xb50721bcf8d664c30412cfbc6cf7a15145234ad1", hre.ethers.provider),
            ERC20__factory.connect("0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", hre.ethers.provider),
            ERC20__factory.connect("0xe28b3b32b6c345a34ff64674606124dd5aceca30", hre.ethers.provider),
            ERC20__factory.connect("0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2", hre.ethers.provider),
            ERC20__factory.connect("0xc944e90c64b2c07662a292be6244bdf05cda44a7", hre.ethers.provider),
            ERC20__factory.connect("0xae78736cd615f374d3085123a210448e74fc6393", hre.ethers.provider),
            ERC20__factory.connect("0xf57e7e7c23978c3caec3c3548e3d615c346e79ff", hre.ethers.provider),
            ERC20__factory.connect("0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f", hre.ethers.provider),
            ERC20__factory.connect("0x0f5d2fb29fb7d3cfee444a200298f468908cc942", hre.ethers.provider),
            ERC20__factory.connect("0xbb0e17ef65f82ab018d8edd776e8dd940327b28b", hre.ethers.provider),
            ERC20__factory.connect("0xd1d2eb1b1e90b638588728b4130137d262c87cae", hre.ethers.provider),
            ERC20__factory.connect("0xd533a949740bb3306d119cc777fa900ba034cd52", hre.ethers.provider),
            ERC20__factory.connect("0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", hre.ethers.provider),
            ERC20__factory.connect("0x0000000000085d4780b73119b644ae5ecd22b376", hre.ethers.provider),
            ERC20__factory.connect("0x4fabb145d64652a948d72533023f6e7a623c7c53", hre.ethers.provider),
        ];

        const spenderAddress = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"; //Uniswap
        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                var erc20Shuffled = shuffle(erc20Contracts);

                if (taskArgs.interactions <= erc20Shuffled.length) {
                    erc20Shuffled = erc20Shuffled.slice(undefined, taskArgs.interactions);
                }

                for (const erc20 of erc20Shuffled) {
                    await waitForGasPrice({
                        maxPriceInGwei: taskArgs.gasPrice,
                        provider: hre.ethers.provider,
                    });

                    var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                    const tx = await erc20
                        .connect(account)
                        .approve(spenderAddress, BigNumber.from(0), { ...txParams });
                    console.log(`Approve ${await erc20.symbol()} tx ${chainInfo.explorer}${tx.hash}`);
                    await delay(0.1);
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
