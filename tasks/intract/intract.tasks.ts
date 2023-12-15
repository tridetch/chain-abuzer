import { task, types } from "hardhat/config";
import { getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { MOCK_USER_AGENT, delay, getAccounts } from "../../utils/Utils";

import axios, { AxiosError, AxiosResponse } from "axios";
import {
    InteractApiUrls,
    LineaCampaignIdentifiers,
    authenticate,
    claimTask,
    getCompletedCampaigns,
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
    .addParam("referralCode", "Referral code", undefined, types.string, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                            "User-Agent": MOCK_USER_AGENT,
                            Authorization: `Bearer ${authInfo.token}`,
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
                            "User-Agent": MOCK_USER_AGENT,
                            Authorization: `Bearer ${authInfo.token}`,
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
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

                try {
                    const checkInResponse: AxiosResponse<DailyCehckInResponsePayload> = await axios.post(
                        InteractApiUrls.GmStreak,
                        undefined,
                        {
                            headers: {
                                "User-Agent": MOCK_USER_AGENT,
                                Authorization: `Bearer ${authInfo.token}`,
                            },
                        }
                    );

                    console.log(`Check-in completed!`);
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
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                const lineaUserInfo = await getLineaCampaingUserInfo(authInfo.token);
                try {
                    const quizResponse: AxiosResponse = await axios.post(
                        InteractApiUrls.LineaDailyQuiz,
                        undefined,
                        {
                            headers: {
                                "User-Agent": MOCK_USER_AGENT,
                                Authorization: `Bearer ${authInfo.token}`,
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

task("intractDappSheriffReview", "Review dapp on DappSheriff")
    .addParam("appId", "Application ID for review", undefined, types.int, false)
    .addParam("reviewText", "Review text", "Great protocol", types.string, true)
    .addParam("rate", "rate", 5, types.float, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
        var taskId = LineaCampaignIdentifiers.Wave2.tasksIds.Review;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const result = await axios.post("https://dappsheriff.com/api/app/127/reviews", {
                        app_id: taskArgs.appId,
                        reviewer: account.address,
                        review: taskArgs.reviewText,
                        rate: taskArgs.rate,
                    });
                    console.log(`Review has been submitted`);

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

// WAVE 1 - METAMASK

task("intractVerifyWave1MetamaskBridge", "Verify Wave 1 Metamask Bridge")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave1.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave1.tasksIds.BridgeOnMetamask;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                    const preconditionTasks = [LineaCampaignIdentifiers.Wave1.tasksIds.BridgeOnMetamask];
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
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave1.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave1.tasksIds.SwapOnMetamask;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

// WAVE 2 - BRIDGE AND ON RAMP

task("intractVerifyWave2BridgeCore", "Verify Wave 2 Bridge")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("orbiter", "Verify Orbiter Bridge")
    .addFlag("stargate", "Verify Stargate Bridge")
    .addFlag("rhinofi", "Verify Rhino Fi Bridge")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var bridgeProjectId: string | undefined = undefined;
        if (taskArgs.orbiter) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.OrbiterProjectId;
        } else if (taskArgs.stargate) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.StargateProjectId;
        } else if (taskArgs.rhinofi) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.RhinoFiProjectId;
        }

        if (!bridgeProjectId) {
            console.log("Need to define bridge parameter: --orbiter | --stargate | --rhinofi");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "65535ae63cd33ebafe9d68f8",
                    userInputs: { lineaProjectId: bridgeProjectId, TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: { isExist: false },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_BRIDGE_AMOUNT" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectId" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 2700,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 1500,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Linea Bridge ETH Amount",
                        description:
                            "Select any listed bridge partner dapp and bridge at least $25 worth of ETH from another network to Linea.",
                        templateType: "LineaBridgeEthAmount",
                        xp: 100,
                        adminInputs: [
                            {
                                key: "LINEA_BRIDGE_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Bridge Amount",
                                placeholder: "",
                                value: 20,
                                _id: "65535ae63cd33ebafe9d68fa",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK1",
                        totalUsersCompleted: 0,
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
                        _id: "65535ae63cd33ebafe9d68f9",
                    },
                    verificationObject: {
                        lineaProjectId: bridgeProjectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 2 Bridge Core Task.\nWait 120 minutes and claim with task "npx hardhat intractClaimWave2BridgeCore --network lineaMainnet"`
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

task("intractClaimWave2BridgeCore", "Claim Wave 2 Bridge Core")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
        const taskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeCore;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave2BridgeBonus25", "Verify Wave 2 Bridge Bonus 25")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("orbiter", "Verify Orbiter Bridge")
    .addFlag("stargate", "Verify Stargate Bridge")
    .addFlag("rhinofi", "Verify Rhino Fi Bridge")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var bridgeTaskId: string | undefined = undefined;
        var bridgeProjectId: string | undefined = undefined;
        var bridgeProjectName: string | undefined = undefined;
        if (taskArgs.orbiter) {
            bridgeTaskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeBonus25.OrbiterTaskId;
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.OrbiterProjectId;
            bridgeProjectName = "Bridge $25 on ORBITER to Linea";
        } else if (taskArgs.stargate) {
            bridgeTaskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeBonus25.StargateTaskId;
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.StargateProjectId;
            bridgeProjectName = "Bridge $25 on STARGATE to Linea";
        } else if (taskArgs.rhinofi) {
            bridgeTaskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeBonus25.RhinoFiTaskId;
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.RhinoFiProjectId;
            bridgeProjectName = "Bridge $25 on RHINO FI to Linea";
        }

        if (!bridgeProjectId) {
            console.log("Need to define bridge flag: --orbiter or --stargate");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "65535ae63cd33ebafe9d68f8",
                    userInputs: { lineaProjectId: bridgeProjectId, TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: { isExist: false },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_BRIDGE_AMOUNT" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_PROJECT_ID" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1800,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: bridgeProjectName,
                        description: bridgeProjectName,
                        templateType: "LineaBridgeMultipleProject",
                        xp: 5,
                        adminInputs: [
                            {
                                key: "LINEA_BRIDGE_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Bridge Amount for multiple",
                                placeholder: "",
                                value: 20,
                                _id: "65535ae63cd33ebafe9d690a",
                            },
                            {
                                key: "LINEA_PROJECT_ID",
                                inputType: "INPUT_STRING",
                                label: "Linea Project Id",
                                placeholder: "",
                                value: bridgeProjectId,
                                _id: "65535ae63cd33ebafe9d690b",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK1",
                        totalUsersCompleted: 184,
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
                        _id: bridgeTaskId,
                    },
                    verificationObject: {
                        lineaProjectId: bridgeProjectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, [
                        LineaCampaignIdentifiers.Wave2.tasksIds.BridgeCore,
                    ]);
                    console.log(
                        `Verification started for Wave 2 Bridge Bunus 25$ Task.\nWait 120 minutes and claim with task "npx hardhat intractClaimWave2BridgeBonus25 --network lineaMainnet"`
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

task("intractClaimWave2BridgeBonus25", "Claim Wave 2 Bridge Bonus 25")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("orbiter", "Verify Orbiter Bridge")
    .addFlag("stargate", "Verify Stargate Bridge")
    .addFlag("rhinofi", "Verify Rhino Fi Bridge")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
        var taskId: string | undefined = undefined;

        if (taskArgs.orbiter) {
            taskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeBonus25.OrbiterTaskId;
        } else if (taskArgs.stargate) {
            taskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeBonus25.StargateTaskId;
        } else if (taskArgs.rhinofi) {
            taskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeBonus25.RhinoFiTaskId;
        }

        if (!taskId) {
            console.log("Need to define bridge parameter: --orbiter | --stargate | --rhinofi");
        }

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
                    await claimTask(authInfo.token, campaignId, taskId!);
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

task("intractVerifyWave2BridgeBonus500", "Verify Wave 2 Bridge Bonus 500")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("orbiter", "Verify Orbiter Bridge")
    .addFlag("stargate", "Verify Stargate Bridge")
    .addFlag("rhinofi", "Verify Rhino Fi Bridge")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var bridgeProjectId: string | undefined = undefined;
        if (taskArgs.orbiter) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.OrbiterProjectId;
        } else if (taskArgs.stargate) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.StargateProjectId;
        } else if (taskArgs.rhinofi) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.RhinoFiProjectId;
        }

        if (!bridgeProjectId) {
            console.log("Need to define bridge flag: --orbiter or --stargate");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "65535ae63cd33ebafe9d68f8",
                    userInputs: { lineaProjectId: bridgeProjectId, TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: { isExist: false },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_BRIDGE_AMOUNT" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectId" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1800,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Linea Bridge Eth Amount",
                        description: "Bridge more than $500 worth of ETH in a single transaction to Linea.",
                        templateType: "LineaBridgeEthAmount",
                        xp: 50,
                        adminInputs: [
                            {
                                key: "LINEA_BRIDGE_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Bridge Amount",
                                placeholder: "",
                                value: 450,
                                _id: "65535ae63cd33ebafe9d68fc",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK1",
                        totalUsersCompleted: 738,
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
                        _id: "65535ae63cd33ebafe9d68fb",
                    },
                    verificationObject: {
                        lineaProjectId: bridgeProjectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, [
                        LineaCampaignIdentifiers.Wave2.tasksIds.BridgeCore,
                    ]);
                    console.log(
                        `Verification started for Wave 2 Bridge Bunus 500$ Task.\nWait 120 minutes and claim with task "npx hardhat intractClaimWave2BridgeBonus500 --network lineaMainnet"`
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

task("intractClaimWave2BridgeBonus500", "Claim Wave 2 Bridge Bonus 500")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("orbiter", "Verify Orbiter Bridge")
    .addFlag("stargate", "Verify Stargate Bridge")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
        var taskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeBonus500;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
                    await claimTask(authInfo.token, campaignId, taskId!);
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

task("intractVerifyWave2BridgeBonus1000", "Verify Wave 2 Bridge Bonus 1000")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("orbiter", "Verify Orbiter Bridge")
    .addFlag("stargate", "Verify Stargate Bridge")
    .addFlag("rhinofi", "Verify Rhino Fi Bridge")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var bridgeProjectId: string | undefined = undefined;
        if (taskArgs.orbiter) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.OrbiterProjectId;
        } else if (taskArgs.stargate) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.StargateProjectId;
        } else if (taskArgs.rhinofi) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave2.tasksIds.RhinoFiProjectId;
        }

        if (!bridgeProjectId) {
            console.log("Need to define bridge flag: --orbiter | --stargate | --rhinofi");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "65535ae63cd33ebafe9d68f8",
                    userInputs: {
                        lineaProjectId: bridgeProjectId,
                        lineaProjectIds: [
                            "654cc69f9322e02fb37cdd89",
                            "654e17cd9322e02fb37cdd95",
                            "6548fdf68b0181c6dc90186d",
                            "6548f86947e9f49f91c1ea92",
                            "654903b57d85943bcc3b6ed4",
                            "654905f6c8430e1e7e2f1793",
                            "653aa0a76e3c9704874cdd31",
                            "65490245130775c66fa2d42c",
                            "6548ec802f2fda5a061a6587",
                            "6548ec802f2fda5a061a6586",
                        ],
                        TRANSACTION_HASH: "0x",
                    },
                    task: {
                        userInputs: {
                            initiateButton: { isExist: false },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_BRIDGE_AMOUNT" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectIds" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1800,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Linea Bridge Eth Amount",
                        description:
                            "Bridge more than $1000 in ETH (in total across the listed bridges) to Linea.",
                        templateType: "LineaBridgeVolume",
                        xp: 75,
                        adminInputs: [
                            {
                                key: "LINEA_BRIDGE_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Total Bridge Amount",
                                placeholder: "",
                                value: 900,
                                _id: "65535ae63cd33ebafe9d68fe",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK1",
                        totalUsersCompleted: 695,
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
                        _id: "65535ae63cd33ebafe9d68fd",
                    },
                    verificationObject: {
                        lineaProjectId: bridgeProjectId,
                        lineaProjectIds: [
                            "654cc69f9322e02fb37cdd89",
                            "654e17cd9322e02fb37cdd95",
                            "6548fdf68b0181c6dc90186d",
                            "6548f86947e9f49f91c1ea92",
                            "654903b57d85943bcc3b6ed4",
                            "654905f6c8430e1e7e2f1793",
                            "653aa0a76e3c9704874cdd31",
                            "65490245130775c66fa2d42c",
                            "6548ec802f2fda5a061a6587",
                            "6548ec802f2fda5a061a6586",
                        ],
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, [
                        LineaCampaignIdentifiers.Wave2.tasksIds.BridgeCore,
                    ]);
                    console.log(
                        `Verification started for Wave 2 Bridge Bunus 1000$ Task.\nWait 120 minutes and claim with task "npx hardhat intractClaimWave2BridgeBonus1000 --network lineaMainnet"`
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

task("intractClaimWave2BridgeBonus1000", "Claim Wave 2 Bridge Bonus 1000")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("orbiter", "Verify Orbiter Bridge")
    .addFlag("stargate", "Verify Stargate Bridge")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
        var taskId = LineaCampaignIdentifiers.Wave2.tasksIds.BridgeBonus1000;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
                    await claimTask(authInfo.token, campaignId, taskId!);
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

task("intractVerifyWave2BridgeReview", "Verify Wave 2 Review")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                    campaignId: "65535ae63cd33ebafe9d68f8",
                    userInputs: { TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: {
                                label: "Write a review!",
                                baseLink: "https://dappsheriff.com/",
                                isExist: true,
                            },
                            verifyButton: { label: "Verify", callbackFunction: true, callbackParameters: [] },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 120,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 60,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Review your favorite dapp of the Bridge wave on DappSheriff (for 20XP)",
                        description: "Verify that you added review on Dapsheriff",
                        templateType: "DappSheriffReview",
                        xp: 20,
                        adminInputs: [],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK1",
                        totalUsersCompleted: 2007,
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
                        _id: LineaCampaignIdentifiers.Wave2.tasksIds.Review,
                    },
                    verificationObject: {
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, [
                        LineaCampaignIdentifiers.Wave2.tasksIds.BridgeCore,
                    ]);
                    console.log(
                        `Verification started for Wave 2 Review bridge on DappSheriff Task.\nWait 5 minutes and claim with task "npx hardhat intractClaimWave2Review --network lineaMainnet"`
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

task("intractClaimWave2BridgeReview", "Claim Wave 2 Bridge Review")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("orbiter", "Verify Orbiter Bridge")
    .addFlag("stargate", "Verify Stargate Bridge")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
        var taskId = LineaCampaignIdentifiers.Wave2.tasksIds.Review;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
                    await claimTask(authInfo.token, campaignId, taskId!);
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

// WAVE 3 - SWAP

task("intractVerifyWave3SwapCore", "Verify Wave 3 Swap")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("kyberSwap", "Verify KyberSwap")
    .addFlag("syncSwap", "Verify SyncSwap")
    .addFlag("izumi", "Verify SyncSwap")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var bridgeProjectId: string | undefined = undefined;
        if (taskArgs.kyberSwap) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave3.KyberSwapProjectId;
        } else if (taskArgs.syncSwap) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave3.SyncSwapProjectId;
        } else if (taskArgs.izumi) {
            bridgeProjectId = LineaCampaignIdentifiers.Wave3.IzumiProjectId;
        }

        if (!bridgeProjectId) {
            console.log("Need to define bridge parameter: --kyber-swap | --sync-swap ");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "655b48ec2e9188e21c94e93e",
                    userInputs: { lineaProjectId: bridgeProjectId, TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: { isExist: false },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_SWAP_AMOUNT" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectId" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1200,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Swap at least $25 worth of ETH to any of the supported tokens on any supported DEX.",
                        description: "Verify that you have completed a valid swap",
                        templateType: "LineaSwapEthAmount",
                        xp: 150,
                        adminInputs: [
                            {
                                key: "LINEA_SWAP_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Swap Amount",
                                placeholder: "amt",
                                value: "22.5",
                                _id: "655b48ec2e9188e21c94e940",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK3",
                        totalUsersCompleted: 37602,
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
                        _id: "655b48ec2e9188e21c94e93f",
                    },
                    verificationObject: {
                        lineaProjectId: bridgeProjectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 3 Swap Core Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave3SwapCore --network lineaMainnet"`
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

task("intractClaimWave3SwapCore", "Claim Wave 3 Swap Core")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave3.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave3.tasksIds.SwapCore;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave3SwapAggregator", "Verify Wave 3 Swap aggregator")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var bridgeProjectId: string | undefined = LineaCampaignIdentifiers.Wave3.KyberSwapProjectId;

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "655b48ec2e9188e21c94e93e",
                    userInputs: { lineaProjectId: bridgeProjectId, TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: { isExist: false },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_SWAP_AMOUNT" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectId" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1200,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Use an aggregator to swap at least $25 of volume from any supported token to any supported token of your choice.",
                        description: "Use an aggregator to complete a valid swap",
                        templateType: "LineaAggregatorSwapEthAmount",
                        xp: 40,
                        adminInputs: [
                            {
                                key: "LINEA_SWAP_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Swap Amount",
                                placeholder: "amt",
                                value: "22.5",
                                _id: "655b48ed2e9188e21c94e942",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK3",
                        totalUsersCompleted: 20099,
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
                        _id: "655b48ec2e9188e21c94e941",
                    },
                    verificationObject: {
                        lineaProjectId: bridgeProjectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, [
                        LineaCampaignIdentifiers.Wave3.tasksIds.SwapCore,
                    ]);
                    console.log(
                        `Verification started for Wave 3 Swap Aggregator Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave3SwapAggregator --network lineaMainnet"`
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

task("intractClaimWave3SwapAggregator", "Claim Wave 3 Swap Aggregator")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave3.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave3.tasksIds.SwapAggregator;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave3Swap20Times", "Verify Wave 3 Swap 20 times")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var bridgeProjectId: string | undefined = LineaCampaignIdentifiers.Wave3.KyberSwapProjectId;

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "655b48ec2e9188e21c94e93e",
                    userInputs: {
                        lineaProjectIds: ["655659a386b270fa5f703361", "65565bd586b270fa5f703375"],
                        TRANSACTION_HASH: "0x",
                    },
                    task: {
                        userInputs: {
                            initiateButton: { isExist: false },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_SWAP_VOLUME" },
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_SWAP_AMOUNT" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectIds" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1200,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Execute more than 20 swaps in total, each with a minimum value of $5, within the duration of the token swaps wave. ",
                        description: "Execute more than 20 valid swaps",
                        templateType: "LineaSwapEthTxnVolume",
                        xp: 60,
                        adminInputs: [
                            {
                                key: "LINEA_SWAP_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Individual Min Swap Amount",
                                placeholder: "amt",
                                value: "20",
                                _id: "655b48ed2e9188e21c94e944",
                            },
                            {
                                key: "LINEA_SWAP_VOLUME",
                                inputType: "INPUT_NUMBER",
                                label: "Swap Volume",
                                placeholder: "amt",
                                value: "4.5",
                                _id: "655b48ed2e9188e21c94e945",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK3",
                        totalUsersCompleted: 1859,
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
                        _id: "655b48ed2e9188e21c94e943",
                    },
                    verificationObject: {
                        lineaProjectIds: ["655659a386b270fa5f703361", "65565bd586b270fa5f703375"],
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, [
                        LineaCampaignIdentifiers.Wave3.tasksIds.SwapCore,
                    ]);
                    console.log(
                        `Verification started for Wave 3 Swap 20 times Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave3Swap20Times --network lineaMainnet"`
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

task("intractClaimWave3Swap20Times", "Claim Wave 3 Swap 20 times")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave3.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave3.tasksIds.Swap20Times;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave3Swap1000", "Verify Wave 3 Swap 1000")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var bridgeProjectId: string | undefined = LineaCampaignIdentifiers.Wave3.KyberSwapProjectId;

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "655b48ec2e9188e21c94e93e",
                    userInputs: {
                        lineaProjectIds: ["65565bd586b270fa5f703375", "655659a386b270fa5f703361"],
                        TRANSACTION_HASH: "0x",
                    },
                    task: {
                        userInputs: {
                            initiateButton: { isExist: false },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_SWAP_AMOUNT" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectIds" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1200,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Swap more than $1000 in total volume across multiple DEXs.",
                        description: "Swap more than $1000 in total volume across multiple DEXs.",
                        templateType: "LineaSwapEthAmountVolume",
                        xp: 60,
                        adminInputs: [
                            {
                                key: "LINEA_SWAP_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Swap Amount",
                                placeholder: "amt",
                                value: "900",
                                _id: "655b48ed2e9188e21c94e947",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK3",
                        totalUsersCompleted: 7969,
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
                        _id: "655b48ed2e9188e21c94e946",
                    },
                    verificationObject: {
                        lineaProjectIds: ["65565bd586b270fa5f703375", "655659a386b270fa5f703361"],
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, [
                        LineaCampaignIdentifiers.Wave3.tasksIds.SwapCore,
                    ]);
                    console.log(
                        `Verification started for Wave 3 Swap 1000 Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave3Swap1000 --network lineaMainnet"`
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

task("intractClaimWave3Swap1000", "Claim Wave 3 Swap 1000")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave3.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave3.tasksIds.Swap1000;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave3SwapLsd", "Verify Wave 3 Swap Lsd")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var bridgeProjectId: string | undefined = LineaCampaignIdentifiers.Wave3.KyberSwapProjectId;

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "655b48ec2e9188e21c94e93e",
                    userInputs: { lineaProjectId: "65565bd586b270fa5f703375", TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: { isExist: false },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_SWAP_AMOUNT" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectId" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1200,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Swap at least $25 of ETH into a RWA OR an LST.",
                        description: "Swap at least $25 of ETH into a RWA OR an LST.",
                        templateType: "LineaSwapLstOrRwa",
                        xp: 40,
                        adminInputs: [
                            {
                                key: "LINEA_SWAP_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Swap Amount",
                                placeholder: "amt",
                                value: "22.5",
                                _id: "655b48ed2e9188e21c94e949",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK3",
                        totalUsersCompleted: 11927,
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
                        _id: "655b48ed2e9188e21c94e948",
                    },
                    verificationObject: {
                        lineaProjectId: "65565bd586b270fa5f703375",
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, [
                        LineaCampaignIdentifiers.Wave3.tasksIds.SwapCore,
                    ]);
                    console.log(
                        `Verification started for Wave 3 Swap LSD Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave3SwapLsd --network lineaMainnet"`
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

task("intractClaimWave3SwapLsd", "Claim Wave 3 Swap 1000")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave3.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave3.tasksIds.SwapLSD;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerify3SwapReview", "Verify Wave 3 Swap Review")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                    campaignId: "655b48ec2e9188e21c94e93e",
                    userInputs: { TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: {
                                label: "Write a review!",
                                baseLink: "https://dappsheriff.com/",
                                isExist: true,
                            },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "DAPPSHERIFF_SLUG" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1200,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Review your favorite dapp of the Token Swap wave on DappSheriff (for 20XP)",
                        description: "Verify that you added review on Dapsheriff",
                        templateType: "DappsheriffReview",
                        xp: 20,
                        adminInputs: [
                            {
                                key: "DAPPSHERIFF_SLUG",
                                inputType: "INPUT_STRING",
                                label: "URI SLUG",
                                placeholder: "",
                                value: "waves/2",
                                _id: "655b48ed2e9188e21c94e94b",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK1",
                        totalUsersCompleted: 18647,
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
                        _id: "655b48ed2e9188e21c94e94a",
                    },
                    verificationObject: {
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, [
                        LineaCampaignIdentifiers.Wave3.tasksIds.SwapCore,
                    ]);
                    console.log(
                        `Verification started for Wave 3 Review swap on DappSheriff Task.\nWait 5 minutes and claim with task "npx hardhat intractClaimWave3SwapReview --network lineaMainnet"`
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

task("intractClaimWave3SwapReview", "Claim Wave 3 Swap Review")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave3.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave3.tasksIds.SwapReview;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

// WAVE 4

task("intractVerifyWave4LendingCore", "Verify Wave 4 Lending")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("granary", "Verify Granary")
    .addFlag("mendi", "Verify Mendi")
    .addFlag("layerbank", "Verify LayerBank")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var projectId: string | undefined = undefined;
        if (taskArgs.granary) {
            projectId = LineaCampaignIdentifiers.Wave4.GranaryFinanceProjectId;
        } else if (taskArgs.mendi) {
            projectId = LineaCampaignIdentifiers.Wave4.MendiFinanceProjectId;
        } else if (taskArgs.layerbank) {
            projectId = LineaCampaignIdentifiers.Wave4.LayerBankProjectId;
        }

        if (!projectId) {
            console.log("Need to define parameter: --granary | --mendy | --layerbank ");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "65647f06731b793354cb239c",
                    userInputs: { lineaProjectId: projectId, TRANSACTION_HASH: "0x" },
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
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_LEND_AMOUNT" },
                                    { source: "ADMIN_INPUT_FIELD", key: "ALLOWED_TOKEN_ADDRESSES" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectId" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 900,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Borrow at least $25 worth of ETH/WETH on any of the money markets available on Linea.",
                        description:
                            "Carry out a loan on any of the money markets available on Linea. (ETH/WETH only)",
                        templateType: "LineaBorrowEth",
                        xp: 150,
                        adminInputs: [
                            {
                                key: "LINEA_LEND_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min Lending volume",
                                placeholder: "amt",
                                value: 18,
                                _id: "65647f06731b793354cb239e",
                            },
                            {
                                key: "ALLOWED_TOKEN_ADDRESSES",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of allowed token addresses which user has to borrow",
                                placeholder: "0x...",
                                value: [
                                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                    "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f",
                                ],
                                _id: "65647f06731b793354cb239f",
                            },
                            {
                                key: "IS_COMPLEX_LENDING",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of allowed token addresses which user has to borrow",
                                placeholder: "0x...",
                                value: false,
                                _id: "65647f06731b793354cb23a0",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK4",
                        totalUsersCompleted: 308,
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
                        _id: "65647f06731b793354cb239d",
                    },
                    verificationObject: {
                        lineaProjectId: projectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 4 Lending Core Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave4LendingCore --network lineaMainnet"`
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

task("intractClaimWave4LendingCore", "Claim Wave 4 Lending Core")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave4.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave4.tasksIds.LendingCore;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave4LendingStableCollateral", "Verify Wave 4 Lending Stable Collateral")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("granary", "Verify Granary")
    .addFlag("mendi", "Verify Medi")
    .addFlag("layerbank", "Verify LayerBank")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var projectId: string | undefined = undefined;
        if (taskArgs.granary) {
            projectId = LineaCampaignIdentifiers.Wave4.GranaryFinanceProjectId;
        } else if (taskArgs.mendi) {
            projectId = LineaCampaignIdentifiers.Wave4.MendiFinanceProjectId;
        } else if (taskArgs.layerbank) {
            projectId = LineaCampaignIdentifiers.Wave4.LayerBankProjectId;
        }

        if (!projectId) {
            console.log("Need to define parameter: --granary | --mendy | --layerbank ");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "65647f06731b793354cb239c",
                    userInputs: { lineaProjectId: projectId, TRANSACTION_HASH: "0x" },
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
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_LEND_AMOUNT" },
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_BORROW_AMOUNT" },
                                    { source: "ADMIN_INPUT_FIELD", key: "ALLOWED_TOKEN_ADDRESSES" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectId" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 900,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Use a specific token as collateral for a loan",
                        description: "Use a specific token as collateral for a loan",
                        templateType: "LineaLoanFromSpecificTokenCollateral",
                        xp: 20,
                        adminInputs: [
                            {
                                key: "LINEA_LEND_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min lending amount for collateralised token",
                                placeholder: "amt",
                                value: 1,
                                _id: "65647f06731b793354cb23a2",
                            },
                            {
                                key: "LINEA_BORROW_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min borrow amount",
                                placeholder: "amt",
                                value: 18,
                                _id: "65647f06731b793354cb23a3",
                            },
                            {
                                key: "ALLOWED_TOKEN_ADDRESSES",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of allowed token addresses which user has to put in as collateral",
                                placeholder: "0x...",
                                value: [
                                    "0x176211869ca2b568f2a7d4ee941e073a821ee1ff",
                                    "0xa219439258ca9da29e9cc4ce5596924745e12b93",
                                    "0x4af15ec2a0bd43db75dd04e62faa3b8ef36b00d5",
                                ],
                                _id: "65647f06731b793354cb23a4",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK4",
                        totalUsersCompleted: 94,
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
                        _id: "65647f06731b793354cb23a1",
                    },
                    verificationObject: {
                        lineaProjectId: projectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 4 Lending Stable Collateral Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave4StableCollateral --network lineaMainnet"`
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

task("intractClaimWave4LendingStableCollateral", "Claim Wave 4 Lending Stable Collateral")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave4.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave4.tasksIds.StableAsCollateral;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave4LendingLsdCollateral", "Verify Wave 4 Lending Lsd Collateral")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("granary", "Verify Granary")
    .addFlag("layerbank", "Verify LayerBank")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var projectId: string | undefined = undefined;
        if (taskArgs.granary) {
            projectId = LineaCampaignIdentifiers.Wave4.GranaryFinanceProjectId;
        } else if (taskArgs.layerbank) {
            projectId = LineaCampaignIdentifiers.Wave4.LayerBankProjectId;
        }

        if (!projectId) {
            console.log("Need to define parameter: --granary | --layerbank ");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "65647f06731b793354cb239c",
                    userInputs: { lineaProjectId: projectId, TRANSACTION_HASH: "0x" },
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
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_LEND_AMOUNT" },
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_BORROW_AMOUNT" },
                                    { source: "ADMIN_INPUT_FIELD", key: "ALLOWED_TOKEN_ADDRESSES" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectId" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 900,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Use a specific token as collateral for a loan",
                        description: "Use a specific token as collateral for a loan",
                        templateType: "LineaLoanFromSpecificTokenCollateral",
                        xp: 40,
                        adminInputs: [
                            {
                                key: "LINEA_LEND_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min lending amount for collateralised token",
                                placeholder: "amt",
                                value: 1,
                                _id: "65647f06731b793354cb23a6",
                            },
                            {
                                key: "LINEA_BORROW_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min borrow amount",
                                placeholder: "amt",
                                value: 18,
                                _id: "65647f06731b793354cb23a7",
                            },
                            {
                                key: "ALLOWED_TOKEN_ADDRESSES",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of allowed token addresses which user has to put in as collateral",
                                placeholder: "0x...",
                                value: [
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                ],
                                _id: "65647f06731b793354cb23a8",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK4",
                        totalUsersCompleted: 66,
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
                        _id: "65647f06731b793354cb23a5",
                    },
                    verificationObject: {
                        lineaProjectId: projectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 4 Lending Lsd Collateral Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave4LsdCollateral --network lineaMainnet"`
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

task("intractClaimWave4LendingLsdCollateral", "Claim Wave 4 Lending Lsd Collateral")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave4.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave4.tasksIds.LsdAsCollateral;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave4LendingRepay", "Verify Wave 4 Lending Repay")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("granary", "Verify KyberSwap")
    .addFlag("mendi", "Verify SyncSwap")
    .addFlag("layerbank", "Verify SyncSwap")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var projectId: string | undefined = undefined;
        if (taskArgs.granary) {
            projectId = LineaCampaignIdentifiers.Wave4.GranaryFinanceProjectId;
        } else if (taskArgs.mendi) {
            projectId = LineaCampaignIdentifiers.Wave4.MendiFinanceProjectId;
        } else if (taskArgs.layerbank) {
            projectId = LineaCampaignIdentifiers.Wave4.LayerBankProjectId;
        }

        if (!projectId) {
            console.log("Need to define parameter: --granary | --mendy | --layerbank ");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "65647f06731b793354cb239c",
                    userInputs: { lineaProjectId: projectId, TRANSACTION_HASH: "0x" },
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
                                    { source: "ADMIN_INPUT_FIELD", key: "LINEA_REPAY_AMOUNT" },
                                    { source: "ADMIN_INPUT_FIELD", key: "ALLOWED_TOKEN_ADDRESSES" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "questerWalletAddress" },
                                    { source: "CLIENT_VERIFICATION_OBJECT", key: "lineaProjectId" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 900,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Repay your loan.",
                        description: "Close the position of your loan",
                        templateType: "LineaRepayLoan",
                        xp: 30,
                        adminInputs: [
                            {
                                key: "LINEA_REPAY_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min debt to be paid back",
                                placeholder: "amt",
                                value: 5,
                                _id: "65647f06731b793354cb23aa",
                            },
                            {
                                key: "ALLOWED_TOKEN_ADDRESSES",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of allowed token addresses which user has to borrow",
                                placeholder: "0x...",
                                value: [
                                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                    "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f",
                                ],
                                _id: "65647f06731b793354cb23ab",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK4",
                        totalUsersCompleted: 101,
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
                        _id: "65647f06731b793354cb23a9",
                    },
                    verificationObject: {
                        lineaProjectId: projectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 4 Lending Repay Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave4LendingRepay --network lineaMainnet"`
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

task("intractClaimWave4LendingRepay", "Claim Wave 4 Lending Repay")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave4.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave4.tasksIds.Repay;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave4LendingReview", "Verify Wave 4 Landing Review")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                    campaignId: "65647f06731b793354cb239c",
                    userInputs: { TRANSACTION_HASH: "0x" },
                    task: {
                        userInputs: {
                            initiateButton: {
                                label: "Write a review!",
                                baseLink: "https://dappsheriff.com/",
                                isExist: true,
                            },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    { source: "ADMIN_INPUT_FIELD", key: "DAPPSHERIFF_SLUG" },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 900,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: { isPOWVerify: false },
                        recurrenceConfig: { isRecurring: false, frequencyInDays: 1, maxRecurrenceCount: 1 },
                        flashTaskConfig: { isFlashTask: false },
                        name: "Verify that you added review on Dappsheriff",
                        description: "Verify that you added review on Dappsheriff",
                        templateType: "DappsheriffReview",
                        xp: 20,
                        adminInputs: [
                            {
                                key: "DAPPSHERIFF_SLUG",
                                inputType: "INPUT_STRING",
                                label: "URI SLUG",
                                placeholder: "",
                                value: "waves/3",
                                _id: "65647f06731b793354cb23b1",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK1",
                        totalUsersCompleted: 1503,
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
                        _id: "65647f06731b793354cb23b0",
                    },
                    verificationObject: {
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 4 Review landing on DappSheriff Task.\nWait 5 minutes and claim with task "npx hardhat intractClaimWave3LandingReview --network lineaMainnet"`
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

task("intractClaimWave4LendingReview", "Claim Wave 4 Lending Review")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave4.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave4.tasksIds.Review;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

// WAVE 5

task("intractVerifyWave5LiquidityCore", "Verify Wave 5 Liquidity Core")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var projectId: string | undefined = LineaCampaignIdentifiers.Wave5.Velocore;

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "656db678132add9470b7595c",
                    userInputs: {
                        lineaProjectId: projectId,
                        TRANSACTION_HASH: "0x",
                    },
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
                                    {
                                        key: "ALLOWED_TOKEN_ADDRESSES",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_LIQUIDITY_AMOUNT",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_LIQUIDITY_PROJECT_TYPE",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "questerWalletAddress",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "lineaProjectId",
                                    },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: {
                            isPOWVerify: false,
                        },
                        recurrenceConfig: {
                            isRecurring: false,
                            frequencyInDays: 1,
                            maxRecurrenceCount: 1,
                        },
                        flashTaskConfig: {
                            isFlashTask: false,
                        },
                        name: "Add liquidity in specific pools available on Linea",
                        description:
                            "Add liquidity on Linea. Carefully select the pool based on task description to successfuly verify the task.",
                        templateType: "LineaAddLiquidity",
                        xp: 150,
                        adminInputs: [
                            {
                                key: "ALLOWED_TOKEN_ADDRESSES",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of Supported tokens",
                                placeholder: "amt",
                                value: [
                                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                    "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f",
                                    "0x176211869ca2b568f2a7d4ee941e073a821ee1ff",
                                    "0xa219439258ca9da29e9cc4ce5596924745e12b93",
                                    "0x3aab2285ddcddad8edf438c1bab47e1a9d05a9b4",
                                    "0x4af15ec2a0bd43db75dd04e62faa3b8ef36b00d5",
                                    "0x7d43aabc515c356145049227cee54b608342c0ad",
                                    "0xf5c6825015280cdfd0b56903f9f8b5a2233476f5",
                                    "0x3b2f62d42db19b30588648bf1c184865d4c3b1d6",
                                    "0x265b25e22bcd7f10a5bd6e6410f10537cc7567e8",
                                    "0x0d1e753a25ebda689453309112904807625befbe",
                                    "0x5471ea8f739dd37e9b81be9c5c77754d8aa953e4",
                                    "0x1a584204db35460a32e7d9990ac1874cb9fb0827",
                                    "0x6baa318cf7c51c76e17ae1ebe9bbff96ae017acb",
                                    "0x5b16228b94b68c7ce33af2acc5663ebde4dcfa2d",
                                    "0x0e076aafd86a71dceac65508daf975425c9d0cb6",
                                    "0x0e5f2ee8c29e7ebc14e45da7ff90566d8c407db7",
                                    "0x7da14988e4f390c2e34ed41df1814467d3ade0c3",
                                    "0x8c56017b172226fe024dea197748fc1eaccc82b1",
                                    "0x60d01ec2d5e98ac51c8b4cf84dfcce98d527c747",
                                    "0x43e8809ea748eff3204ee01f08872f063e44065f",
                                    "0x0b1a02a7309dfbfad1cd4adc096582c87e8a3ac1",
                                    "0x0963a1abaf36ca88c21032b82e479353126a1c4b",
                                    "0x9201f3b9dfab7c13cd659ac5695d12d605b5f1e6",
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0x93f4d0ab6a8b4271f4a28db399b5e30612d21116",
                                    "0x2f0b4300074afc01726262d4cc9c1d2619d7297a",
                                    "0xcc22f6aa610d1b2a0e89ef228079cb3e1831b1d1",
                                    "0x6ef95b6f3b0f39508e3e04054be96d5ee39ede0d",
                                    "0x1be3735dd0c0eb229fb11094b6c277192349ebbf",
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                    "0x93f4d0ab6a8b4271f4a28db399b5e30612d21116",
                                    "0x2f0b4300074afc01726262d4cc9c1d2619d7297a",
                                    "0xceed853798ff1c95ceb4dc48f68394eb7a86a782",
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0x3f006b0493ff32b33be2809367f5f6722cb84a7b",
                                    "0xb30e7a2e6f7389ca5ddc714da4c991b7a1dcc88e",
                                    "0x1a7e4e63778b4f12a199c062f3efdd288afcbce8",
                                    "0x0000000000000000000000000000000000000001",
                                ],
                                _id: "656db678132add9470b7595e",
                            },
                            {
                                key: "LINEA_LIQUIDITY_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min total liquidity amount to be added in one single pool",
                                placeholder: "amt",
                                value: 20,
                                _id: "656db678132add9470b7595f",
                            },
                            {
                                key: "LINEA_LIQUIDITY_PROJECT_TYPE",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "What kind of projects are allowed? Eg, only v3 pools, single sided pools, all projects etc",
                                placeholder: "amt",
                                value: ["All"],
                                _id: "656db678132add9470b75960",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK5",
                        totalUsersCompleted: 89640,
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
                        _id: "656db678132add9470b7595d",
                    },
                    verificationObject: {
                        lineaProjectId: projectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 5 Liquidity Core Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave5LiquidityCore --network lineaMainnet"`
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

task("intractClaimWave5LiquidityCore", "Claim Wave 5 Liquidity Core")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave5.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave5.tasksIds.LiquidityCore;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave5LiquidityLst", "Verify Wave 5 Liquidity Lst")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var projectId: string | undefined = LineaCampaignIdentifiers.Wave5.Velocore;

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "656db678132add9470b7595c",
                    userInputs: {
                        lineaProjectId: projectId,
                        TRANSACTION_HASH: "0x",
                    },
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
                                    {
                                        key: "ALLOWED_TOKEN_ADDRESSES",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_LIQUIDITY_AMOUNT",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_LIQUIDITY_PROJECT_TYPE",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "questerWalletAddress",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "lineaProjectId",
                                    },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: {
                            isPOWVerify: false,
                        },
                        recurrenceConfig: {
                            isRecurring: false,
                            frequencyInDays: 1,
                            maxRecurrenceCount: 1,
                        },
                        flashTaskConfig: {
                            isFlashTask: false,
                        },
                        name: "Add liquidity in specific pools available on Linea",
                        description:
                            "Add liquidity on Linea. Carefully select the pool based on task description to successfuly verify the task.",
                        templateType: "LineaAddLiquidity",
                        xp: 60,
                        adminInputs: [
                            {
                                key: "ALLOWED_TOKEN_ADDRESSES",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of Supported tokens",
                                placeholder: "amt",
                                value: [
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                    "0x93f4d0ab6a8b4271f4a28db399b5e30612d21116",
                                    "0x2f0b4300074afc01726262d4cc9c1d2619d7297a",
                                    "0xceed853798ff1c95ceb4dc48f68394eb7a86a782",
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0x3f006b0493ff32b33be2809367f5f6722cb84a7b",
                                    "0xb30e7a2e6f7389ca5ddc714da4c991b7a1dcc88e",
                                    "0x1a7e4e63778b4f12a199c062f3efdd288afcbce8",
                                ],
                                _id: "656db678132add9470b75962",
                            },
                            {
                                key: "LINEA_LIQUIDITY_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min total liquidity amount to be added in one single pool",
                                placeholder: "amt",
                                value: 20,
                                _id: "656db678132add9470b75963",
                            },
                            {
                                key: "LINEA_LIQUIDITY_PROJECT_TYPE",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "What kind of projects are allowed? Eg, only v3 pools, single sided pools, all projects etc",
                                placeholder: "amt",
                                value: ["All"],
                                _id: "656db678132add9470b75964",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK5",
                        totalUsersCompleted: 44506,
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
                        _id: "656db678132add9470b75961",
                    },
                    verificationObject: {
                        lineaProjectId: projectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 5 Liquidity Lst Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave5LiquidityLst --network lineaMainnet"`
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

task("intractClaimWave5LiquidityLst", "Claim Wave 5 Liquidity Lst")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave5.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave5.tasksIds.LiquidityLst;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave5LiquidityVe", "Verify Wave 5 Liquidity Ve")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var projectId: string | undefined = LineaCampaignIdentifiers.Wave5.Velocore;

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "656db678132add9470b7595c",
                    userInputs: {
                        lineaProjectId: projectId,
                        TRANSACTION_HASH: "0x",
                    },
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
                                    {
                                        key: "ALLOWED_TOKEN_ADDRESSES",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_LIQUIDITY_AMOUNT",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_LIQUIDITY_PROJECT_TYPE",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "questerWalletAddress",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "lineaProjectId",
                                    },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: {
                            isPOWVerify: false,
                        },
                        recurrenceConfig: {
                            isRecurring: false,
                            frequencyInDays: 1,
                            maxRecurrenceCount: 1,
                        },
                        flashTaskConfig: {
                            isFlashTask: false,
                        },
                        name: "Add liquidity in specific pools available on Linea",
                        description:
                            "Add liquidity on Linea. Carefully select the pool based on task description to successfuly verify the task.",
                        templateType: "LineaAddLiquidity",
                        xp: 60,
                        adminInputs: [
                            {
                                key: "ALLOWED_TOKEN_ADDRESSES",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of Supported tokens",
                                placeholder: "amt",
                                value: [
                                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                    "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f",
                                    "0x176211869ca2b568f2a7d4ee941e073a821ee1ff",
                                    "0xa219439258ca9da29e9cc4ce5596924745e12b93",
                                    "0x3aab2285ddcddad8edf438c1bab47e1a9d05a9b4",
                                    "0x4af15ec2a0bd43db75dd04e62faa3b8ef36b00d5",
                                    "0x7d43aabc515c356145049227cee54b608342c0ad",
                                    "0xf5c6825015280cdfd0b56903f9f8b5a2233476f5",
                                    "0x3b2f62d42db19b30588648bf1c184865d4c3b1d6",
                                    "0x265b25e22bcd7f10a5bd6e6410f10537cc7567e8",
                                    "0x0d1e753a25ebda689453309112904807625befbe",
                                    "0x5471ea8f739dd37e9b81be9c5c77754d8aa953e4",
                                    "0x1a584204db35460a32e7d9990ac1874cb9fb0827",
                                    "0x6baa318cf7c51c76e17ae1ebe9bbff96ae017acb",
                                    "0x5b16228b94b68c7ce33af2acc5663ebde4dcfa2d",
                                    "0x0e076aafd86a71dceac65508daf975425c9d0cb6",
                                    "0x0e5f2ee8c29e7ebc14e45da7ff90566d8c407db7",
                                    "0x7da14988e4f390c2e34ed41df1814467d3ade0c3",
                                    "0x8c56017b172226fe024dea197748fc1eaccc82b1",
                                    "0x60d01ec2d5e98ac51c8b4cf84dfcce98d527c747",
                                    "0x43e8809ea748eff3204ee01f08872f063e44065f",
                                    "0x0b1a02a7309dfbfad1cd4adc096582c87e8a3ac1",
                                    "0x0963a1abaf36ca88c21032b82e479353126a1c4b",
                                    "0x9201f3b9dfab7c13cd659ac5695d12d605b5f1e6",
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0x93f4d0ab6a8b4271f4a28db399b5e30612d21116",
                                    "0x2f0b4300074afc01726262d4cc9c1d2619d7297a",
                                    "0xcc22f6aa610d1b2a0e89ef228079cb3e1831b1d1",
                                    "0x6ef95b6f3b0f39508e3e04054be96d5ee39ede0d",
                                    "0x1be3735dd0c0eb229fb11094b6c277192349ebbf",
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                    "0x93f4d0ab6a8b4271f4a28db399b5e30612d21116",
                                    "0x2f0b4300074afc01726262d4cc9c1d2619d7297a",
                                    "0xceed853798ff1c95ceb4dc48f68394eb7a86a782",
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0x3f006b0493ff32b33be2809367f5f6722cb84a7b",
                                    "0xb30e7a2e6f7389ca5ddc714da4c991b7a1dcc88e",
                                    "0x1a7e4e63778b4f12a199c062f3efdd288afcbce8",
                                ],
                                _id: "656db678132add9470b75966",
                            },
                            {
                                key: "LINEA_LIQUIDITY_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min total liquidity amount to be added in one single pool",
                                placeholder: "amt",
                                value: 20,
                                _id: "656db678132add9470b75967",
                            },
                            {
                                key: "LINEA_LIQUIDITY_PROJECT_TYPE",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "What kind of projects are allowed? Eg, only v3 pools, single sided pools, all projects etc",
                                placeholder: "amt",
                                value: ["V3"],
                                _id: "656db678132add9470b75968",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK5",
                        totalUsersCompleted: 44155,
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
                        _id: "656db678132add9470b75965",
                    },
                    verificationObject: {
                        lineaProjectId: projectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 5 Liquidity Ve Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave5LiquidityVe --network lineaMainnet"`
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

task("intractClaimWave5LiquidityVe", "Claim Wave 5 Liquidity Ve")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave5.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave5.tasksIds.LiquidityVe;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave5LiquiditySingle", "Verify Wave 5 Liquidity Single")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        var projectId: string | undefined = LineaCampaignIdentifiers.Wave5.XYFinance;

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const authInfo = await authenticate({ account: account });

                const verifyPayload = {
                    campaignId: "656db678132add9470b7595c",
                    userInputs: {
                        lineaProjectId: projectId,
                        TRANSACTION_HASH: "0x",
                    },
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
                                    {
                                        key: "ALLOWED_TOKEN_ADDRESSES",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_LIQUIDITY_AMOUNT",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_LIQUIDITY_PROJECT_TYPE",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "questerWalletAddress",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "lineaProjectId",
                                    },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: {
                            isPOWVerify: false,
                        },
                        recurrenceConfig: {
                            isRecurring: false,
                            frequencyInDays: 1,
                            maxRecurrenceCount: 1,
                        },
                        flashTaskConfig: {
                            isFlashTask: false,
                        },
                        name: "Add liquidity in specific pools available on Linea",
                        description:
                            "Add liquidity on Linea. Carefully select the pool based on task description to successfuly verify the task.",
                        templateType: "LineaAddLiquidity",
                        xp: 60,
                        adminInputs: [
                            {
                                key: "ALLOWED_TOKEN_ADDRESSES",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of Supported tokens",
                                placeholder: "amt",
                                value: [
                                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                    "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f",
                                    "0x176211869ca2b568f2a7d4ee941e073a821ee1ff",
                                    "0xa219439258ca9da29e9cc4ce5596924745e12b93",
                                    "0x3aab2285ddcddad8edf438c1bab47e1a9d05a9b4",
                                    "0x4af15ec2a0bd43db75dd04e62faa3b8ef36b00d5",
                                    "0x7d43aabc515c356145049227cee54b608342c0ad",
                                    "0xf5c6825015280cdfd0b56903f9f8b5a2233476f5",
                                    "0x3b2f62d42db19b30588648bf1c184865d4c3b1d6",
                                    "0x265b25e22bcd7f10a5bd6e6410f10537cc7567e8",
                                    "0x0d1e753a25ebda689453309112904807625befbe",
                                    "0x5471ea8f739dd37e9b81be9c5c77754d8aa953e4",
                                    "0x1a584204db35460a32e7d9990ac1874cb9fb0827",
                                    "0x6baa318cf7c51c76e17ae1ebe9bbff96ae017acb",
                                    "0x5b16228b94b68c7ce33af2acc5663ebde4dcfa2d",
                                    "0x0e076aafd86a71dceac65508daf975425c9d0cb6",
                                    "0x0e5f2ee8c29e7ebc14e45da7ff90566d8c407db7",
                                    "0x7da14988e4f390c2e34ed41df1814467d3ade0c3",
                                    "0x8c56017b172226fe024dea197748fc1eaccc82b1",
                                    "0x60d01ec2d5e98ac51c8b4cf84dfcce98d527c747",
                                    "0x43e8809ea748eff3204ee01f08872f063e44065f",
                                    "0x0b1a02a7309dfbfad1cd4adc096582c87e8a3ac1",
                                    "0x0963a1abaf36ca88c21032b82e479353126a1c4b",
                                    "0x9201f3b9dfab7c13cd659ac5695d12d605b5f1e6",
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0x93f4d0ab6a8b4271f4a28db399b5e30612d21116",
                                    "0x2f0b4300074afc01726262d4cc9c1d2619d7297a",
                                    "0xcc22f6aa610d1b2a0e89ef228079cb3e1831b1d1",
                                    "0x6ef95b6f3b0f39508e3e04054be96d5ee39ede0d",
                                    "0x1be3735dd0c0eb229fb11094b6c277192349ebbf",
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                    "0x93f4d0ab6a8b4271f4a28db399b5e30612d21116",
                                    "0x2f0b4300074afc01726262d4cc9c1d2619d7297a",
                                    "0xceed853798ff1c95ceb4dc48f68394eb7a86a782",
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0x3f006b0493ff32b33be2809367f5f6722cb84a7b",
                                    "0xb30e7a2e6f7389ca5ddc714da4c991b7a1dcc88e",
                                    "0x1a7e4e63778b4f12a199c062f3efdd288afcbce8",
                                    "0x0000000000000000000000000000000000000001",
                                ],
                                _id: "656db678132add9470b7596a",
                            },
                            {
                                key: "LINEA_LIQUIDITY_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min total liquidity amount to be added in one single pool",
                                placeholder: "amt",
                                value: 20,
                                _id: "656db678132add9470b7596b",
                            },
                            {
                                key: "LINEA_LIQUIDITY_PROJECT_TYPE",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "What kind of projects are allowed? Eg, only v3 pools, single sided pools, all projects etc",
                                placeholder: "amt",
                                value: ["SingleSided"],
                                _id: "656db678132add9470b7596c",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK5",
                        totalUsersCompleted: 66361,
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
                        _id: "656db678132add9470b75969",
                    },
                    verificationObject: {
                        lineaProjectId: projectId,
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 5 Liquidity Single Task.\nWait 50 minutes and claim with task "npx hardhat intractClaimWave5LiquiditySingle --network lineaMainnet"`
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

task("intractClaimWave5LiquiditySingle", "Claim Wave 5 Liquidity Single")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave5.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave5.tasksIds.LiquiditySingle;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave5LiquidityReview", "Verify Wave 5 Liquidity Review")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                    campaignId: "656db678132add9470b7595c",
                    userInputs: {
                        TRANSACTION_HASH: "0x",
                    },
                    task: {
                        userInputs: {
                            initiateButton: {
                                label: "Write a review!",
                                baseLink: "https://dappsheriff.com/",
                                isExist: true,
                            },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    {
                                        source: "ADMIN_INPUT_FIELD",
                                        key: "DAPPSHERIFF_SLUG",
                                    },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 900,
                            maxRetryCount: 3,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: {
                            isPOWVerify: false,
                        },
                        recurrenceConfig: {
                            isRecurring: false,
                            frequencyInDays: 1,
                            maxRecurrenceCount: 1,
                        },
                        flashTaskConfig: {
                            isFlashTask: false,
                        },
                        name: "Verify that you added review on Dappsheriff",
                        description: "Verify that you added review on Dappsheriff",
                        templateType: "DappsheriffReview",
                        xp: 20,
                        adminInputs: [
                            {
                                key: "DAPPSHERIFF_SLUG",
                                inputType: "INPUT_STRING",
                                label: "URI SLUG",
                                placeholder: "",
                                value: "waves/5",
                                _id: "656db678132add9470b7596e",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK1",
                        totalUsersCompleted: 130246,
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
                        _id: "656db678132add9470b7596d",
                    },
                    verificationObject: {
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(
                        `Verification started for Wave 5 Review liquidity on DappSheriff Task.\nWait 5 minutes and claim with task "npx hardhat intractClaimWave4LiquidityReview --network lineaMainnet"`
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

task("intractClaimWave5LiquidityReview", "Claim Wave 5 Liquidity Review")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave5.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave5.tasksIds.LiquidityReview;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

// WAVE 6

task("intractVerifyWave6PoH", "Verify Wave 5 Liquidity Review")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                    campaignId: "65705a282a20cd7291eb8e4b",
                    userInputs: {
                        TRANSACTION_HASH: "0x",
                    },
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
                                callbackParameters: [],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 600,
                            maxRetryCount: 1,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: {
                            isPOWVerify: false,
                        },
                        recurrenceConfig: {
                            isRecurring: false,
                            frequencyInDays: 1,
                            maxRecurrenceCount: 1,
                        },
                        flashTaskConfig: {
                            isFlashTask: false,
                        },
                        name: "Verax Verification",
                        description: "Verax Verification",
                        templateType: "VeraxVerification",
                        xp: 0,
                        adminInputs: [],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK4",
                        totalUsersCompleted: 123028,
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
                        _id: "65705a282a20cd7291eb8e4c",
                    },
                    verificationObject: {
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(`Verification started for Wave 6 PoH`);
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

task("intractLineaCheckVerification", "Check PoH verification for linea")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

                try {
                    const completedCampaigns: string[] = await getCompletedCampaigns(authInfo.token);
                    const isVerificationCOmpleted = completedCampaigns.includes(
                        LineaCampaignIdentifiers.Wave6.CampaignId
                    );
                    if (isVerificationCOmpleted) {
                        console.log(`Verification Completed`);
                    } else {
                        console.log(`Warning verification NOT completed`);
                    }
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
// WAVE 7

task("intractVerifyWave7Trading", "")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                    campaignId: "6572fc0bef415b56fd67608f",
                    userInputs: {
                        lineaProjectId: "6572e45ef45d51debfbef743",
                        TRANSACTION_HASH: "0x",
                    },
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
                                    {
                                        key: "LINEA_TRADING_AMOUNT",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_TRADE_TYPE",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "ALLOWED_TOKEN_ADDRESSES",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        key: "LINEA_TRADING_LOGIC_KEY",
                                        source: "ADMIN_INPUT_FIELD",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "questerWalletAddress",
                                    },
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "lineaProjectId",
                                    },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1200,
                            maxRetryCount: 2,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: {
                            isPOWVerify: false,
                        },
                        recurrenceConfig: {
                            isRecurring: false,
                            frequencyInDays: 1,
                            maxRecurrenceCount: 1,
                        },
                        flashTaskConfig: {
                            isFlashTask: false,
                        },
                        name: "Deposit at least $15 into a perpetual/options platform and make any trade.",
                        description: "Do not use >2x leverage, unless you are an experienced trader.",
                        templateType: "LineaTrade",
                        xp: 160,
                        adminInputs: [
                            {
                                key: "LINEA_TRADING_AMOUNT",
                                inputType: "INPUT_NUMBER",
                                label: "Min trading amount",
                                placeholder: "amt",
                                value: 5,
                                _id: "6572fc0bef415b56fd676091",
                            },
                            {
                                key: "LINEA_TRADE_TYPE",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "What kind of trades are allowed? ",
                                placeholder: "amt",
                                value: ["OPTIONS", "PERPETUAL"],
                                _id: "6572fc0bef415b56fd676092",
                            },
                            {
                                key: "ALLOWED_TOKEN_ADDRESSES",
                                inputType: "INPUT_STRING_ARRAY",
                                label: "List of Supported tokens",
                                placeholder: "amt",
                                value: [
                                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                    "0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f",
                                    "0x176211869ca2b568f2a7d4ee941e073a821ee1ff",
                                    "0xa219439258ca9da29e9cc4ce5596924745e12b93",
                                    "0x3aab2285ddcddad8edf438c1bab47e1a9d05a9b4",
                                    "0x4af15ec2a0bd43db75dd04e62faa3b8ef36b00d5",
                                    "0x7d43aabc515c356145049227cee54b608342c0ad",
                                    "0xf5c6825015280cdfd0b56903f9f8b5a2233476f5",
                                    "0x3b2f62d42db19b30588648bf1c184865d4c3b1d6",
                                    "0x265b25e22bcd7f10a5bd6e6410f10537cc7567e8",
                                    "0x0d1e753a25ebda689453309112904807625befbe",
                                    "0x5471ea8f739dd37e9b81be9c5c77754d8aa953e4",
                                    "0x1a584204db35460a32e7d9990ac1874cb9fb0827",
                                    "0x6baa318cf7c51c76e17ae1ebe9bbff96ae017acb",
                                    "0x5b16228b94b68c7ce33af2acc5663ebde4dcfa2d",
                                    "0x0e076aafd86a71dceac65508daf975425c9d0cb6",
                                    "0x0e5f2ee8c29e7ebc14e45da7ff90566d8c407db7",
                                    "0x7da14988e4f390c2e34ed41df1814467d3ade0c3",
                                    "0x8c56017b172226fe024dea197748fc1eaccc82b1",
                                    "0x60d01ec2d5e98ac51c8b4cf84dfcce98d527c747",
                                    "0x43e8809ea748eff3204ee01f08872f063e44065f",
                                    "0x0b1a02a7309dfbfad1cd4adc096582c87e8a3ac1",
                                    "0x0963a1abaf36ca88c21032b82e479353126a1c4b",
                                    "0x9201f3b9dfab7c13cd659ac5695d12d605b5f1e6",
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0x93f4d0ab6a8b4271f4a28db399b5e30612d21116",
                                    "0x2f0b4300074afc01726262d4cc9c1d2619d7297a",
                                    "0xcc22f6aa610d1b2a0e89ef228079cb3e1831b1d1",
                                    "0x6ef95b6f3b0f39508e3e04054be96d5ee39ede0d",
                                    "0x1be3735dd0c0eb229fb11094b6c277192349ebbf",
                                    "0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f",
                                    "0x93f4d0ab6a8b4271f4a28db399b5e30612d21116",
                                    "0x2f0b4300074afc01726262d4cc9c1d2619d7297a",
                                    "0xceed853798ff1c95ceb4dc48f68394eb7a86a782",
                                    "0xb79dd08ea68a908a97220c76d19a6aa9cbde4376",
                                    "0x1e1f509963a6d33e169d9497b11c7dbfe73b7f13",
                                    "0x3f006b0493ff32b33be2809367f5f6722cb84a7b",
                                    "0xb30e7a2e6f7389ca5ddc714da4c991b7a1dcc88e",
                                    "0x1a7e4e63778b4f12a199c062f3efdd288afcbce8",
                                ],
                                _id: "6572fc0bef415b56fd676093",
                            },
                            {
                                key: "LINEA_TRADING_LOGIC_KEY",
                                inputType: "INPUT_STRING",
                                label: "What is the logic? ser",
                                placeholder: "amt",
                                value: "ProjectWise",
                                _id: "6572fc0bef415b56fd676094",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK6",
                        totalUsersCompleted: 161208,
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
                        _id: "6572fc0bef415b56fd676090",
                    },
                    verificationObject: {
                        lineaProjectId: "6572e45ef45d51debfbef743",
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(`Verification started for Wave 7 Trading`);
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

task("intractClaimWave7Trading", "")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave7.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave7.tasksIds.Trade;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

task("intractVerifyWave7Review", "")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                    campaignId: "6572fc0bef415b56fd67608f",
                    userInputs: {
                        TRANSACTION_HASH: "0x",
                    },
                    task: {
                        userInputs: {
                            initiateButton: {
                                label: "Write a review!",
                                baseLink: "https://dappsheriff.com/",
                                isExist: true,
                            },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    {
                                        source: "ADMIN_INPUT_FIELD",
                                        key: "DAPPSHERIFF_SLUG",
                                    },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 1200,
                            maxRetryCount: 2,
                            retryTimeInSeconds: 600,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: {
                            isPOWVerify: false,
                        },
                        recurrenceConfig: {
                            isRecurring: false,
                            frequencyInDays: 1,
                            maxRecurrenceCount: 1,
                        },
                        flashTaskConfig: {
                            isFlashTask: false,
                        },
                        name: "Verify that you added review on Dappsheriff",
                        description: "Verify that you added review on Dappsheriff",
                        templateType: "DappsheriffReview",
                        xp: 20,
                        adminInputs: [
                            {
                                key: "DAPPSHERIFF_SLUG",
                                inputType: "INPUT_STRING",
                                label: "URI SLUG",
                                placeholder: "",
                                value: "waves/6",
                                _id: "6572fc0bef415b56fd67609b",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "LINEA/WEEK1",
                        totalUsersCompleted: 162655,
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
                        _id: "6572fc0bef415b56fd67609a",
                    },
                    verificationObject: {
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(`Verification started for Wave 7 Trading review on DappSheriff Task`);
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

task("intractClaimWave7Review", "")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave7.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave7.tasksIds.Review;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

// WAVE 8

task("intractVerifyWave8SocialFi", "")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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
                    campaignId: "65798e5c7d62adc325a44d92",
                    userInputs: {
                        TRANSACTION_HASH: "0x",
                    },
                    task: {
                        userInputs: {
                            initiateButton: {
                                label: "Mint NFT",
                                baseLink: "https://www.intract.io/compass/linea/explore?showNFT=true",
                                isExist: true,
                            },
                            verifyButton: {
                                label: "Verify",
                                callbackFunction: true,
                                callbackParameters: [
                                    {
                                        source: "CLIENT_VERIFICATION_OBJECT",
                                        key: "questerWalletAddress",
                                    },
                                    {
                                        source: "ADMIN_INPUT_FIELD",
                                        key: "NFT_CHAIN_ID",
                                    },
                                ],
                            },
                            dynamicInputs: [],
                        },
                        asyncVerifyConfig: {
                            isAsyncVerify: true,
                            verifyTimeInSeconds: 60,
                            maxRetryCount: 0,
                            retryTimeInSeconds: 0,
                            isScatterEnabled: false,
                            maxScatterInSeconds: 0,
                        },
                        powVerifyConfig: {
                            isPOWVerify: false,
                        },
                        recurrenceConfig: {
                            isRecurring: false,
                            frequencyInDays: 1,
                            maxRecurrenceCount: 1,
                        },
                        flashTaskConfig: {
                            isFlashTask: false,
                        },
                        name: "Holds the Intract Persona NFT",
                        description: "Verify ownership of Intract Persona NFT",
                        templateType: "PersonaNftBalance",
                        xp: 150,
                        adminInputs: [
                            {
                                key: "NFT_CHAIN_ID",
                                inputType: "INPUT_NUMBER",
                                label: "ChainId",
                                placeholder: "59144",
                                value: 59144,
                                _id: "65798e5c7d62adc325a44d99",
                            },
                            {
                                key: "API_INITIATION_URL",
                                inputType: "INPUT_STRING",
                                label: "Initiation URL",
                                placeholder: "https://intract.io/persona-nfts",
                                value: "https://www.intract.io/compass/linea/explore?showNFT=true",
                                _id: "65798e5c7d62adc325a44d9a",
                            },
                        ],
                        isAttributionTask: true,
                        templateFamily: "WALLET",
                        totalUsersCompleted: 13286,
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
                        _id: "65798e5c7d62adc325a44d98",
                    },
                    verificationObject: {
                        questerWalletAddress: account.address,
                    },
                };

                try {
                    await verifyTask(authInfo.token, verifyPayload, []);
                    console.log(`Verification started for Wave 8 SocialFi`);
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

task("intractClaimWave8SocialFi", "")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        const campaignId = LineaCampaignIdentifiers.Wave8.CampaignId;
        const taskId = LineaCampaignIdentifiers.Wave8.tasksIds.Core;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                try {
                    const authInfo = await authenticate({ account: account });
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

// Wave 9
task("intractVerifyWave9SuperDapps", "")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

                const verifyPayloads = [
                    {
                        campaignId: "657c3aa5d306cc1e607e918f",
                        userInputs: {
                            ANSWER: "Multi-chain support",
                            TRANSACTION_HASH: "0x",
                        },
                        task: {
                            userInputs: {
                                initiateButton: {
                                    label: "Answer",
                                    isExist: false,
                                    callbackFunction: false,
                                },
                                verifyButton: {
                                    label: "Verify",
                                    callbackFunction: true,
                                    callbackParameters: [
                                        {
                                            source: "QUEST_USER_INPUT_FIELD",
                                            key: "ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "RIGHT_ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "MAX_RETRIES",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "IS_XP_TO_BE_REDUCED",
                                        },
                                        {
                                            source: "QUEST_USER_DB_FIELD",
                                            key: "_id",
                                        },
                                        {
                                            source: "CAMPAIGN_DB_FIELD",
                                            key: "_id",
                                        },
                                    ],
                                },
                                dynamicInputs: [
                                    {
                                        key: "ANSWER",
                                        label: "Answer the quiz",
                                        placeholder: "Write your answer here",
                                        inputType: "INPUT_STRING",
                                        options: [],
                                        _id: "657c3aa5d306cc1e607e91e7",
                                    },
                                ],
                            },
                            asyncVerifyConfig: {
                                isAsyncVerify: false,
                                verifyTimeInSeconds: 0,
                                maxRetryCount: 0,
                                retryTimeInSeconds: 0,
                                isScatterEnabled: false,
                                maxScatterInSeconds: 0,
                            },
                            powVerifyConfig: {
                                isPOWVerify: false,
                            },
                            recurrenceConfig: {
                                isRecurring: false,
                                frequencyInDays: 0,
                                maxRecurrenceCount: 0,
                            },
                            flashTaskConfig: {
                                isFlashTask: false,
                            },
                            name: "Quiz with a right answer",
                            description: "What is a common feature among superdapps?",
                            templateType: "Quiz",
                            xp: 6,
                            adminInputs: [
                                {
                                    key: "QUESTION",
                                    inputType: "INPUT_STRING",
                                    label: "Describe your question",
                                    placeholder: "Describe your question",
                                    value: "What is a common feature among superdapps?",
                                    _id: "657c3aa5d306cc1e607e91e1",
                                },
                                {
                                    key: "MCQ_OPTIONS",
                                    inputType: "INPUT_STRING_ARRAY",
                                    label: "Add your options",
                                    value: [
                                        "Support for only one specific blockchain",
                                        "No support for decentralized applications",
                                        "Limited to fiat currency transactions",
                                        "Multi-chain support",
                                    ],
                                    _id: "657c3aa5d306cc1e607e91e2",
                                },
                                {
                                    key: "RIGHT_ANSWER",
                                    inputType: "SELECT_FROM_ADMIN_INPUT",
                                    label: "Select right options",
                                    optionsFrom: "MCQ_OPTIONS",
                                    _id: "657c3aa5d306cc1e607e91e3",
                                },
                                {
                                    key: "IS_TASK_TITLE",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "Set as task title",
                                    value: 1,
                                    _id: "657c3aa5d306cc1e607e91e4",
                                },
                                {
                                    key: "MAX_RETRIES",
                                    inputType: "INPUT_NUMBER",
                                    label: "Max Attempts Allowed?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e91e5",
                                },
                                {
                                    key: "IS_XP_TO_BE_REDUCED",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "XPs to be reduced on wrong answer?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e91e6",
                                },
                            ],
                            isAttributionTask: true,
                            templateFamily: "FORMS",
                            totalUsersCompleted: 30970,
                            totalRecurringUsersCompleted: [],
                            requiredLogins: [],
                            isIntractTask: false,
                            isRequiredTask: true,
                            showOnChainHelper: false,
                            hasMaxRetryCheck: true,
                            hasRateLimitCheck: false,
                            isAddedLater: false,
                            isVisible: true,
                            isDeleted: false,
                            _id: "657c3aa5d306cc1e607e91e0",
                        },
                        verificationObject: {
                            ANSWER: "Multi-chain support",
                            questerWalletAddress: account.address,
                        },
                    },
                    {
                        campaignId: "657c3aa5d306cc1e607e918f",
                        userInputs: {
                            ANSWER: "Providing integrated analytics tools for tracking and managing blockchain investments and activities",
                            TRANSACTION_HASH: "0x",
                        },
                        task: {
                            userInputs: {
                                initiateButton: {
                                    label: "Answer",
                                    isExist: false,
                                    callbackFunction: false,
                                },
                                verifyButton: {
                                    label: "Verify",
                                    callbackFunction: true,
                                    callbackParameters: [
                                        {
                                            source: "QUEST_USER_INPUT_FIELD",
                                            key: "ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "RIGHT_ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "MAX_RETRIES",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "IS_XP_TO_BE_REDUCED",
                                        },
                                        {
                                            source: "QUEST_USER_DB_FIELD",
                                            key: "_id",
                                        },
                                        {
                                            source: "CAMPAIGN_DB_FIELD",
                                            key: "_id",
                                        },
                                    ],
                                },
                                dynamicInputs: [
                                    {
                                        key: "ANSWER",
                                        label: "Answer the quiz",
                                        placeholder: "Write your answer here",
                                        inputType: "INPUT_STRING",
                                        options: [],
                                        _id: "657c3aa5d306cc1e607e91ef",
                                    },
                                ],
                            },
                            asyncVerifyConfig: {
                                isAsyncVerify: false,
                                verifyTimeInSeconds: 0,
                                maxRetryCount: 0,
                                retryTimeInSeconds: 0,
                                isScatterEnabled: false,
                                maxScatterInSeconds: 0,
                            },
                            powVerifyConfig: {
                                isPOWVerify: false,
                            },
                            recurrenceConfig: {
                                isRecurring: false,
                                frequencyInDays: 0,
                                maxRecurrenceCount: 0,
                            },
                            flashTaskConfig: {
                                isFlashTask: false,
                            },
                            name: "Quiz with a right answer",
                            description:
                                "How are Superdapps addressing the challenge of blockchain data analysis and management?",
                            templateType: "Quiz",
                            xp: 6,
                            adminInputs: [
                                {
                                    key: "QUESTION",
                                    inputType: "INPUT_STRING",
                                    label: "Describe your question",
                                    placeholder: "Describe your question",
                                    value: "How are Superdapps addressing the challenge of blockchain data analysis and management?",
                                    _id: "657c3aa5d306cc1e607e91e9",
                                },
                                {
                                    key: "MCQ_OPTIONS",
                                    inputType: "INPUT_STRING_ARRAY",
                                    label: "Add your options",
                                    value: [
                                        "Providing integrated analytics tools for tracking and managing blockchain investments and activities",
                                        "Offering no data analysis tools",
                                        "Limited analytics to specific blockchain networks",
                                        "Only basic tracking of transaction history",
                                    ],
                                    _id: "657c3aa5d306cc1e607e91ea",
                                },
                                {
                                    key: "RIGHT_ANSWER",
                                    inputType: "SELECT_FROM_ADMIN_INPUT",
                                    label: "Select right options",
                                    optionsFrom: "MCQ_OPTIONS",
                                    _id: "657c3aa5d306cc1e607e91eb",
                                },
                                {
                                    key: "IS_TASK_TITLE",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "Set as task title",
                                    value: 1,
                                    _id: "657c3aa5d306cc1e607e91ec",
                                },
                                {
                                    key: "MAX_RETRIES",
                                    inputType: "INPUT_NUMBER",
                                    label: "Max Attempts Allowed?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e91ed",
                                },
                                {
                                    key: "IS_XP_TO_BE_REDUCED",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "XPs to be reduced on wrong answer?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e91ee",
                                },
                            ],
                            isAttributionTask: true,
                            templateFamily: "FORMS",
                            totalUsersCompleted: 30866,
                            totalRecurringUsersCompleted: [],
                            requiredLogins: [],
                            isIntractTask: false,
                            isRequiredTask: true,
                            showOnChainHelper: false,
                            hasMaxRetryCheck: true,
                            hasRateLimitCheck: false,
                            isAddedLater: false,
                            isVisible: true,
                            isDeleted: false,
                            _id: "657c3aa5d306cc1e607e91e8",
                        },
                        verificationObject: {
                            ANSWER: "Providing integrated analytics tools for tracking and managing blockchain investments and activities",
                            questerWalletAddress: account.address,
                        },
                    },
                    {
                        campaignId: "657c3aa5d306cc1e607e918f",
                        userInputs: {
                            ANSWER: "Offering integrated gaming platforms and easy management of in-game assets and currencies",
                            TRANSACTION_HASH: "0x",
                        },
                        task: {
                            userInputs: {
                                initiateButton: {
                                    label: "Answer",
                                    isExist: false,
                                    callbackFunction: false,
                                },
                                verifyButton: {
                                    label: "Verify",
                                    callbackFunction: true,
                                    callbackParameters: [
                                        {
                                            source: "QUEST_USER_INPUT_FIELD",
                                            key: "ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "RIGHT_ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "MAX_RETRIES",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "IS_XP_TO_BE_REDUCED",
                                        },
                                        {
                                            source: "QUEST_USER_DB_FIELD",
                                            key: "_id",
                                        },
                                        {
                                            source: "CAMPAIGN_DB_FIELD",
                                            key: "_id",
                                        },
                                    ],
                                },
                                dynamicInputs: [
                                    {
                                        key: "ANSWER",
                                        label: "Answer the quiz",
                                        placeholder: "Write your answer here",
                                        inputType: "INPUT_STRING",
                                        options: [],
                                        _id: "657c3aa5d306cc1e607e91f7",
                                    },
                                ],
                            },
                            asyncVerifyConfig: {
                                isAsyncVerify: false,
                                verifyTimeInSeconds: 0,
                                maxRetryCount: 0,
                                retryTimeInSeconds: 0,
                                isScatterEnabled: false,
                                maxScatterInSeconds: 0,
                            },
                            powVerifyConfig: {
                                isPOWVerify: false,
                            },
                            recurrenceConfig: {
                                isRecurring: false,
                                frequencyInDays: 0,
                                maxRecurrenceCount: 0,
                            },
                            flashTaskConfig: {
                                isFlashTask: false,
                            },
                            name: "Quiz with a right answer",
                            description:
                                "In the sphere of SuperDApps, how do crypto wallets facilitate blockchain gaming experiences?",
                            templateType: "Quiz",
                            xp: 6,
                            adminInputs: [
                                {
                                    key: "QUESTION",
                                    inputType: "INPUT_STRING",
                                    label: "Describe your question",
                                    placeholder: "Describe your question",
                                    value: "In the sphere of SuperDApps, how do crypto wallets facilitate blockchain gaming experiences?",
                                    _id: "657c3aa5d306cc1e607e91f1",
                                },
                                {
                                    key: "MCQ_OPTIONS",
                                    inputType: "INPUT_STRING_ARRAY",
                                    label: "Add your options",
                                    value: [
                                        "No support for blockchain gaming",
                                        "Offering integrated gaming platforms and easy management of in-game assets and currencies",
                                        "Limited to tracking gaming assets",
                                        "Only providing information about blockchain games",
                                    ],
                                    _id: "657c3aa5d306cc1e607e91f2",
                                },
                                {
                                    key: "RIGHT_ANSWER",
                                    inputType: "SELECT_FROM_ADMIN_INPUT",
                                    label: "Select right options",
                                    optionsFrom: "MCQ_OPTIONS",
                                    _id: "657c3aa5d306cc1e607e91f3",
                                },
                                {
                                    key: "IS_TASK_TITLE",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "Set as task title",
                                    value: 1,
                                    _id: "657c3aa5d306cc1e607e91f4",
                                },
                                {
                                    key: "MAX_RETRIES",
                                    inputType: "INPUT_NUMBER",
                                    label: "Max Attempts Allowed?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e91f5",
                                },
                                {
                                    key: "IS_XP_TO_BE_REDUCED",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "XPs to be reduced on wrong answer?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e91f6",
                                },
                            ],
                            isAttributionTask: true,
                            templateFamily: "FORMS",
                            totalUsersCompleted: 30830,
                            totalRecurringUsersCompleted: [],
                            requiredLogins: [],
                            isIntractTask: false,
                            isRequiredTask: true,
                            showOnChainHelper: false,
                            hasMaxRetryCheck: true,
                            hasRateLimitCheck: false,
                            isAddedLater: false,
                            isVisible: true,
                            isDeleted: false,
                            _id: "657c3aa5d306cc1e607e91f0",
                        },
                        verificationObject: {
                            ANSWER: "Offering integrated gaming platforms and easy management of in-game assets and currencies",
                            questerWalletAddress: account.address,
                        },
                    },
                    {
                        campaignId: "657c3aa5d306cc1e607e918f",
                        userInputs: {
                            ANSWER: "Facilitate seamless cross-chain transfers and swaps",
                            TRANSACTION_HASH: "0x",
                        },
                        task: {
                            userInputs: {
                                initiateButton: {
                                    label: "Answer",
                                    isExist: false,
                                    callbackFunction: false,
                                },
                                verifyButton: {
                                    label: "Verify",
                                    callbackFunction: true,
                                    callbackParameters: [
                                        {
                                            source: "QUEST_USER_INPUT_FIELD",
                                            key: "ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "RIGHT_ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "MAX_RETRIES",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "IS_XP_TO_BE_REDUCED",
                                        },
                                        {
                                            source: "QUEST_USER_DB_FIELD",
                                            key: "_id",
                                        },
                                        {
                                            source: "CAMPAIGN_DB_FIELD",
                                            key: "_id",
                                        },
                                    ],
                                },
                                dynamicInputs: [
                                    {
                                        key: "ANSWER",
                                        label: "Answer the quiz",
                                        placeholder: "Write your answer here",
                                        inputType: "INPUT_STRING",
                                        options: [],
                                        _id: "657c3aa5d306cc1e607e91ff",
                                    },
                                ],
                            },
                            asyncVerifyConfig: {
                                isAsyncVerify: false,
                                verifyTimeInSeconds: 0,
                                maxRetryCount: 0,
                                retryTimeInSeconds: 0,
                                isScatterEnabled: false,
                                maxScatterInSeconds: 0,
                            },
                            powVerifyConfig: {
                                isPOWVerify: false,
                            },
                            recurrenceConfig: {
                                isRecurring: false,
                                frequencyInDays: 0,
                                maxRecurrenceCount: 0,
                            },
                            flashTaskConfig: {
                                isFlashTask: false,
                            },
                            name: "Quiz with a right answer",
                            description: "How do most superdapps address cross-chain transactions?",
                            templateType: "Quiz",
                            xp: 6,
                            adminInputs: [
                                {
                                    key: "QUESTION",
                                    inputType: "INPUT_STRING",
                                    label: "Describe your question",
                                    placeholder: "Describe your question",
                                    value: "How do most superdapps address cross-chain transactions?",
                                    _id: "657c3aa5d306cc1e607e91f9",
                                },
                                {
                                    key: "MCQ_OPTIONS",
                                    inputType: "INPUT_STRING_ARRAY",
                                    label: "Add your options",
                                    value: [
                                        "No support for cross-chain transactions",
                                        "Facilitate seamless cross-chain transfers and swaps",
                                        "Charge high fees for cross-chain transactions",
                                        "Limited to only the most popular chains",
                                    ],
                                    _id: "657c3aa5d306cc1e607e91fa",
                                },
                                {
                                    key: "RIGHT_ANSWER",
                                    inputType: "SELECT_FROM_ADMIN_INPUT",
                                    label: "Select right options",
                                    optionsFrom: "MCQ_OPTIONS",
                                    _id: "657c3aa5d306cc1e607e91fb",
                                },
                                {
                                    key: "IS_TASK_TITLE",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "Set as task title",
                                    value: 1,
                                    _id: "657c3aa5d306cc1e607e91fc",
                                },
                                {
                                    key: "MAX_RETRIES",
                                    inputType: "INPUT_NUMBER",
                                    label: "Max Attempts Allowed?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e91fd",
                                },
                                {
                                    key: "IS_XP_TO_BE_REDUCED",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "XPs to be reduced on wrong answer?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e91fe",
                                },
                            ],
                            isAttributionTask: true,
                            templateFamily: "FORMS",
                            totalUsersCompleted: 30804,
                            totalRecurringUsersCompleted: [],
                            requiredLogins: [],
                            isIntractTask: false,
                            isRequiredTask: true,
                            showOnChainHelper: false,
                            hasMaxRetryCheck: true,
                            hasRateLimitCheck: false,
                            isAddedLater: false,
                            isVisible: true,
                            isDeleted: false,
                            _id: "657c3aa5d306cc1e607e91f8",
                        },
                        verificationObject: {
                            ANSWER: "Facilitate seamless cross-chain transfers and swaps",
                            questerWalletAddress: account.address,
                        },
                    },
                    {
                        campaignId: "657c3aa5d306cc1e607e918f",
                        userInputs: {
                            ANSWER: "Emphasis on simplicity and ease of use, catering to both beginners and experts",
                            TRANSACTION_HASH: "0x",
                        },
                        task: {
                            userInputs: {
                                initiateButton: {
                                    label: "Answer",
                                    isExist: false,
                                    callbackFunction: false,
                                },
                                verifyButton: {
                                    label: "Verify",
                                    callbackFunction: true,
                                    callbackParameters: [
                                        {
                                            source: "QUEST_USER_INPUT_FIELD",
                                            key: "ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "RIGHT_ANSWER",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "MAX_RETRIES",
                                        },
                                        {
                                            source: "ADMIN_INPUT_FIELD",
                                            key: "IS_XP_TO_BE_REDUCED",
                                        },
                                        {
                                            source: "QUEST_USER_DB_FIELD",
                                            key: "_id",
                                        },
                                        {
                                            source: "CAMPAIGN_DB_FIELD",
                                            key: "_id",
                                        },
                                    ],
                                },
                                dynamicInputs: [
                                    {
                                        key: "ANSWER",
                                        label: "Answer the quiz",
                                        placeholder: "Write your answer here",
                                        inputType: "INPUT_STRING",
                                        options: [],
                                        _id: "657c3aa5d306cc1e607e9207",
                                    },
                                ],
                            },
                            asyncVerifyConfig: {
                                isAsyncVerify: false,
                                verifyTimeInSeconds: 0,
                                maxRetryCount: 0,
                                retryTimeInSeconds: 0,
                                isScatterEnabled: false,
                                maxScatterInSeconds: 0,
                            },
                            powVerifyConfig: {
                                isPOWVerify: false,
                            },
                            recurrenceConfig: {
                                isRecurring: false,
                                frequencyInDays: 0,
                                maxRecurrenceCount: 0,
                            },
                            flashTaskConfig: {
                                isFlashTask: false,
                            },
                            name: "Quiz with a right answer",
                            description: "What is a notable trend in superdapp user experience design?",
                            templateType: "Quiz",
                            xp: 6,
                            adminInputs: [
                                {
                                    key: "QUESTION",
                                    inputType: "INPUT_STRING",
                                    label: "Describe your question",
                                    placeholder: "Describe your question",
                                    value: "What is a notable trend in superdapp user experience design?",
                                    _id: "657c3aa5d306cc1e607e9201",
                                },
                                {
                                    key: "MCQ_OPTIONS",
                                    inputType: "INPUT_STRING_ARRAY",
                                    label: "Add your options",
                                    value: [
                                        "Focus on technical users with complex interfaces",
                                        "Text-based interfaces",
                                        "Emphasis on simplicity and ease of use, catering to both beginners and experts",
                                        "No graphical user interface, command-line only",
                                    ],
                                    _id: "657c3aa5d306cc1e607e9202",
                                },
                                {
                                    key: "RIGHT_ANSWER",
                                    inputType: "SELECT_FROM_ADMIN_INPUT",
                                    label: "Select right options",
                                    optionsFrom: "MCQ_OPTIONS",
                                    _id: "657c3aa5d306cc1e607e9203",
                                },
                                {
                                    key: "IS_TASK_TITLE",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "Set as task title",
                                    value: 1,
                                    _id: "657c3aa5d306cc1e607e9204",
                                },
                                {
                                    key: "MAX_RETRIES",
                                    inputType: "INPUT_NUMBER",
                                    label: "Max Attempts Allowed?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e9205",
                                },
                                {
                                    key: "IS_XP_TO_BE_REDUCED",
                                    inputType: "INPUT_CHECKBOX",
                                    label: "XPs to be reduced on wrong answer?",
                                    value: 0,
                                    _id: "657c3aa5d306cc1e607e9206",
                                },
                            ],
                            isAttributionTask: true,
                            templateFamily: "FORMS",
                            totalUsersCompleted: 30752,
                            totalRecurringUsersCompleted: [],
                            requiredLogins: [],
                            isIntractTask: false,
                            isRequiredTask: true,
                            showOnChainHelper: false,
                            hasMaxRetryCheck: true,
                            hasRateLimitCheck: false,
                            isAddedLater: false,
                            isVisible: true,
                            isDeleted: false,
                            _id: "657c3aa5d306cc1e607e9200",
                        },
                        verificationObject: {
                            ANSWER: "Emphasis on simplicity and ease of use, catering to both beginners and experts",
                            questerWalletAddress: account.address,
                        },
                    },
                ];

                try {
                    console.log(`Verification started for Wave 9 SuperDapps`);
                    for (const data of verifyPayloads) {
                        await verifyTask(authInfo.token, data, []);
                        console.log(`Question ${verifyPayloads.indexOf(data) + 1}`);
                        await delay(0.02);
                    }
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
