import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import "../../utils/Util.tasks";
import { delay, getAccounts } from "../../utils/Utils";
import { gmxProtocolInfo } from "./gmxProtocolInfo";

export const GmxTasks = {
    gmxStake: "gmxStake",
    gmxUnstake: "gmxUnstake",
};

task("gmxStake", "Stake GMX tokens")
    .addParam("amount", "Amount to deposit", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add delay", undefined, types.int, true)
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

        const GMX = ERC20__factory.connect(gmxProtocolInfo.gmxTokenAddress, hre.ethers.provider);

        const gmxDecimals = await GMX.decimals();

        const gmxRewardRouter = new hre.ethers.Contract(
            gmxProtocolInfo.gmxRewardRouterAddress,
            gmxProtocolInfo.gmxRewardRouterAbi,
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`Address ${account.address}`);

                let amount: BigNumber;

                const balanceOfGmx = await GMX.connect(account).balanceOf(account.address);
                if (taskArgs.all) {
                    amount = await GMX.connect(account).balanceOf(account.address);
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString(), gmxDecimals);
                }

                if (balanceOfGmx.isZero()) {
                    console.log(`Skip zero balance\n`);
                    continue;
                }

                if (balanceOfGmx.gt(amount))
                    throw new Error(
                        `Not enought GMX balance ${utils.formatUnits(
                            balanceOfGmx,
                            gmxDecimals
                        )}, required ${utils.formatUnits(amount, gmxDecimals)} `
                    );

                const allowance = await GMX.allowance(account.address, gmxProtocolInfo.stakedGmxAddress);
                if (allowance.lt(amount)) {
                    const approveTxn = await GMX.connect(account).approve(
                        gmxProtocolInfo.stakedGmxAddress,
                        amount
                    );
                    console.log(
                        `Add allowance ${utils.formatUnits(amount, gmxDecimals)} txn: ${approveTxn.hash}`
                    );
                }

                console.log(`Depositing ${utils.formatUnits(amount, gmxDecimals)} GMX ...`);

                const txn = await gmxRewardRouter.connect(account).stakeGmx(amount);
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

task("gmxUnstake", "Unstake GMX tokens")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addFlag("randomize", "Randomize accounts execution order")
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .addParam("delay", "Add delay", undefined, types.int, true)
    .setAction(async (taskArgs, hre) => {
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const sbfGMX = ERC20__factory.connect(gmxProtocolInfo.sbfGmxAddress, hre.ethers.provider);

        const sbfGmxDecimals = await sbfGMX.decimals();

        const gmxRewardRouter = new hre.ethers.Contract(
            gmxProtocolInfo.gmxRewardRouterAddress,
            gmxProtocolInfo.gmxRewardRouterAbi,
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                let amount: BigNumber = await sbfGMX.connect(account).balanceOf(account.address);

                console.log(`Unstaking ${utils.formatUnits(amount, sbfGmxDecimals)} GMX ...`);

                const txn = await gmxRewardRouter.connect(account).unstakeGmx(amount);
                console.log(`Unstake txn: ${txn.hash}`);
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

task("gmxCompound", "Compound rewards from stake")
    .addParam("delay", "Add delay in minutes", undefined, types.int, true)
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

        const gmxRewardRouter = new hre.ethers.Contract(
            gmxProtocolInfo.gmxRewardRouterAddress,
            gmxProtocolInfo.gmxRewardRouterAbi,
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const txn = await gmxRewardRouter
                    .connect(account)
                    .handleRewards(true, true, true, true, true, true, true);
                console.log(`Compound txn: ${txn.hash}`);

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
