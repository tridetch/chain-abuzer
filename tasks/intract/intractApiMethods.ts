import axios, { AxiosError, AxiosResponse } from "axios";
import { ethers } from "ethers";
import * as fs from "fs";
import { MOCK_USER_AGENT } from "../../utils/Utils";
import {
    AuthInfo,
    GenerateNonceResponse,
    LineaCampaingInfo,
    UserCampaingInfo,
    UserResponsePayload,
    WalletRequestPayload,
} from "./intractApiModels";

export const INTRACT_ENDPOINT_URL = "https://api.intract.io/api/";
export const LOGIN_MESSAGE = "Please sign this message to verify your identity. Nonce: ";
export const REFERRAL_INFO = {
    referralCode: "JTlb4u",
    referralLink: "https://www.intract.io/referral?utm_source=navbar",
    referralSource: "REFERRAL_PAGE",
};
export const LineaCampaignIdentifiers = {
    MainCampaignId: "6549ed0333cc8772783b858b",
    Wave1: {
        Name: "Metamask",
        CampaignId: "654a0e8d95c012164b1f1620",
        tasksIds: {
            BridgeOnMetamask: "654a0e8d95c012164b1f1621",
            SwapOnMetamask: "654a0e8d95c012164b1f1623",
        },
    },
    Wave2: {
        Name: "Bridging and Onramps",
        CampaignId: "65535ae63cd33ebafe9d68f8",
        tasksIds: {
            BridgeCore: "65535ae63cd33ebafe9d68f9",
            StargateProjectId: "653f74996e3c9704874cdd5a",
            OrbiterProjectId: "653aa0a76e3c9704874cdd31",
            RhinoFiProjectId: "653f8538731c016673c182f8",
            BridgeBonus25: {
                StargateTaskId: "65535ae63cd33ebafe9d6909",
                OrbiterTaskId: "65535ae63cd33ebafe9d6900",
                RhinoFiTaskId: "65535ae63cd33ebafe9d6921",
            },
            BridgeBonus500: "65535ae63cd33ebafe9d68fb",
            BridgeBonus1000: "65535ae63cd33ebafe9d68fd",
            Review: "65535ae63cd33ebafe9d68ff",
        },
    },
};

export const InteractApiUrls = {
    GenerateNonce: "https://api.intract.io/api/qv1/auth/generate-nonce",
    Wallet: "https://api.intract.io/api/qv1/auth/wallet",
    SetWallet: "https://api.intract.io/api/qv1/linea/user/set-wallet",
    GetSuperUser: "https://api.intract.io/api/qv1/auth/get-super-user",
    GetLineaUserCampaing: "https://api.intract.io/api/qv1/auth/get-user?projectId=6549ed0333cc8772783b858b",
    GmStreak: "https://api.intract.io/api/qv1/auth/gm-streak",
    LineaDailyQuiz: "https://api.intract.io/api/qv1/linea/user/streak",
    CompletedCompaigns: "https://api.intract.io/api/qv1/campaign/completed-campaignids",
    VerifyTask: "https://api.intract.io/api/qv1/task/verify",
    ClaimTask: "https://api.intract.io/api/qv1/campaign/{campaignId}/claim-task-xp",
    LineaCampaignInfo: "https://api.intract.io/api/qv1/journey/fetch",
};

export var AuthCache: AuthInfo[] = [];

interface AuthArgs {
    account: ethers.Wallet;
    referralCode?: string | null;
}

