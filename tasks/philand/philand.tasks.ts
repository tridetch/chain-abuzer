import { Contract, ethers } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, populateTxnParams } from "../../utils/Utils";

import axios from "axios";

interface QuestResult {
    message: string;
    day: number;
    expiresIn: number;
    coupons: CouponInfo[];
}

interface CouponInfo {
    logic: number;
    coupon: Coupon;
}

interface Coupon {
    r: string;
    s: string;
    v: string;
}

task("philandDailyQuest", "Philand dailty quest")
    .addFlag("claim", "Only try to claim quests")
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

        const questContractAddress = "0xa4a057e817a220e4a9466e7877adbdb917a9d8d9";

        const questContract = new Contract(questContractAddress, [
            "function claimMaterialObject(uint32 eventId, uint16 logicId, (bytes32 r, bytes32 s, uint8 v) coupon, uint256 expiresIn)",
        ]);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                if (!taskArgs.claim) {
                    console.log(`Making transactions...`);

                    for (let iteration = 1; iteration <= 10; iteration++) {
                        var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                        const dailyTx = await account.sendTransaction({
                            to: account.address,
                            value: ethers.constants.Zero,
                            ...txParams,
                        });
                        console.log(`Txn ${iteration}: ${chainInfo.explorer}${dailyTx.hash}`);

                        await dailyTx.wait();
                    }

                    console.log(`Transactions sended successfully! Wait when they will be indexed.`);
                    await delay(0.2)
                }

                const questResult: QuestResult = (
                    await axios.get(
                        `https://utils-api.phi.blue/v1/philand/dailyquest/verify?address=${account.address}`
                    )
                ).data;

                // console.log(JSON.stringify(questResult));

                for (const couponInfo of questResult.coupons) {
                    try {
                        var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                        const claimTx = await questContract.connect(account).claimMaterialObject(
                            questResult.day,
                            couponInfo.logic,
                            {
                                r: couponInfo.coupon.r,
                                s: couponInfo.coupon.s,
                                v: couponInfo.coupon.v,
                            },
                            questResult.expiresIn,
                            { ...txParams }
                        );
                        await delay(0.15)

                        console.log(
                            `Claim quest ${couponInfo.logic} - tx ${chainInfo.explorer}${claimTx.hash}`
                        );
                    } catch (error) {
                        console.log(`Claim quest ${couponInfo.logic} failed. Already claimed?`);
                        // console.log(error);
                    }
                }
                console.log(`Daily quests completed!`);

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
