import { ethers } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, populateTxnParams } from "../../utils/Utils";
import { log } from "@uniswap/smart-order-router";

task("philandDailyQuest", "Pliland dailty quest")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.poligonMainnet].includes(currentNetwork.chainId)) {
            console.log("Task available only at Poligon mainnet network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                console.log(`Making 8 transactions...`);

                for (let iteration = 1; iteration <= 8; iteration++) {
                    var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                    const dailyTx = await account.sendTransaction({
                        to: account.address,
                        value: ethers.constants.Zero,
                        ...txParams,
                    });
                    console.log(`Txn ${iteration}: ${chainInfo.explorer}${dailyTx.hash}`);

                    await dailyTx.wait();
                }

                console.log(`Transactions sended successfully!`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(
                    `\nError when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });
