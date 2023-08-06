import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as zksync from "zksync";
import { addDust, delay, getAccounts } from "../../utils/Utils";

export const ZkSyncMainnetTasks = {
    zksyncBalances: "zksyncBalances",
    zksyncDeposit: "zksyncDeposit",
    zksyncWithdraw: "zksyncWithdraw",
};

export async function setupZkSync(hre: HardhatRuntimeEnvironment, taskArgs: any) {
    const ethProvider = hre.ethers.provider;
    const zkSyncProvider = await zksync.getDefaultProvider("mainnet");

    const accounts = await getAccounts(taskArgs, hre.ethers.provider);

    return { ethProvider, zkSyncProvider, accounts };
}

task("zksyncLiteBalances", "Print zksync balances")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const { ethProvider, zkSyncProvider, accounts } = await setupZkSync(hre, taskArgs);

        for (const account of accounts) {
            try {
                const syncWallet = await zksync.Wallet.fromEthSigner(account, zkSyncProvider);
                console.log(
                    `#${accounts.indexOf(account)} Address: ${
                        account.address
                    } Balance ${hre.ethers.utils.formatEther(await syncWallet.getBalance("ETH"))}`
                );
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("zksyncLiteDeposit", "Deposit to zksync from Ethereum")
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float)
    .addFlag("dust", "Dust percentage")
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
        const { ethProvider, zkSyncProvider, accounts } = await setupZkSync(hre, taskArgs);

        for (const account of accounts) {
            try {
                const syncWallet = await zksync.Wallet.fromEthSigner(account, zkSyncProvider);

                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = utils.parseEther(addDust({ amount: taskArgs.amount }).toString());
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                const deposit = await syncWallet.depositToSyncFromEthereum({
                    depositTo: syncWallet.address(),
                    token: "ETH",
                    amount: amount,
                });

                console.log(
                    `\n${utils.formatEther(amount)} ETH deposited to ${account.address}\nTxn: ${
                        deposit.ethTx.hash
                    }`
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

task("zksyncLiteWithdraw", "Withdraw from zksync to Ethereum")
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float)
    .addParam("delay", "Delay between", undefined, types.int, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const { ethProvider, zkSyncProvider, accounts } = await setupZkSync(hre, taskArgs);

        for (const account of accounts) {
            try {
                const syncWallet = await zksync.Wallet.fromEthSigner(account, zkSyncProvider);

                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await syncWallet.getBalance("ETH");
                } else if (taskArgs.dust) {
                    amount = utils.parseEther(addDust({ amount: taskArgs.amount }).toString());
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                const withdraw = await syncWallet.withdrawFromSyncToEthereum({
                    ethAddress: account.address,
                    token: "ETH",
                    amount: amount,
                });

                console.log(
                    `${utils.formatEther(amount)} ETH withdrawed from ${account.address}\nTxn: ${
                        withdraw.txHash
                    }`
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

task("zksyncLiteDisperse", "Disperse to accounts")
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addFlag("dust", "Dust percentage")
    .addFlag("all", "All balance")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("delay", "Add delay", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.int)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.int)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const { ethProvider, zkSyncProvider, accounts } = await setupZkSync(hre, taskArgs);

        let index = taskArgs.startAccount + 30;
        taskArgs.startAccount = undefined;
        taskArgs.endAccount = undefined;

        const allAccounts = await getAccounts(taskArgs, ethProvider);
        for (const account of accounts) {
            try {
                const syncWallet = await zksync.Wallet.fromEthSigner(account, zkSyncProvider);
                const targetAddress = allAccounts[index].address;
                index += 1;

                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = utils.parseEther(addDust({ amount: taskArgs.amount }).toString());
                } else if (taskArgs.all) {
                    const minimumBalance = utils.parseEther(
                        addDust({ amount: taskArgs.minBalance, upToPercent: 30 }).toString()
                    );
                    amount = BigNumber.from(
                        (await syncWallet.getBalance("ETH"))
                            .sub(minimumBalance)
                            .toString()
                            .slice(undefined, -9) + "000000000"
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                console.log(
                    `From ${account.address} transfered to ${targetAddress} amount ${utils.formatEther(
                        amount
                    )}`
                );

                await syncWallet.syncTransfer({
                    to: targetAddress,
                    amount: amount,
                    token: `ETH`,
                });

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

task("zksyncLiteActivate", "Activate account")
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
        const { ethProvider, zkSyncProvider, accounts } = await setupZkSync(hre, taskArgs);

        for (const account of accounts) {
            try {
                const syncWallet = await zksync.Wallet.fromEthSigner(account, zkSyncProvider);
                const activateTx = await syncWallet.setSigningKey({
                    feeToken: "ETH",
                    ethAuthType: "ECDSA",
                });

                await activateTx.awaitReceipt();

                console.log(`#${accounts.indexOf(account)} Address: ${account.address} activated}`);
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
