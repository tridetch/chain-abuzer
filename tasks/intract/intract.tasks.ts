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

// WAVE 1 - METAMASK

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

task("intractDappSheriffReview", "Review dapp on DappSheriff")
    .addParam("appId", "Application ID for review", 39, types.int, true)
    .addParam("reviewText", "Review text", "Great protocol", types.string, true)
    .addParam("rate", "rate", 5, types.float, true)
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

task("intractVerifyWave2BridgeReview", "Verify Wave 2 Review")
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