export async function authenticate({ account, referralCode = null }: AuthArgs): Promise<AuthInfo> {
    // Check for existing auth info

    if (AuthCache.length == 0) {
        try {
            AuthCache = require(`./ItractAuthCache.json`);
        } catch {
            // ignore
        }
    }

    const filePath = `./tasks/intract/ItractAuthCache.json`;

    var authInfo = AuthCache.find((info) => info.address == account.address);

    var tommorow = new Date();
    tommorow.setDate(tommorow.getDate() + 1);

    if (authInfo && new Date(authInfo.expires) > tommorow) {
        return authInfo;
    }

    const generateNonceResponse: AxiosResponse<GenerateNonceResponse> = await axios.post(
        InteractApiUrls.GenerateNonce,
        {
            walletAddress: account.address,
            headers: {
                "User-Agent": MOCK_USER_AGENT,
            },
        }
    );

    // console.log("\ngenerateNonceResponse");
    // console.log(generateNonceResponse);
    // console.log(
    //     `Sing message ${LOGIN_MESSAGE + generateNonceResponse.data.data.nonce}\nLogin...`
    // );
    console.log(`Login...`);

    const signedMessage = await account.signMessage(LOGIN_MESSAGE + generateNonceResponse.data.data.nonce);

    const walletResponse: AxiosResponse<UserResponsePayload> = await axios.post(
        InteractApiUrls.Wallet,
        getWalletRequestPayload(signedMessage, account.address, referralCode),
        {
            headers: {
                "User-Agent": MOCK_USER_AGENT,
            },
        }
    );
    // console.log(walletResponse);

    var setCookies: string | undefined = walletResponse.headers["set-cookie"]?.[0];
    // console.log(setCookies);

    var expDate: Date = new Date();
    if (setCookies) {
        var startIndex = setCookies.search("Expires=");
        var endIndex = setCookies.search("; HttpOnly");

        expDate = new Date(setCookies.substring(startIndex, endIndex));
    } else {
        expDate.setDate(expDate.getDate() + 6);
    }

    // console.log("\nwalletResponse");
    // console.log(walletResponse);
    const userId = walletResponse.data._id;
    const authToken = walletResponse.headers["authorization"];

    authInfo = { address: account.address, userId: userId, token: authToken, expires: expDate.toISOString() };

    // update cache
    AuthCache = AuthCache.filter((it) => it.address != account.address);

    AuthCache.push(authInfo);

    fs.writeFileSync(filePath, JSON.stringify(AuthCache));

    return authInfo;
}

export function getWalletRequestPayload(
    signature: string,
    address: string,
    referralCode: string | null
): WalletRequestPayload {
    return {
        signature: signature,
        userAddress: address,
        chain: {
            id: 59144,
            name: "Linea",
            network: "Linea",
            nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
            rpcUrls: {
                public: { http: ["https://linea.drpc.org"] },
                default: { http: ["https://linea-mainnet.infura.io/v3/bfc263a4f3cf49998641d16c24fd0b46"] },
            },
            blockExplorers: {
                etherscan: { name: "Lineascan", url: "https://lineascan.build/" },
                default: { name: "Lineascan", url: "https://lineascan.build/" },
            },
            unsupported: false,
        },
        isTaskLogin: false,
        width: "590px",
        reAuth: false,
        connector: "metamask",
        referralCode: referralCode,
        referralLink: referralCode ? REFERRAL_INFO.referralLink : null,
        referralSource: referralCode ? REFERRAL_INFO.referralSource : null,
    };
}

