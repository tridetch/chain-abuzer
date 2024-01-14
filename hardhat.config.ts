import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "./tasks/index";

dotenv.config();

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.4.18",
            },
            {
                version: "0.7.0",
            },
            {
                version: "0.8.4",
            },
            {
                version: "0.8.17",
                settings: {},
            },
        ],
    },
    defaultNetwork: "localhost",
    networks: {
        hardhat: {
            forking: {
                url: process.env.ETHEREUM_GOERLI_URL || "",
                enabled: true,
            },
        },
        ethMainnet: {
            url: process.env.ETHEREUM_MAINNET_URL || "",
        },
        ethGoerli: {
            url: process.env.ETHEREUM_GOERLI_URL || "",
        },
        ethSepolia: {
            url: process.env.ETHEREUM_SEPOLIA_URL || "",
            accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`]
        },
        arbMainnet: {
            url: process.env.ARBITRUM_MAINNET_URL || "",
        },
        arbNova: {
            url: process.env.ARBITRUM_NOVA_URL || "",
        },
        arbGoerli: {
            url: process.env.ARBITRUM_GOERLI_URL || "",
        },
        binanceMainnet: {
            url: process.env.BINANCE_MAINNET_URL || "",
            accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`],
        },
        optimismMainnet: {
            url: process.env.OPTIMISM_MAINNET_URL || "",
        },
        polygonMainnet: {
            url: process.env.POLYGON_MAINNET_URL || "",
            accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`],
        },
        zkEvmMainnet: {
            url: process.env.POLYGON_ZK_EVM_URL || "",
            accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`],
        },
        fantomMainnet: {
            url: process.env.FANTOM_MAINNET_URL || "",
            accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`],
        },
        avalancheMainnet: {
            url: process.env.AVALANCHE_URL || "",
            accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`],
        },
        zoraMainnet: {
            url: process.env.ZORA_URL || "",
            accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`],
        },
        baseGoerli: {
            url: process.env.BASE_GOELRI_URL || "",
        },
        baseMainnet: {
            url: process.env.BASE_MAINNET_URL || "",
        },
        scrollMainnet: {
            url: process.env.SCROLL_MAINNET_URL || "",
        },
        scrollAlpha: {
            url: process.env.SCROLL_ALPHA_URL || "",
        },
        scrollSepolia: {
            url: process.env.SCROLL_SEPOLIA_URL || "",
        },
        lineaGoerli: {
            url: process.env.LINEA_GOERLI || "",
        },
        lineaMainnet: {
            url: process.env.LINEA_MAINNET || "",
        },
        zksyncEra: {
            url: process.env.ZKSYNC_ERA_URL || "",
        },
        zoraTestnet: {
            url: process.env.ZORA_TESTNET || "",
        },
        taikoAlpha3: {
            url: process.env.TAIKO_ALPHA_3 || "",
        },
        pgnMainnet: {
            url: process.env.PUBLIC_GOODS_NETWORK_MAINNET || ""
        },
        arbStylusSepolia: {
            url: process.env.ARBITRUM_STYLUS_TEST || ""
        },
        arbSepolia: {
            url: process.env.ARBITRUM_SEPOLIA || ""
        },
        zkfMainnet: {
            url: process.env.ZKFAIR_MAINNET_URL || "",
            accounts: [`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`],
        },
    },
};

export default config;
