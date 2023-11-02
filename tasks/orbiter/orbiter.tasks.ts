import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import * as zksyncLite from "zksync";
import * as zksyncEra from "zksync-web3";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { addDust, delay, getAccounts, waitForGasPrice } from "../../utils/Utils";
import { MAKER_ADDRESS, OrbiterBridgeInfo, OrbiterBridges } from "./orbiterMakerInfo";

function getBridgeInfo(chainId: number): OrbiterBridgeInfo | undefined {
    return OrbiterBridges.find((bridgeInfo) => bridgeInfo.chainId == chainId);
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

const MINIMUM_BRIDGE_AMOUNT = utils.parseEther("0.0054");
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
                if (amount.lt(MINIMUM_BRIDGE_AMOUNT)) {
                    console.log(
                        `Amount ${utils.formatEther(amount)} lower then minimum (${utils.formatEther(
                            MINIMUM_BRIDGE_AMOUNT
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

                if (chainInfo.chainId == 1 || bridgeInfo.chainId == 1) {
                    await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: ethProvider });
                }

                if (taskArgs.fromZksyncLite) {
                    bridgeTx = await zksyncLiteWallet.syncTransfer({
                        to: MAKER_ADDRESS,
                        amount: amountWithCode,
                        token: `ETH`,
                    });
                    console.log(`Bridge to ${bridgeInfo.name} amount ${utils.formatEther(amountWithCode)}`);
                } else if (fromZksyncEra) {
                    bridgeTx = await zksyncEraWallet.sendTransaction({
                        to: MAKER_ADDRESS,
                        value: amountWithCode,
                    });
                    console.log(
                        `Bridge to ${bridgeInfo.name} amount ${utils.formatEther(amountWithCode)}\nTx ${
                            currentChainInfo.explorer
                        }${bridgeTx.hash}`
                    );
                } else {
                    bridgeTx = await account.sendTransaction({
                        to: MAKER_ADDRESS,
                        value: amountWithCode,
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
