import * as dotenv from "dotenv";
import { BigNumber, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { addDust, delay, getAccounts } from "../../utils/Utils";
import { OneInchTasks } from "../1inch/Swap.tasks";
import { AccountsTasks } from "../Account.tasks";
import ArbContractsInfo from "../arbitrum/ArbContractsInfo.json";
import { ArbitrumTasks } from "../arbitrum/Arbitrum.tasks";
import { GmxTasks } from "../GMX/gmx.tasks";
import { gmxProtocolInfo } from "../GMX/gmxProtocolInfo";
import { RageTradeTasks } from "../rage_trade/RageTrade.tasks";
import { StargateTasks } from "../stargate/stargate.tasks";
import { ACCOUNT_DELAY, TASK_DELAY } from "./RouteConstants";

dotenv.config();

task("routeArbitrumBalances", "Make some developer tasks")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at arbitrum mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);

        console.log(`\n--//-- Balances --//--\n`);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        if (accounts.length == 1) {
            await performRoute(accounts[0]);
        } else {
            for (const account of accounts) {
                taskArgs.accountIndex = accounts.indexOf(account).toString();
                await performRoute(account);
            }
        }

        async function performRoute(account: ethers.Wallet) {
            try {
                console.log(`\n### ${accounts.indexOf(account)} Address ${account.address} ###`);

                console.log(`\nGMX balance`);
                await hre.run(AccountsTasks.balances, {
                    ...taskArgs,
                    tokenAddress: gmxProtocolInfo.sbfGmxAddress,
                });

                console.log(`\nRageTrade liquidity balance`);
                await hre.run(RageTradeTasks.rageLiquidityBalances, taskArgs);

                console.log(`\nStargate liquidity balance`);
                await hre.run(StargateTasks.stargateStakingBalances, taskArgs);
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }
    });

task("routeDeveloper", "Make some developer tasks")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add delay between tasks", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        console.log("Route not implemented");
    });

task("routeArbitrumRageTrade8020", "Wrap eth -> swap to USDC -> add liquidity to RageTrade ")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account from selected range (from start account to end account) for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        await hre.run("warnIfMainnet");

        const baseAmount = taskArgs.amount;

        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at arbitrum mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);

        console.log(`\n--//-- Start arbitrum route tasks --//--\n`);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        // Calculate amount with dust
        taskArgs.amount = addDust({ amount: baseAmount, upToPercent: taskArgs.dust });
        taskArgs.delay = undefined;

        if (accounts.length == 1) {
            await performRoute(accounts[0]);
        } else {
            for (const account of accounts) {
                taskArgs.accountIndex = accounts.indexOf(account).toString();
                await performRoute(account);
                if (accounts.indexOf(account) < accounts.length) {
                    await delay(ACCOUNT_DELAY);
                }
            }
        }

        async function performRoute(account: ethers.Wallet) {
            try {
                console.log(`\n### Process address ${account.address} ###`);

                console.log(`\nStep 1 Wrap eth ...`); // Step 1
                await hre.run(AccountsTasks.wrapEth, taskArgs);
                await delay(TASK_DELAY);

                console.log(`\nStep 2 Swap WETH for USDC ...`); // Step 2
                await hre.run(OneInchTasks.oneInchSwap, {
                    ...taskArgs,
                    fromToken: chainInfo.wethAddress,
                    toToken: chainInfo.usdcAddress,
                });
                await delay(TASK_DELAY);

                console.log(`\nStep 3 Deposit liquidity to RageTrade ...`); // Step 3
                const USDC = ERC20__factory.connect(chainInfo.usdcAddress, hre.ethers.provider);
                const usdcDecimals = await USDC.decimals();
                const usdcBalance = utils.formatUnits(await USDC.balanceOf(account.address), usdcDecimals);
                console.log(`Deposit amount = ${usdcBalance} USDC`);

                await hre.run(RageTradeTasks.rageAddLiquidity8020, {
                    ...taskArgs,
                    amount: usdcBalance,
                });

                console.log(`Waiting for next account`);
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }
    });

task("routeArbitrumRageTradeDnRiskOn", "Wrap eth -> swap to USDC -> add liquidity to RageTrade ")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addParam("routeDelay", "Delay beetween accounts", undefined, types.int, true)
    .addParam("stepDelay", "Delay beetween steps in route", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account from selected range (from start account to end account) for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        await hre.run("warnIfMainnet");

        const baseAmount = taskArgs.amount;

        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at arbitrum mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);

        console.log(`\n--//-- Start arbitrum route tasks --//--\n`);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        // Calculate amount with dust
        taskArgs.amount = addDust({ amount: baseAmount, upToPercent: taskArgs.dust });
        taskArgs.delay = undefined;

        if (accounts.length == 1) {
            await performRoute(accounts[0]);
        } else {
            for (const account of accounts) {
                taskArgs.accountIndex = accounts.indexOf(account).toString();
                await performRoute(account);
                if (accounts.indexOf(account) < accounts.length) {
                    await delay(taskArgs.routeDelay);
                }
            }
        }

        async function performRoute(account: ethers.Wallet) {
            try {
                console.log(`\n### Process address ${account.address} ###`);

                console.log(`\nStep 1 Wrap eth ...`); // Step 1
                await hre.run(AccountsTasks.wrapEth, taskArgs);
                await delay(taskArgs.stepDelay);

                console.log(`\nStep 2 Swap WETH for USDC ...`); // Step 2
                await hre.run(OneInchTasks.oneInchSwap, {
                    ...taskArgs,
                    fromToken: chainInfo.wethAddress,
                    toToken: chainInfo.usdcAddress,
                });
                await delay(taskArgs.stepDelay);

                console.log(`\nStep 3 Deposit liquidity to RageTrade ...`); // Step 3
                const USDC = ERC20__factory.connect(chainInfo.usdcAddress, hre.ethers.provider);
                const usdcDecimals = await USDC.decimals();
                const usdcBalance = utils.formatUnits(await USDC.balanceOf(account.address), usdcDecimals);
                console.log(`Deposit amount = ${usdcBalance} USDC`);

                await hre.run(RageTradeTasks.rageAddLiquidityDnRiskOnVault, {
                    ...taskArgs,
                    amount: usdcBalance,
                });

                console.log(`Waiting for next account`);
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }
    });

task("routeArbitrumGmxStaker", "Stake GMX tokens")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add delay between tasks", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const gmxTokenAddress = "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a";

        await hre.run("warnIfMainnet");

        taskArgs.delay = TASK_DELAY;
        const baseAmount = taskArgs.amount;

        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at arbitrum mainnet");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);

        console.log(`\n--//-- Start arbitrum route tasks --//--\n`);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        taskArgs.amount = addDust({ amount: baseAmount, upToPercent: taskArgs.dust });
        taskArgs.delay = undefined;

        if (accounts.length == 1) {
            await performRoute(accounts[0]);
        } else {
            for (const account of accounts) {
                taskArgs.accountIndex = accounts.indexOf(account).toString();
                await performRoute(account);
                if (accounts.indexOf(account) < accounts.length) {
                    await delay(ACCOUNT_DELAY);
                }
            }
        }

        async function performRoute(account: ethers.Wallet) {
            try {
                console.log(`\n### Process address ${account.address} ###`);

                console.log(`\nStep 1 Wrap eth ...`); // Step 1
                await hre.run(AccountsTasks.wrapEth, taskArgs);
                await delay(TASK_DELAY);

                console.log(`\nStep 2 Swap WETH for USDC ...`); // Step 2
                await hre.run(OneInchTasks.oneInchSwap, {
                    ...taskArgs,
                    all: true,
                    fromToken: chainInfo.wethAddress,
                    toToken: chainInfo.usdcAddress,
                });
                await delay(TASK_DELAY);

                console.log(`\nStep 3 Swap USDC to GMX ...`); // Step 3
                await hre.run(OneInchTasks.oneInchSwap, {
                    ...taskArgs,
                    all: true,
                    fromToken: chainInfo.usdcAddress,
                    toToken: gmxTokenAddress,
                });
                await delay(TASK_DELAY);

                console.log(`\nStep 4 Stake GMX ...`); // Step 4
                await hre.run(GmxTasks.gmxStake, {
                    ...taskArgs,
                    all: true,
                });

                console.log(`\nWaiting for next account`);
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }
    });

task("routeArbitrumStargateStaker", "Trade tokens on dex")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add delay between tasks", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const stgTokenAddress = "0x6694340fc020c5e6b96567843da2df01b2ce1eb6";

        await hre.run("warnIfMainnet");

        taskArgs.delay = TASK_DELAY;
        const baseAmount = taskArgs.amount;

        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at arbitrum mainnet");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);

        console.log(`\n--//-- Start arbitrum route tasks --//--\n`);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        taskArgs.amount = addDust({ amount: baseAmount, upToPercent: taskArgs.dust });
        taskArgs.delay = undefined;

        if (accounts.length == 1) {
            await performRoute(accounts[0]);
        } else {
            for (const account of accounts) {
                taskArgs.accountIndex = accounts.indexOf(account).toString();
                await performRoute(account);
                if (accounts.indexOf(account) < accounts.length) {
                    await delay(ACCOUNT_DELAY);
                }
            }
        }

        async function performRoute(account: ethers.Wallet) {
            try {
                console.log(`\n### Process address ${account.address} ###`);

                // console.log(`\nStep 1 Wrap eth ...`); // Step 1
                // await hre.run(AccountsTasks.wrapEth, taskArgs);
                // await delay(TASK_DELAY);

                // console.log(`\nStep 2 Swap WETH for USDC ...`); // Step 2
                // await hre.run(OneInchTasks.oneInchSwap, {
                //     ...taskArgs,
                //     all: true,
                //     fromToken: chainInfo.wethAddress,
                //     toToken: chainInfo.usdcAddress,
                // });
                // await delay(TASK_DELAY);

                console.log(`\nStep 1 Swap ETH to STG ...`); // Step 3
                await hre.run(OneInchTasks.oneInchSwap, {
                    ...taskArgs,
                    // fromToken: chainInfo.usdcAddress,
                    toToken: stgTokenAddress,
                });
                await delay(TASK_DELAY);

                console.log(`\nStep 2 Stake STG ...`); // Step 4
                await hre.run(StargateTasks.stargateStake, {
                    ...taskArgs,
                    all: true,
                });

                console.log(`\nWaiting for next account`);
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }
    });

task("routeArbitrumDexTrade", "Wrap eth -> swap to USDC -> swap to buying token ")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addParam("buyTokenAddress", "Token to buy", undefined, types.string)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account from selected range (from start account to end account) for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        await hre.run("warnIfMainnet");

        const TOKEN_ADDRESS = taskArgs.buyTokenAddress;

        taskArgs.delay = TASK_DELAY;
        const baseAmount = taskArgs.amount;

        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at arbitrum mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);

        console.log(`\n--//-- Start arbitrum route routeArbitrumDexTrade --//--\n`);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        // Calculate amount with dust

        taskArgs.delay = undefined;

        if (accounts.length == 1) {
            await performRoute(accounts[0]);
        } else {
            for (const account of accounts) {
                taskArgs.accountIndex = accounts.indexOf(account).toString();
                console.log(`\n### №${accounts.indexOf(account)} Process address ${account.address} ###`);
                await performRoute(account);
                if (accounts.indexOf(account) < accounts.length) {
                    await delay(ACCOUNT_DELAY);
                }
            }
        }

        async function performRoute(account: ethers.Wallet) {
            try {
                taskArgs.amount = addDust({ amount: baseAmount, upToPercent: taskArgs.dust });

                console.log(`\nStep 1 Wrap eth ...`);
                await hre.run(AccountsTasks.wrapEth, taskArgs);
                await delay(TASK_DELAY);

                console.log(`\nStep 2 Swap WETH for USDC ...`);
                await hre.run(OneInchTasks.oneInchSwap, {
                    ...taskArgs,
                    fromToken: chainInfo.wethAddress,
                    toToken: chainInfo.usdcAddress,
                });
                await delay(TASK_DELAY);

                console.log(`\nStep 3 Swap USDC for Tokens ...`);
                await hre.run(OneInchTasks.oneInchSwap, {
                    ...taskArgs,
                    all: true,
                    fromToken: chainInfo.usdcAddress,
                    toToken: TOKEN_ADDRESS,
                });

                console.log(`\nWaiting for next account`);
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }
    });

task("routeArbitrumSellAirdrop", "Wait for claim start and sell tokens")
    .addParam("buyTokenAddress", "Token to buy", undefined, types.string, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account from selected range (from start account to end account) for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        // await hre.run("warnIfMainnet");

        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at arbitrum mainnet");
            return;
        }
        const arbToken = ERC20__factory.connect(ArbContractsInfo.tokenAddress, hre.ethers.provider);
        const arbDecimals = await arbToken.decimals();
        const arbTicker = await arbToken.symbol();

        const claimContract = new hre.ethers.Contract(
            ArbContractsInfo.claimContractAddress,
            ArbContractsInfo.claimContractAbi,
            hre.ethers.provider
        );

        const claimPeriodStartBlock = ((await claimContract.claimPeriodStart()) as BigNumber).toNumber();

        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (taskArgs.buyTokenAddress == undefined) {
            taskArgs.buyTokenAddress = chainInfo.wethAddress;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        console.log(`\n--//-- Start arbitrum route sellAirdrop  ${await arbToken.name()}--//--\n`);

        await waitForClaimStart();

        if (accounts.length == 1) {
            await performRoute(accounts[0]);
        } else {
            for (const account of accounts) {
                taskArgs.accountIndex = accounts.indexOf(account).toString();
                await performRoute(account);
            }
        }

        async function performRoute(account: ethers.Wallet) {
            try {
                console.log(`\n### Process address ${account.address} ###`);

                await hre.run(ArbitrumTasks.arbitrumClaimDrop, {
                    ...taskArgs,
                    waitClaimStart: false,
                });

                await hre.run(OneInchTasks.oneInchSwap, {
                    ...taskArgs,
                    all: true,
                    fromToken: arbToken.address,
                    toToken: taskArgs.buyTokenAddress,
                });
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }

        async function waitForClaimStart(): Promise<void> {
            let ethProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_URL);
            let currentBlockNumber = await ethProvider.getBlockNumber();

            while (currentBlockNumber < claimPeriodStartBlock) {
                console.log(
                    `Block ${currentBlockNumber}. Waiting for claim start at block ${claimPeriodStartBlock}...`
                );
                await new Promise((r) => setTimeout(r, 3_000));
                currentBlockNumber = await ethProvider.getBlockNumber();
            }
        }
    });
