import axios from "axios";
import { BigNumber, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import * as zksyncLite from "zksync";
import * as zksyncEra from "zksync-web3";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { addDust, delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";
import {
    L2_20Inscriptions,
    L2_20_INSCRIPTION_ADDRESS,
    MAKER_ADDRESS,
    MAKER_ADDRESS_ERC,
    OrbiterBridgeInfo,
    OrbiterBridges,
} from "./orbiterMakerInfo";

function getBridgeInfo(chainId: number): OrbiterBridgeInfo | undefined {
    return OrbiterBridges.find((bridgeInfo) => bridgeInfo.chainId == chainId);
}

function getInscriptionInfo(chainId: number): OrbiterBridgeInfo | undefined {
    return L2_20Inscriptions.find((bridgeInfo) => bridgeInfo.chainId == chainId);
}

function addBridgeIdentifierCodeToAmount(
    fromZksyncLite: Boolean,
    bridgeInfo: OrbiterBridgeInfo,
    amount: BigNumber
) {
    let result: BigNumber;
    if (fromZksyncLite) {
        result = zksyncLite.utils.closestPackableTransactionAmount(
            BigNumber.from(amount.toString().slice(undefined, -10) + bridgeInfo.identificationCode + "000000")
        );
    } else {
        result = BigNumber.from(amount.toString().slice(undefined, -4) + bridgeInfo.identificationCode);
    }
    return result;
}

const MINIMUM_ETH_BRIDGE_AMOUNT = utils.parseEther("0.001");
const MINIMUM_STABLE_BRIDGE_AMOUNT = utils.parseUnits("2", 6);
const ZKSYNC_MAINNET_RPC = "https://zksync2-mainnet.zksync.io/";

task("orbiterBridge", "Bridge funds across networks")
    .addFlag("fromZksyncLite", "Bridge from zksync Lite")
    .addParam("targetChainId", `Target chain id ${JSON.stringify(OrbiterBridges)}`, undefined, types.int)
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("dust", "Dust percentage", undefined, types.int, true)
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
        const ethProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_URL);
        const network = await hre.ethers.provider.getNetwork();
        const currentChainInfo = getChainInfo(network.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const fromZksyncEra = currentChainInfo.chainId == ChainId.zkSyncEra;

        const zkSyncLiteProvider = await zksyncLite.getDefaultProvider("mainnet");
        const zkSyncEraProvider = new zksyncEra.Provider(ZKSYNC_MAINNET_RPC);

        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        var bridgeInfo = getBridgeInfo(taskArgs.targetChainId);

        if (!bridgeInfo) {
            console.log(`Brigde not supported to chain id ${taskArgs.targetChainId}`);
            return;
        }

        for (const account of accounts) {
            try {
                let zksyncLiteWallet: any;
                if (taskArgs.fromZksyncLite) {
                    await zksyncLite.Wallet.fromEthSigner(account, zkSyncLiteProvider);
                }

                let zksyncEraWallet: any;
                if (currentChainInfo.chainId == ChainId.zkSyncEra) {
                    zksyncEraWallet = new zksyncEra.Wallet(
                        account.privateKey,
                        zkSyncEraProvider,
                        ethProvider
                    );
                }

                let amount: BigNumber;
                if (taskArgs.all) {
                    let fullBalance;
                    if (taskArgs.fromZksyncLite) {
                        fullBalance = await zksyncLiteWallet.getBalance("ETH");
                    } else if (fromZksyncEra) {
                        fullBalance = await zksyncEraWallet.getBalance();
                    } else {
                        fullBalance = await account.getBalance();
                    }
                    const minimumBalance = utils.parseEther(
                        addDust({ amount: taskArgs.minBalance, upToPercent: taskArgs.dust }).toString()
                    );
                    amount = fullBalance.sub(minimumBalance);
                } else if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);
                if (amount.lt(MINIMUM_ETH_BRIDGE_AMOUNT)) {
                    console.log(
                        `Amount ${utils.formatEther(amount)} lower then minimum (${utils.formatEther(
                            MINIMUM_ETH_BRIDGE_AMOUNT
                        )})`
                    );
                    continue;
                }
                const amountWithCode = addBridgeIdentifierCodeToAmount(
                    taskArgs.fromZksyncLite,
                    bridgeInfo,
                    amount
                );

                console.log(
                    `Amount ${utils.formatEther(amount)} with code ${utils.formatEther(amountWithCode)}`
                );

                let bridgeTx;

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                if (taskArgs.fromZksyncLite) {
                    bridgeTx = await zksyncLiteWallet.syncTransfer({
                        to: MAKER_ADDRESS,
                        amount: amountWithCode,
                        token: `ETH`,
                    });
                    console.log(`Bridge to ${bridgeInfo.name} amount ${utils.formatEther(amountWithCode)}`);
                } else if (fromZksyncEra) {
                    const txParams = await populateTxnParams({ signer: zksyncEraWallet, chain: chainInfo });
                    bridgeTx = await zksyncEraWallet.sendTransaction({
                        to: MAKER_ADDRESS,
                        value: amountWithCode,
                        ...txParams,
                    });
                    console.log(
                        `Bridge to ${bridgeInfo.name} amount ${utils.formatEther(amountWithCode)}\nTx ${
                            currentChainInfo.explorer
                        }${bridgeTx.hash}`
                    );
                } else {
                    const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                    bridgeTx = await account.sendTransaction({
                        to: MAKER_ADDRESS,
                        value: amountWithCode,
                        ...txParams,
                    });
                    console.log(
                        `Bridge to ${bridgeInfo.name} amount ${utils.formatEther(amountWithCode)}\nTx ${
                            currentChainInfo.explorer
                        }${bridgeTx.hash}`
                    );
                }

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

task("orbiterBridgeUsdc", "Bridge funds across networks")
    .addParam("targetChainId", `Target chain id ${JSON.stringify(OrbiterBridges)}`, undefined, types.int)
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("dust", "Dust percentage", undefined, types.int, true)
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
        const ethProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_URL);
        const network = await hre.ethers.provider.getNetwork();
        const currentChainInfo = getChainInfo(network.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const fromZksyncEra = currentChainInfo.chainId == ChainId.zkSyncEra;

        const zkSyncEraProvider = new zksyncEra.Provider(ZKSYNC_MAINNET_RPC);

        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        var bridgeInfo = getBridgeInfo(taskArgs.targetChainId);

        if (!bridgeInfo) {
            console.log(`Brigde not supported to chain id ${taskArgs.targetChainId}`);
            return;
        }

        var provider: any;

        if (currentChainInfo.chainId == ChainId.zkSyncEra) {
            provider = zkSyncEraProvider;
        } else {
            provider = hre.ethers.provider;
        }

        const usdc = ERC20__factory.connect(currentChainInfo.usdcAddress, provider);
        const decimals = await usdc.decimals();

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                let zksyncEraWallet: any;
                if (fromZksyncEra) {
                    zksyncEraWallet = new zksyncEra.Wallet(
                        account.privateKey,
                        zkSyncEraProvider,
                        ethProvider
                    );
                }

                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await usdc.balanceOf(account.address);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString(),
                        decimals
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString(), decimals);
                }
                amount = amount.sub(ethers.utils.parseUnits("0.01", decimals));
                if (amount.lt(MINIMUM_STABLE_BRIDGE_AMOUNT)) {
                    console.log(
                        `Amount ${utils.formatUnits(
                            amount,
                            decimals
                        )} lower then minimum (${utils.formatUnits(MINIMUM_STABLE_BRIDGE_AMOUNT, decimals)})`
                    );
                    continue;
                }
                const amountWithCode = addBridgeIdentifierCodeToAmount(false, bridgeInfo, amount);

                console.log(`Amount ${utils.formatUnits(amountWithCode, decimals)}`);

                let bridgeTx;

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                if (fromZksyncEra) {
                    const txParams = await populateTxnParams({ signer: zksyncEraWallet, chain: chainInfo });
                    bridgeTx = await usdc
                        .connect(account)
                        .transfer(MAKER_ADDRESS_ERC, amountWithCode, { ...txParams });
                    console.log(
                        `Bridge to ${bridgeInfo.name} amount ${utils.formatUnits(
                            amountWithCode,
                            decimals
                        )}\nTx ${currentChainInfo.explorer}${bridgeTx.hash}`
                    );
                }

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

task("orbiterCheckPoints", "")
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

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const response = await axios.get(
                    `https://openapi.orbiter.finance/points_system/v2/user/points?address=${account.address}`
                );

                console.log(
                    `Base points ${response.data.data.basePoints}; ActivityPoints ${response.data.data.activityPoints}; PlatformPoints ${response.data.data.activityPoints};`
                );
                console.log(`Total O-points: ${response.data.data.total}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("l220InscriptionMint", "Mint L2_20 inscription")
    .addParam("targetChainId", `Target chain id ${JSON.stringify(OrbiterBridges)}`, undefined, types.int)
    .addParam("repeat", "Repeat count", 1, types.int, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const ethProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_URL);
        const network = await hre.ethers.provider.getNetwork();
        const currentChainInfo = getChainInfo(network.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const fromZksyncEra = currentChainInfo.chainId == ChainId.zkSyncEra;

        const zkSyncEraProvider = new zksyncEra.Provider(ZKSYNC_MAINNET_RPC);

        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        var bridgeInfo = getInscriptionInfo(taskArgs.targetChainId);

        const INSCRIPTION_CALL_DATA =
            "0x646174613a2c7b2270223a226c61796572322d3230222c226f70223a22636c61696d222c227469636b223a22244c32222c22616d74223a2231303030227d";

        if (!bridgeInfo) {
            console.log(`Mint not supported to chain id ${taskArgs.targetChainId}`);
            return;
        }

        for (const account of accounts) {
            try {
                let zksyncEraWallet: any;
                if (currentChainInfo.chainId == ChainId.zkSyncEra) {
                    zksyncEraWallet = new zksyncEra.Wallet(
                        account.privateKey,
                        zkSyncEraProvider,
                        ethProvider
                    );
                }

                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                const amountWithCode = addBridgeIdentifierCodeToAmount(
                    false,
                    bridgeInfo,
                    ethers.utils.parseEther("0.00023")
                );

                let bridgeTx;

                for (let index = 0; index < taskArgs.repeat; index++) {
                    await waitForGasPrice({
                        maxPriceInGwei: taskArgs.gasPrice,
                        provider: hre.ethers.provider,
                    });

                    if (fromZksyncEra) {
                        const txParams = await populateTxnParams({
                            signer: zksyncEraWallet,
                            chain: chainInfo,
                        });
                        bridgeTx = await zksyncEraWallet.sendTransaction({
                            data: INSCRIPTION_CALL_DATA,
                            to: L2_20_INSCRIPTION_ADDRESS,
                            value: amountWithCode,
                            ...txParams,
                        });
                        await bridgeTx.wait();

                        console.log(
                            `Mint to ${bridgeInfo.name} amount ${utils.formatEther(amountWithCode)}\nTx ${
                                currentChainInfo.explorer
                            }${bridgeTx.hash}`
                        );
                    } else {
                        const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                        bridgeTx = await account.sendTransaction({
                            data: INSCRIPTION_CALL_DATA,
                            to: L2_20_INSCRIPTION_ADDRESS,
                            value: amountWithCode,
                            ...txParams,
                        });
                        await bridgeTx.wait();

                        console.log(
                            `Mint to ${bridgeInfo.name} amount ${utils.formatEther(amountWithCode)}\nTx ${
                                currentChainInfo.explorer
                            }${bridgeTx.hash}`
                        );
                    }
                }

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
