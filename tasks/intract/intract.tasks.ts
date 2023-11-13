import { task, types } from "hardhat/config";
import { getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts } from "../../utils/Utils";

import axios, { AxiosError, AxiosResponse } from "axios";
import {
    InteractApiUrls,
    LineaCampaignIdentifiers,
    authenticate,
    claimTask,
    getLineaCampaingUserInfo,
    getSuperUserInfo,
    verifyTask,
} from "./intractApiMethods";
import {
    DailyCehckInResponsePayload,
    SetWalletResponsePayload,
    UserResponsePayload as SuperUserResponsePayload,
    UserCampaingInfo,
} from "./intractApiModels";

task("intractRegisterAndSetAddress", "Register account and set primary address")
    .addParam("referralCode", "Referral code", null, types.string, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({
                    account: account,
                    referralCode: taskArgs.referralCode,
                });

                const getLineaCampaingUserResponse: AxiosResponse<UserCampaingInfo> = await axios.get(
                    InteractApiUrls.GetLineaUserCampaing,
                    {
                        headers: {
                            authorization: `Bearer ${authInfo.token}`,
                        },
                    }
                );

                const lineaCampaingUserId = getLineaCampaingUserResponse.data._id;

                if (getLineaCampaingUserResponse.data.lineaWalletAddress) {
                    console.log(`Account already registered`);
                    continue;
                }

                console.log(`Set main linea wallet...`);

                const setWalletResponse: AxiosResponse<SetWalletResponsePayload> = await axios.post(
                    InteractApiUrls.SetWallet,
                    {
                        userId: lineaCampaingUserId,
                        lineaWalletAddress: account.address,
                    },
                    {
                        headers: {
                            authorization: `Bearer ${authInfo.token}`,
                            Questuserid: lineaCampaingUserId,
                        },
                    }
                );

                console.log(setWalletResponse.data.message);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("intractDailyCheckIn", "Daily check in")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({account: account});

                try {
                    const checkInResponse: AxiosResponse<DailyCehckInResponsePayload> = await axios.post(
                        InteractApiUrls.GmStreak,
                        undefined,
                        {
                            headers: {
                                authorization: `Bearer ${authInfo.token}`,
                            },
                        }
                    );

                    console.log(
                        `Streak count: ${checkInResponse.data.streakCount}; Longest streak count: ${checkInResponse.data.longestStreakCount}`
                    );
                } catch (e: any) {
                    console.log(e.message);
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

task("intractStatistics", "Show account statistics")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({account: account});

                try {
                    const superUserResponse: SuperUserResponsePayload = await getSuperUserInfo(
                        authInfo.token
                    );

                    console.log(
                        `General stats:\nGems: ${superUserResponse.totalGems}; Total XP: ${superUserResponse.totalXp}; Check-in streak: ${superUserResponse.gmStreak.streakCount};`
                    );
                    const lineaCampaignUserResponse: UserCampaingInfo = await getLineaCampaingUserInfo(
                        authInfo.token
                    );
                    console.log(
                        `Linea campaign stats:\nTotal XP: ${lineaCampaignUserResponse.totalXp}; Current streak: ${lineaCampaignUserResponse?.lineaStreak?.streakCount}; Longest streak: ${lineaCampaignUserResponse?.lineaStreak?.longestStreakCount}; Last activity ${lineaCampaignUserResponse?.lineaStreak?.streakTimestamp}`
                    );
                } catch (e: any) {
                    console.log(e.message);
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

task("intractLineaDailyQuiz", "Daily quiz")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({account: account});
                const lineaUserInfo = await getLineaCampaingUserInfo(authInfo.token);
                try {
                    const quizResponse: AxiosResponse = await axios.post(
                        InteractApiUrls.LineaDailyQuiz,
                        undefined,
                        {
                            headers: {
                                authorization: `Bearer ${authInfo.token}`,
                                Questuserid: lineaUserInfo._id,
                            },
                        }
                    );

                    console.log(`Quiz completed!`);
                } catch (e: any) {
                    console.log(e.message);
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

task("intractVerifyWave1MetamaskBridge", "Verify Wave 1 Metamask Bridge")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "654a0e8d95c012164b1f1620",
                    userInputs: { TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: {
                                label: "Bridge on MetaMask",
                                baseLink: "https://portfolio.metamask.io/bridge",
                                isExist: true,
                            },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "METAMASK_BRIDGE_AMOUNT" },
                                    { source: "QUEST_USER_DB_FIELD", key: "lineaWalletAddress" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 2100,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 300,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Metamask Bridge amount",
                        description: "Metamask Bridge amount",
                        templateType: "MetaMaskBridgeAmount",
                        xp: 100,
                        adminInputs: [
                            {
                                key: "METAMASK_BRIDGE_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Bridge Amount",
                                placeholder: "",
                                value: "0.009",
                                _id: "654a0e8d95c012164b1f1622",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK2",
                        totalUsersCompleted: 101578,
                        totalRecurringUsersCompleted: [],
                        requiredLogins: ["EVMWallet"],
                        isIntractTask: false,
                        isRequiredTask: true,
                        showOnChainHelper: false,
                        hasMaxRetryCheck: false,
                        hasRateLimitCheck: false,
                        isAddedLater: false,
                        isVisible: true,
                        isDeleted: false,
                        _id: "654a0e8d95c012164b1f1621",
                    },
                    verificationObject: {
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 1 Bridge on MetaMask.\nWait ${
                            verifyPayload.task.asyncVerifyConfig.verifyTimeInSeconds / 60
                        } minutes and claim with task "npx hardhat intractClaimWave1MetamaskBridge --network lineaMainnet"`
                    );
                    if (taskArgs.delay != undefined) {
                        await delay(taskArgs.delay);
                    }
                } catch (e: any) {
                    if (e instanceof AxiosError) {
                        console.log(e.response?.data.message);
                    } else {
                        console.log(e.message);
                    }
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("intractClaimWave1MetamaskBridge", "Claim Wave 1 Metamask Bridge")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const campaignId = LineaCampaignIdentifiers.Wave2.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeOnMetamask;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({account: account});
                    await claimTask(authInfo.token, campaignId, taskId);
                    if (taskArgs.delay != undefined) {
                        await delay(taskArgs.delay);
                    }
                } catch (e: any) {
                    console.log(e.message);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("intractVerifyWave1MetamaskSwap", "Verify Wave 1 Metamask Swap")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({account: account});

                const verifyPayload = {
                    campaignId: "654a0e8d95c012164b1f1620",
                    userInputs: { TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: {
                                label: "Swap on MetaMask",
                                baseLink: "https://portfolio.metamask.io/swap",
                                isExist: true,
                            },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "METAMASK_SWAP_AMOUNT" },
                                    { source: "QUEST_USER_DB_FIELD", key: "lineaWalletAddress" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 600,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 300,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Metamask Swap amount",
                        description: "Metamask Swap amount",
                        templateType: "MetaMaskSwapAmount",
                        xp: 50,
                        adminInputs: [
                            {
                                key: "METAMASK_SWAP_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Swap Amount",
                                placeholder: "",
                                value: "4",
                                _id: "654a0e8d95c012164b1f1624",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK2",
                        totalUsersCompleted: 74545,
                        totalRecurringUsersCompleted: [],
                        requiredLogins: ["EVMWallet"],
                        isIntractTask: false,
                        isRequiredTask: false,
                        showOnChainHelper: false,
                        hasMaxRetryCheck: false,
                        hasRateLimitCheck: false,
                        isAddedLater: false,
                        isVisible: true,
                        isDeleted: false,
                        _id: "654a0e8d95c012164b1f1623",
                    },
                    verificationObject: {
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    const preconditionTasks = [LineaCampaignIdentifiers.Wave2.tasksIds.BridgeOnMetamask];
                    await verifyTask(authInfo.token, verifyPayload, preconditionTasks);
                    console.log(
                        `Verification started for Wave 1 Swap on MetaMask.\nWait ${
                            verifyPayload.task.asyncVerifyConfig.verifyTimeInSeconds / 60
                        } minutes and claim with task "npx hardhat intractClaimWave1MetamaskSwap --network lineaMainnet"`
                    );
                    if (taskArgs.delay != undefined) {
                        await delay(taskArgs.delay);
                    }
                } catch (e: any) {
                    if (e instanceof AxiosError) {
                        console.log(e.response?.data.message);
                    } else {
                        console.log(e.message);
                    }
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("intractClaimWave1MetamaskSwap", "Claim Wave 1 Metamask Swap")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const campaignId = LineaCampaignIdentifiers.Wave2.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave2.tasksIds.SwapOnMetamask;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({account: account});
                    await claimTask(authInfo.token, campaignId, taskId);
                    if (taskArgs.delay != undefined) {
                        await delay(taskArgs.delay);
                    }
                } catch (e: any) {
                    console.log(e.message);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });
