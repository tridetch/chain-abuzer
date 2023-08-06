import { core, getAccountIdsByAddress, getAccountInfo, getNetworkNameFromChainId } from "@ragetrade/sdk";
import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts } from "../../utils/Utils";

export const RageTradeTasks = {
    rageAccountsInfo: "rageAccountsInfo",
    rageCreateAccounts: "rageCreateAccounts",
    rageDepositTradingAccount: "rageDepositTradingAccount",
    rageAddLiquidity8020: "rageAddLiquidity8020",
    rageAddLiquidityDnRiskOnVault: "rageAddLiquidityDnRiskOnVault",
    rageLiquidityBalances: "rageLiquidityBalances",
};

task("rageAccountsInfo", "Print Rage Trade accounts info")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const networkName = getNetworkNameFromChainId((await hre.ethers.provider.getNetwork()).chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const accountIds = await getAccountIdsByAddress(account.address, networkName);
                console.log(`Id's: `, accountIds);
                // prints out all collaterals, token positions, liquidity positions for the account
                for (const id of accountIds) {
                    const accountInfo = await getAccountInfo(id, networkName);
                    console.log(`Account Info: `, accountInfo);
                    console.log("\n");
                }
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("rageCreateAccounts", "Create accounts for trade")
    .addParam("delay", "Add delay", undefined, types.int, true)
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

        for (const account of accounts) {
            try {
                const { clearingHouse } = await core.getContracts(account);
                const myAccountNum = await clearingHouse.connect(account).callStatic.createAccount();
                console.log(`Trading account number: ${myAccountNum}`);
                const tx = await clearingHouse.connect(account).createAccount();
                await tx.wait();
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

task("rageDepositTradingAccount", "Deposi funds to account")
    .addParam("amount", "Amount to deposit", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add delay", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const networkName = getNetworkNameFromChainId((await hre.ethers.provider.getNetwork()).chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const chainInfo = getChainInfo(hre.ethers.provider.network.chainId);
        const USDC = ERC20__factory.connect(chainInfo.usdcAddress, hre.ethers.provider);

        const usdcDecimals = await USDC.decimals();

        for (const account of accounts) {
            try {
                let amount: BigNumber;

                if (taskArgs.all) {
                    amount = await USDC.connect(account).balanceOf(account.address);
                } else {
                    amount = utils.parseUnits(taskArgs.amount, usdcDecimals);
                }

                const { clearingHouse } = await core.getContracts(account);

                const accountIds = await getAccountIdsByAddress(account.address, networkName);
                const accountNo = accountIds[0];

                console.log(`Depositing funds to Id: ${accountNo} Address: ${account.address} ...`);

                const allowance = await USDC.allowance(account.address, clearingHouse.address);
                if (allowance.lt(amount)) {
                    const approveTxn = await USDC.approve(clearingHouse.address, amount);
                    console.log(
                        `Add allowance ${utils.formatUnits(amount, usdcDecimals)} txn - ${approveTxn.hash}`
                    );
                }

                const tx2 = await clearingHouse.updateMargin(
                    accountNo,
                    "0x" + USDC.address.slice(34, 42),
                    amount
                );
                console.log(`Deposited ${utils.formatUnits(amount, usdcDecimals)} txn - ${tx2.hash}`);
                console.log("\n");
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

task("rageAddLiquidity8020", "Add USDC liquidity to pool")
    .addParam("amount", "Amount to deposit", undefined, undefined, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add delay", undefined, types.int, true)
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

        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const USDC = ERC20__factory.connect(chainInfo.usdcAddress, hre.ethers.provider);

        const usdcDecimals = await USDC.decimals();

        const vaultContractInfo = require("./VaultPeriphery.json");
        const vaultPeriphery = new hre.ethers.Contract(
            vaultContractInfo.address,
            vaultContractInfo.abi,
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                let amount: BigNumber;

                if (taskArgs.all) {
                    amount = await USDC.connect(account).balanceOf(account.address);
                } else {
                    amount = utils.parseUnits(taskArgs.amount, usdcDecimals);
                }

                if (amount.isZero()) {
                    console.log(`Skip zero balance`);
                    continue;
                }

                const allowance = await USDC.allowance(account.address, vaultContractInfo.address);
                if (allowance.lt(amount)) {
                    const approveTxn = await USDC.connect(account).approve(vaultContractInfo.address, amount);
                    console.log(
                        `Add allowance ${utils.formatUnits(amount, usdcDecimals)} txn: ${approveTxn.hash}`
                    );
                }

                console.log(`Depositing ${utils.formatUnits(amount, usdcDecimals)} USDC ...`);

                const txn = await vaultPeriphery.connect(account).depositUsdc(amount, {
                    gasLimit: utils.parseUnits("6000000", "wei"),
                    gasPrice: await hre.ethers.provider.getGasPrice(),
                });
                console.log(`Deposit txn: ${txn.hash}`);
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

task("rageAddLiquidityDnRiskOnVault", "Add USDC liquidity to pool")
    .addParam("amount", "Amount to deposit", undefined, undefined, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add delay", undefined, types.int, true)
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

        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const USDC = ERC20__factory.connect(chainInfo.usdcAddress, hre.ethers.provider);

        const usdcDecimals = await USDC.decimals();

        const dnGmxRouterContractInfo = require("./DnGmxRouter.json");
        const dnGmxRouterContract = new hre.ethers.Contract(
            dnGmxRouterContractInfo.address,
            dnGmxRouterContractInfo.abi,
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                let amount: BigNumber;

                if (taskArgs.all) {
                    amount = await USDC.connect(account).balanceOf(account.address);
                } else {
                    amount = utils.parseUnits(taskArgs.amount, usdcDecimals);
                }

                const allowance = await USDC.allowance(account.address, dnGmxRouterContractInfo.address);
                if (allowance.lt(amount)) {
                    const approveTxn = await USDC.connect(account).approve(
                        dnGmxRouterContractInfo.address,
                        amount
                    );
                    console.log(
                        `Add allowance ${utils.formatUnits(amount, usdcDecimals)} txn: ${approveTxn.hash}`
                    );
                }

                console.log(`Depositing ${utils.formatUnits(amount, usdcDecimals)} USDC ...`);

                const txn = await dnGmxRouterContract
                    .connect(account)
                    .depositToken(chainInfo.usdcAddress, account.address, amount);
                console.log(`Deposit txn: ${txn.hash}`);
                console.log("\n");
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

task("rageWithdrawLiquidityDnRiskOnVault", "Withdraw USDC liquidity from pool")
    .addParam("delay", "Add delay", undefined, types.int, true)
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

        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);

        const DN_GMX_JUNIOR_ADDRESS = "0x8478AB5064EbAC770DdCE77E7D31D969205F041E";
        const DN_GMX_JUNIOR = ERC20__factory.connect(DN_GMX_JUNIOR_ADDRESS, hre.ethers.provider);
        const gmxDecimal = await DN_GMX_JUNIOR.decimals();

        const dnGmxVaultContractAddress = "0xba55d7f67fa22df5e92487d5b306ddb1aa543d10";
        const dnGmxVaultContract = new hre.ethers.Contract(
            dnGmxVaultContractAddress,
            ["function redeemToken(address token, address receiver, uint256 sharesAmount)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                let amount: BigNumber = await DN_GMX_JUNIOR.connect(account).balanceOf(account.address);

                if (amount.isZero()) {
                    console.log(
                        `#${accounts.indexOf(account)} Address: ${account.address} skip zero balance`
                    );
                    continue;
                }

                const allowance = await DN_GMX_JUNIOR.allowance(account.address, dnGmxVaultContractAddress);
                if (allowance.lt(amount)) {
                    const approveTxn = await DN_GMX_JUNIOR.connect(account).approve(
                        dnGmxVaultContractAddress,
                        amount
                    );
                    console.log(
                        `Add allowance ${utils.formatUnits(amount, gmxDecimal)} txn: ${approveTxn.hash}`
                    );
                }

                const txn = await dnGmxVaultContract
                    .connect(account)
                    .redeemToken(chainInfo.usdcAddress, account.address, amount, {
                        gasLimit: utils.parseUnits("11000000", "wei"),
                        gasPrice: await hre.ethers.provider.getGasPrice(),
                    });

                console.log(
                    `#${accounts.indexOf(account)} Address: ${account.address} Withdraw txn: ${txn.hash}`
                );
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

task("rageLiquidityBalances", "Print account balances")
    .addFlag("withdrawall", "Withdraw all liquidity")
    .addParam("delay", "Add delay", undefined, types.int, true)
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

        const rageTradeYeldContractInfo = require("./RageTradeYeldContract.json");
        const rageTradeYeldContract = new hre.ethers.Contract(
            rageTradeYeldContractInfo.address,
            rageTradeYeldContractInfo.abi,
            hre.ethers.provider
        );
        const rageTradeYeldTokenDecimals = await rageTradeYeldContract.decimals();

        const curvePoolContractsInfo = require("./CurvePoolContracts.json");
        const tricriptoLpToken = ERC20__factory.connect(curvePoolContractsInfo.lpToken, hre.ethers.provider);
        const curveCryptoSwapDepositZap = new hre.ethers.Contract(
            curvePoolContractsInfo.curveCryptoSwapAddress,
            curvePoolContractsInfo.curveCryptoSwapAbi,
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const redeemAmount: BigNumber = await rageTradeYeldContract
                    .connect(account)
                    .maxRedeem(account.address);
                if (redeemAmount.isZero()) {
                    console.log(`#${accounts.indexOf(account)} Address: ${account.address} empty balance`);
                    continue;
                }
                const marketValue = await rageTradeYeldContract.connect(account).getMarketValue(redeemAmount);

                console.log(
                    `\n#${accounts.indexOf(account)} Address: ${
                        account.address
                    } Liquidity amount = ${utils.formatUnits(
                        redeemAmount,
                        rageTradeYeldTokenDecimals
                    )} Market value = ${utils.formatUnits(marketValue, 6 /* For USDC */)} USDC`
                );

                if (taskArgs.withdrawall) {
                    // Withdraw from Rage Yeld contract
                    console.log("Withdrawing...");
                    const balance = await rageTradeYeldContract.connect(account).balanceOf(account.address);
                    const withdrawTxn = await rageTradeYeldContract
                        .connect(account)
                        .redeem(balance, account.address, account.address);
                    console.log(`Reedem from yeld contract ${withdrawTxn.hash}`);
                    await withdrawTxn.wait()

                    // // Get balance of LP tokent
                    const lpTokenAmount = await tricriptoLpToken.connect(account).balanceOf(account.address);
                    const approveTxn = await tricriptoLpToken
                        .connect(account)
                        .approve(curveCryptoSwapDepositZap.address, lpTokenAmount);
                    console.log(`Approve txn ${approveTxn.hash}`);
                    await approveTxn.wait()

                    // Withdraw liquidity in one ETH
                    const withdrawEthTxn = await curveCryptoSwapDepositZap
                        .connect(account)
                        .remove_liquidity_one_coin(
                            lpTokenAmount,
                            2 /* token id in pool (ETH) */,
                            lpTokenAmount.div(BigNumber.from(2)) /* min amount */
                        );
                    console.log(`ETH withdraw txn ${withdrawEthTxn.hash}`);
                    if (taskArgs.delay != undefined) {
                        await delay(taskArgs.delay);
                    }
                }
            } catch (error) {
                console.log(
                    `#${accounts.indexOf(account)} Address: ${account.address} Error when process account`
                );
                console.log(error);
            }
        }
    });

task("rageContractsInfo", "Deposit liquidity into the pool").setAction(async (taskArgs, hre) => {
    const networkName = getNetworkNameFromChainId((await hre.ethers.provider.getNetwork()).chainId);
    const accounts = await getAccounts(taskArgs, hre.ethers.provider);

    const chainInfo = getChainInfo(hre.ethers.provider.network.chainId);
    const USDC = ERC20__factory.connect(chainInfo.usdcAddress, hre.ethers.provider);
    const usdcDecimals = await USDC.decimals();

    const contracts = await core.getContracts(hre.ethers.provider);
    const deployments = core.getDeployments(networkName);

    for (const account of accounts) {
        const accountIds = await getAccountIdsByAddress(account.address, networkName);
        const accountNo = accountIds[0];

        console.log("Deployments:", deployments);

        console.log("contracts.accountLib: ", contracts.accountLib.address);
        console.log("contracts.clearingHouse: ", contracts.clearingHouse.address);
        console.log("contracts.clearingHouseLens: ", contracts.clearingHouseLens.address);
        console.log("contracts.clearingHouseLogic: ", contracts.clearingHouseLogic.address);
        console.log("contracts.eth_oracle: ", contracts.eth_oracle.address);
        console.log("contracts.eth_vPoolWrapper: ", contracts.eth_vPoolWrapper.address);
        console.log("contracts.eth_vToken: ", contracts.eth_vToken.address);
        console.log("contracts.insuranceFund: ", contracts.insuranceFund.address);
        console.log("contracts.proxyAdmin: ", contracts.proxyAdmin.address);
        console.log("contracts.rageTradeFactory: ", contracts.rageTradeFactory.address);
        console.log("contracts.settlementToken: ", contracts.settlementToken.address);
        console.log("contracts.swapSimulator: ", contracts.swapSimulator.address);
        console.log("contracts.timelock: ", contracts.timelock.address);
        console.log("contracts.vPoolWrapperLogic: ", contracts.vPoolWrapperLogic.address);
        console.log("contracts.vQuote: ", contracts.vQuote.address);
        console.log("contracts.vQuote: ", contracts.vQuote.address);

        break; // TEST WITH FIRST ACCOUNT!!!
    }
});
