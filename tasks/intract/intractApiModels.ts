export const INTRACT_ENDPOINT_URL = "https://api.intract.io/api/";
export const LOGIN_MESSAGE = "Please sign this message to verify your identity. Nonce: ";

export interface AuthInfo {
    address: string;
    userId: string;
    token: string;
    expires: string;
}

export interface GenerateNonceResponse {
    success: boolean;
    data: {
        _id: string;
        walletAddress: string;
        createdAt: Date;
        nonce: string;
        updatedAt: Date;
    };
    message: string;
}

// Wallet
export interface WalletRequestPayload {
    signature: string;
    userAddress: string;
    chain: {
        id: number;
        name: string;
        network: string;
        nativeCurrency: { decimals: number; name: string; symbol: string };
        rpcUrls: {
            public: { http: string[] };
            default: { http: string[] };
        };
        blockExplorers: {
            etherscan: { name: string; url: string };
            default: { name: string; url: string };
        };
        unsupported: boolean;
    };
    isTaskLogin: boolean;
    width: string;
    reAuth: boolean;
    connector: string;
    referralCode: string | null;
    referralLink: string | null;
    referralSource: string | null;
}

export interface UserResponsePayload {
    discord: {
        roles: [];
        isGuildMember: false;
        guilds: [];
    };
    notifications: {
        enableNotification: true;
        sources: [];
    };
    gmStreak: {
        expiredStreakCount: number;
        streakCount: number;
        longestStreakCount: number;
        streakTimestamp: Date;
        isFirstTimeMarked: boolean;
    };
    onboarding: {
        rewardedAmount: {
            gems: number;
            xps: number;
        };
        status: string;
        captchaValue: string;
        isRewarded: boolean;
        isCaptchaVerified: boolean;
        isProfileCompleted: boolean;
        isLockedTillVerified: boolean;
    };
    _id: string;
    userAddresses: any[];
    totalXp: number;
    totalGems: number;
    completedCampaigns: any[];
    identities: any[];
    referralCode: string;
    ongoingCampaigns: any[];
    badges: [];
    createdAt: Date;
    updatedAt: Date;
    isTwitterLoggedIn: boolean;
    isDiscordLoggedIn: boolean;
    isTelegramLoggedIn: boolean;
    isEVMLoggedIn: boolean;
    isPlenaLoggedIn: boolean;
    isBitfinityLoggedIn: boolean;
    isEmailLoggedIn: boolean;
    email: string | null;
}
//
// UserCampaign
export interface UserCampaingInfo {
    discord: {
        roles: [];
        isGuildMember: false;
    };
    _id: string;
    superUserId: string;
    userAddresses: any[];
    totalXp: number;
    totalTransactions: number;
    campaigns: string[];
    isDeleted: boolean;
    ips: any[];
    importedUser: boolean;
    identities: [];
    alphaHubNarrativeMetrics: any[];
    attribution: any[];
    createdAt: Date;
    updatedAt: Date;
    campaignMetrics: {
        "654a0e8d95c012164b1f1620": {
            totalValueSpend: {
                volumeUSD: number;
                inValueUSD: number;
                outValueUSD: number;
            };
            questJourneyStatus: string;
            xp: number;
            countedInLogin: boolean;
            _id: string;
        };
    };
    lineaStreak: {
        streakCount: number;
        longestStreakCount: number;
        streakTimestamp: String;
        isFirstTimeMarked: boolean;
    };
    lineaWalletAddress: string;
    isTwitterLoggedIn: boolean;
    isDiscordLoggedIn: boolean;
    isTelegramLoggedIn: boolean;
    isEVMLoggedIn: boolean;
    isPlenaLoggedIn: boolean;
    isBitfinityLoggedIn: boolean;
    isEmailLoggedIn: boolean;
    email: string;
}
//

export interface LineaCampaingInfo {
    lineaMetadata: {
        bridge: {
            projectVolume: any[];
        };
        swap: {
            metamaskAmount: number;
        };
        metamaskBridge: {
            covalentResponseData: [
                {
                    tx_hash: string;
                    signed_at: Date;
                    chain_name: string;
                }
            ];
        };
    };
    _id: string;
    campaignId: string;
    enterpriseId: string;
    userId: string;
    attemptedEvents: any[];
    channelCode: string;
    createdAt: Date;
    events: LineaCampaingInfoEvent[];
    failedEvents: any[];
    initiatedEvents: LineaCampaingInitEvent[];
    isActive: boolean;
    isDeleted: boolean;
    isStaggeredAllowed: boolean;
    journeyCompletionProcessed: boolean;
    journeyType: string;
    loginSource: string;
    recurrenceChecks: any[];
    reward: any[];
    rewardOpenStatus: string;
    status: string;
    superUserId: string;
    taskGroups: any[];
    updatedAt: Date;
    valueSpend: any[];
    xp: number;
    completedAt: Date;
}

interface LineaCampaingInfoEvent {
    taskId: string;
    name: string;
    metadata: {
        xp: number;
        templateFamily: string;
        isMetaMaskBridgeAmount: boolean;
        transactionHash: string;
        chainName: string;
        isRequiredTask: boolean;
    };
    isVerified: true;
    failedVerificationCount: 0;
    isForceVerified: false;
    isXpClaimed: true;
}

interface LineaCampaingInitEvent {
    _id: string;
    taskId: string;
    status: string;
    initiatedVerificationCount: number;
    verificationInitiatedAt: Date;
}

// Set Wallet
export interface SetWalletResponsePayload {
    message: string;
}

export interface SetWalletRequestPayload {
    userId: string;
    lineaWalletAddress: string;
}
//

// Gm
export interface DailyCehckInResponsePayload {
    expiredStreakCount: number;
    streakCount: number;
    longestStreakCount: number;
    streakTimestamp: Date;
    isFirstTimeMarked: boolean;
}
//