export async function getSuperUserInfo(token: string): Promise<UserResponsePayload> {
    var getSuperUserResponse: AxiosResponse<UserResponsePayload>;
    try {
        getSuperUserResponse = await axios.get(InteractApiUrls.GetSuperUser, {
            headers: {
                "User-Agent": MOCK_USER_AGENT,
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (e: any) {
        if (e instanceof AxiosError) {
            throw new Error(e.response?.data.message);
        } else {
            throw e;
        }
    }

    return getSuperUserResponse.data;
}

export async function getLineaCampaingUserInfo(token: string): Promise<UserCampaingInfo> {
    var getLineaCampaingUserResponse: AxiosResponse<UserCampaingInfo>;
    try {
        getLineaCampaingUserResponse = await axios.get(InteractApiUrls.GetLineaUserCampaing, {
            headers: {
                "User-Agent": MOCK_USER_AGENT,
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (e: any) {
        if (e instanceof AxiosError) {
            throw new Error(e.response?.data.message);
        } else {
            throw e;
        }
    }
    return getLineaCampaingUserResponse.data;
}

export async function getCompletedCampaigns(token: string): Promise<string[]> {
    var getComplitedCampaignsResponse: AxiosResponse<string[]>;
    try {
        getComplitedCampaignsResponse = await axios.get(InteractApiUrls.CompletedCompaigns, {
            headers: {
                "User-Agent": MOCK_USER_AGENT,
                Authorization: `Bearer ${token}`,
            },
        });
    } catch (e: any) {
        if (e instanceof AxiosError) {
            throw new Error(e.response?.data.message);
        } else {
            throw e;
        }
    }
    return getComplitedCampaignsResponse.data;
}

export async function getCampaignInfo(token: string, campaignId: string): Promise<LineaCampaingInfo> {
    var getCampaignInfoResponse: AxiosResponse<LineaCampaingInfo>;
    try {
        var getLineaCampaingUserResponse: UserCampaingInfo = await getLineaCampaingUserInfo(token);

        getCampaignInfoResponse = await axios.get(InteractApiUrls.LineaCampaignInfo, {
            params: { campaignId: campaignId, channelCode: "DEFAULT", referralCode: null },
            headers: {
                "User-Agent": MOCK_USER_AGENT,
                Authorization: `Bearer ${token}`,
                Questuserid: getLineaCampaingUserResponse._id,
            },
        });
    } catch (e: any) {
        if (e instanceof AxiosError) {
            throw new Error(e.response?.data.message);
        } else {
            throw e;
        }
    }
    return getCampaignInfoResponse.data;
}

export async function verifyTask(token: string, payload: any, preconditionTasks: string[]): Promise<void> {
    try {
        var campaignInfo = await getCampaignInfo(token, payload.campaignId);

        var isPreconditionsCompleted = true;
        for (const taskId of preconditionTasks) {
            const completedTask = campaignInfo.events.find((e) => e.taskId === taskId);
            if (!completedTask) {
                isPreconditionsCompleted = false;
            } else if (!completedTask.isVerified) {
                isPreconditionsCompleted = false;
            }
        }

        if (!isPreconditionsCompleted) {
            throw new Error("Complete Core tasks before verification");
        }

        var getLineaCampaingUserResponse: UserCampaingInfo = await getLineaCampaingUserInfo(token);
        const verifyResponse = await axios.post(InteractApiUrls.VerifyTask, payload, {
            headers: {
                "User-Agent": MOCK_USER_AGENT,
                Authorization: `Bearer ${token}`,
                Questuserid: getLineaCampaingUserResponse._id,
            },
        });
    } catch (e: any) {
        if (e instanceof AxiosError) {
            console.log(e.response?.data.message);
        } else {
            throw e;
        }
    }
}

export async function claimTask(token: string, campaignId: string, taskId: string): Promise<void> {
    try {
        var campaignInfo = await getCampaignInfo(token, campaignId);
        const completedTask = campaignInfo.events.find((e) => e.taskId == taskId);
        if (!completedTask) {
            throw new Error("Task not completed. Verify end try again.");
        }
        if (completedTask.isXpClaimed) {
            throw new Error("Task already claimed");
        } else {
            var getLineaCampaingUserResponse: UserCampaingInfo = await getLineaCampaingUserInfo(token);
            const claimResponse = await axios.post(
                InteractApiUrls.ClaimTask.replace("{campaignId}", campaignId),
                { taskId: taskId },
                {
                    headers: {
                        "User-Agent": MOCK_USER_AGENT,
                        Authorization: `Bearer ${token}`,
                        Questuserid: getLineaCampaingUserResponse._id,
                    },
                }
            );
            console.log(`Task claimed +${claimResponse.data.claimDetails[0].xp} XP earned!`);
        }
    } catch (e: any) {
        if (e instanceof AxiosError) {
            console.log(e.response?.data.message);
        } else {
            throw e;
        }
    }
}
