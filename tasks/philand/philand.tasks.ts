import { Contract, ethers } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, populateTxnParams } from "../../utils/Utils";

import axios, { AxiosResponse } from "axios";

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
    v: number;
}

task("philandCheckXp", "Philand check XP")
    .addFlag("claim", "Only try to claim quests")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.poligonMainnet].includes(currentNetwork.chainId)) {
            console.log("Task available only at Polygon mainnet network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                let response: AxiosResponse | any = undefined;

                try {
                    response = await axios.get(
                        `https://utils-api.phi.blue/v1/philand/account/achieved_quest?address=${account.address}`
                    );
                    console.log(`Earned ${response.data.expGain} XP`);
                } catch (error: any) {
                    console.log(`Error ${error.response.status} ${error.response.data.result}`);
                    continue;
                }

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("philandDailyQuest", "Philand dailty quest")
    .addFlag("claim", "Only try to claim quests")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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

                        await dailyTx.wait(2);
                    }

                    console.log(`Transactions sended successfully! Wait when they will be indexed.`);
                    await delay(0.2);
                }

                let response: AxiosResponse | any = undefined;
                let questResult: QuestResult | any = undefined;

                try {
                    response = await axios.get(
                        `https://utils-api.phi.blue/v1/philand/dailyquest/verify?address=${account.address}`
                    );
                } catch (error: any) {
                    console.log(`Error ${error.response.status} ${error.response.data.result}`);
                    continue;
                }

                questResult = response.data;

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
                        console.log(
                            `Claim quest ${couponInfo.logic} - tx ${chainInfo.explorer}${claimTx.hash}`
                        );
                        await claimTx.wait();
                        await delay(0.35);
                    } catch (error) {
                        console.log(`Claim quest ${couponInfo.logic} failed. Already claimed?`);
                    }
                }
                console.log(`Daily quests completed!`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("philandQuestAutoClaimer", "Philand claim all awailable quests")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("skipCheck", "Skip check for new awailable quests")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.poligonMainnet].includes(currentNetwork.chainId)) {
            console.log("Task available only at Poligon mainnet network!");
            return;
        }

        interface CheckResponse {
            address: string;
            result: number[];
        }

        interface Quest {
            TokenId: number;
            Condition: string;
            Value: number;
            Counter: number;
        }

        interface ProgressResponse {
            result: Quest[];
        }

        const questClaimContractAddress = "0x754e78bc0f7b487d304552810a5254497084970c";

        const questClaimContract = new Contract(questClaimContractAddress, [
            "function claimQuestObject(address contractAddress, uint256 tokenId, string condition, (bytes32 r, bytes32 s, uint8 v) coupon)",
        ]);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        if (!taskArgs.skipCheck) {
            console.log(`Update quests status. The process will take about two minutes...`);
            for (const account of accounts) {
                try {
                    await axios.post(
                        `https://utils-api.phi.blue/v1/philand/condition/check?address=${account.address}`
                    );
                    await new Promise((r) => setTimeout(r, 100));
                } catch (error: any) {
                    console.log(
                        `#${accounts.indexOf(account)} Address: ${account.address} ERROR ${
                            error.response.status
                        } ${error.response.data.result}`
                    );
                }
            }
            await delay(2);
        }

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const allAccountQuestsId: number[] = (
                    await axios.get(
                        `https://utils-api.phi.blue/v1/philand/condition/check?address=${account.address}`
                    )
                ).data.result;
                // console.log("allAccountQuestsId");
                // console.log(allAccountQuestsId);

                const completedQuestsId: number[] = (
                    await axios.get(
                        `https://utils-api.phi.blue/v1/philand/account/achieved_quest?address=${account.address}`
                    )
                ).data.result;
                // console.log("completedQuestsId");
                // console.log(completedQuestsId);

                const unclaimedQuestsId: number[] = allAccountQuestsId.filter(
                    (id) => !completedQuestsId.includes(id)
                );
                // console.log("unclaimedQuestsId");
                // console.log(unclaimedQuestsId);

                const progressResponse: ProgressResponse = (
                    await axios.get(
                        `https://utils-api.phi.blue/v1/philand/condition/progress?address=${account.address}`
                    )
                ).data;
                // console.log("progressResponse");
                // console.log(progressResponse);

                console.log(`${unclaimedQuestsId.length} unclaimed quests`);
                if (unclaimedQuestsId.length == 0) continue;

                for (const questId of unclaimedQuestsId) {
                    try {
                        let quest = progressResponse.result.find((quest) => quest.TokenId == questId);
                        if (!quest) continue;

                        // console.log(`Claim quest`);
                        // console.log(quest);

                        let coupon: Coupon = (
                            await axios.get(
                                `https://object-api.phi.blue/v1/quest_objects?address=${
                                    account.address
                                }&condition=${quest.Condition}&value=${quest.Value.toString().replace(
                                    ".",
                                    "p"
                                )}`
                            )
                        ).data.coupon;

                        var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                        const claimTx = await questClaimContract.connect(account).claimQuestObject(
                            "0x3D8C06e65ebf06A9d40F313a35353be06BD46038",
                            quest.TokenId,
                            `${quest.Condition}${quest.Value.toString().replace(".", "p")}`,
                            {
                                r: coupon.r,
                                s: coupon.s,
                                v: coupon.v,
                            },
                            { ...txParams }
                        );
                        console.log(
                            `Quest claimed ${quest.Condition} ${quest.Value} - tx ${chainInfo.explorer}${claimTx.hash}`
                        );
                        await claimTx.wait();
                    } catch (error) {
                        console.log(`Claim quest failed`);
                        console.log(error);
                    }
                }
                let response: AxiosResponse | any = undefined;

                try {
                    response = await axios.get(
                        `https://utils-api.phi.blue/v1/philand/account/achieved_quest?address=${account.address}`
                    );
                } catch (error: any) {}

                console.log(`All quests claimed! Current progress ${response.data.expGain} XP.`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });
