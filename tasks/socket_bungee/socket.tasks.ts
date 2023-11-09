import axios from "axios";
import * as dotenv from "dotenv";
import { BigNumber, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import fetch from "node-fetch";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { addDust, delay, getAccounts, percentOf, waitForGasPrice } from "../../utils/Utils";
import { refuelContractAbi } from "./RefuelContractAbi";

dotenv.config();

const API_KEY = "1b2fd225-062f-41aa-8c63-d1fef19945e7"; // SOCKET PUBLIC API KEY
// const API_KEY = "c58e182f-be7b-490a-ae8a-e785f86a0c4a"; // SOCKET PRIVATE API KEY

// Main function
task("bungeeBridge", "Bridge token between networks")
    .addParam("amount", "Amount to wrap", undefined, types.float, true)
    .addFlag("dust", "Add random amount of dust")
    .addFlag("all", "90% of balance")
    .addFlag("refuel", "Swap some tokens for gas on destination chain")
    .addParam("delay", "Add delay", undefined, types.int, true)
    .addParam(
        "fromAssetAddress",
        "Origin token asset address",
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        types.string
    ) /* ETH by default */
    .addParam(
        "toAssetAddress",
        "Destination token asset address",
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        types.string
    ) /* ETH by default */
    .addParam("toChainId", "Destination chain id", undefined, types.int)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.int)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addFlag("randomize", "Randomize account execution order")
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const ethProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_URL);
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else if (taskArgs.all) {
                    if (taskArgs.fromAssetAddress == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
                        amount = percentOf(await account.getBalance(), 90);
                    } else {
                        const tokenContract = ERC20__factory.connect(
                            taskArgs.fromAssetAddress,
                            hre.ethers.provider
                        );
                        amount = await tokenContract.balanceOf(account.address);
                    }
                } else {
                    if (taskArgs.fromAssetAddress == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
                        amount = utils.parseUnits(taskArgs.amount.toString());
                    } else {
                        const tokenContract = ERC20__factory.connect(
                            taskArgs.fromAssetAddress,
                            hre.ethers.provider
                        );
                        const decimals = await tokenContract.decimals();
                        amount = utils.parseUnits(taskArgs.amount, decimals);
                    }
                }

                console.log(`\nAddress: ${account.address}\nAmount: ${utils.formatEther(amount)}`);

                // Bridging Params fetched from users
                const fromChainId = chainInfo.chainId;
                const toChainId = taskArgs.toChainId;
                const fromAssetAddress = taskArgs.fromAssetAddress;
                const toAssetAddress = taskArgs.toAssetAddress;
                const userAddress = account.address;
                const uniqueRoutesPerBridge = true; // Returns the best route for a given DEX / bridge combination
                const sort = "output"; // "output" | "gas" | "time"
                const singleTxOnly = true;
                const refuel = taskArgs.refuel || false;
                const isContractCall = false;
                const slippage = 1;

                if (chainInfo.chainId === 1 || taskArgs.toChainId === 1) {
                    await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: ethProvider });
                }

                // Quote
                // For single transaction bridging, mark singleTxOnly flag as true in query params
                const quote = await getQuote(
                    fromChainId,
                    fromAssetAddress,
                    toChainId,
                    toAssetAddress,
                    amount.toString(),
                    account.address,
                    uniqueRoutesPerBridge,
                    sort,
                    singleTxOnly,
                    refuel,
                    isContractCall,
                    slippage
                );

                // Choosing first route from the returned route results
                const route = quote.result.routes[0];
                // console.log(`Route: ${JSON.stringify(route)}`);

                // Fetching transaction data for swap/bridge tx
                const apiReturnData = await getRouteTransactionData(route);
                if (!apiReturnData.success) {
                    console.log(`Skip account\nApi error ${JSON.stringify(apiReturnData)}`);
                    continue;
                }

                // approvalData from apiReturnData is null for native tokens
                // Values are returned for ERC20 tokens but token allowance needs to be checked
                if (apiReturnData.result.approvalData !== null) {
                    console.log(`Approve tokens for bridge...`);

                    // Used to check for ERC-20 approvals
                    const approvalData = apiReturnData.result.approvalData;

                    const { allowanceTarget, minimumApprovalAmount } = approvalData;
                    // Fetches token allowance given to Socket contracts
                    const allowanceCheckStatus = await checkAllowance(
                        fromChainId,
                        userAddress,
                        allowanceTarget,
                        fromAssetAddress
                    );
                    const allowanceValue = allowanceCheckStatus.result?.value;

                    // If Socket contracts don't have sufficient allowance
                    if (minimumApprovalAmount > allowanceValue) {
                        // Approval tx data fetched
                        const approvalTransactionData = await getApprovalTransactionData(
                            fromChainId,
                            userAddress,
                            allowanceTarget,
                            fromAssetAddress,
                            amount.toString()
                        );

                        const gasPrice = await account.getGasPrice();

                        const gasEstimate = await hre.ethers.provider.estimateGas({
                            from: account.address,
                            to: approvalTransactionData.result?.to,
                            value: "0x00",
                            data: approvalTransactionData.result?.data,
                            gasPrice: gasPrice,
                        });

                        const tx = await account.sendTransaction({
                            from: approvalTransactionData.result?.from,
                            to: approvalTransactionData.result?.to,
                            value: "0x00",
                            data: approvalTransactionData.result?.data,
                            gasPrice: gasPrice,
                            gasLimit: gasEstimate,
                        });

                        // Initiates approval transaction on user's frontend which user has to sign
                        const receipt = await tx.wait();

                        console.log("Approval Transaction Hash :", receipt.transactionHash);
                    }
                }

                let gasPrice = percentOf(await account.getGasPrice(), 120);

                const gasEstimate = await hre.ethers.provider.estimateGas({
                    from: account.address,
                    to: apiReturnData.result.txTarget,
                    value: apiReturnData.result.value,
                    data: apiReturnData.result.txData,
                    gasPrice: gasPrice,
                });

                const tx = await account.sendTransaction({
                    from: account.address,
                    to: apiReturnData.result.txTarget,
                    data: apiReturnData.result.txData,
                    value: apiReturnData.result.value,
                    gasPrice: gasPrice,
                    gasLimit: gasEstimate,
                    // gasLimit: percentOf(utils.parseUnits(route.userTxs[0].gasFees.gasLimit.toString()), 120),
                });

                // Initiates swap/bridge transaction on user's frontend which user has to sign
                const receipt = await tx.wait();
                const txHash = receipt.transactionHash;

                console.log(`Bridging Transaction : ${receipt.transactionHash}\n`);

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

// Makes a GET request to Socket APIs for quote
async function getQuote(
    fromChainId: number,
    fromTokenAddress: string,
    toChainId: number,
    toTokenAddress: string,
    fromAmount: string,
    userAddress: string,
    uniqueRoutesPerBridge: any,
    sort: any,
    singleTxOnly: boolean,
    refuel: boolean = false,
    isContractCall: boolean = false,
    slippage: number = 1
) {
    const request = `https://api.socket.tech/v2/quote?fromChainId=${fromChainId}&toChainId=${toChainId}&fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&fromAmount=${fromAmount}&userAddress=${userAddress}&singleTxOnly=${singleTxOnly}&bridgeWithGas=${refuel}&sort=${sort}&defaultSwapSlippage=${slippage}&isContractCall=${isContractCall}`;
    // console.log(`Request ${request}`);

    const response = await fetch(request, {
        method: "GET",
        headers: {
            "API-KEY": API_KEY,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    });

    const json = await response.json();
    return json;
}

// Makes a POST request to Socket APIs for swap/bridge transaction data
async function getRouteTransactionData(route: any) {
    const response = await fetch("https://api.socket.tech/v2/build-tx", {
        method: "POST",
        headers: {
            "API-KEY": API_KEY,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ route: route }),
    });

    const json = await response.json();
    return json;
}

// GET request to check token allowance given to allowanceTarget by owner
async function checkAllowance(chainId: number, owner: string, allowanceTarget: string, tokenAddress: string) {
    const response = await fetch(
        `https://api.socket.tech/v2/approval/check-allowance?chainID=${chainId}&owner=${owner}&allowanceTarget=${allowanceTarget}&tokenAddress=${tokenAddress}`,
        {
            method: "GET",
            headers: {
                "API-KEY": API_KEY,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        }
    );

    const json = await response.json();
    return json;
}

// Fetches transaction data for token approval
async function getApprovalTransactionData(
    chainId: number,
    owner: string,
    allowanceTarget: string,
    tokenAddress: string,
    amount: string
) {
    const response = await fetch(
        `https://api.socket.tech/v2/approval/build-tx?chainID=${chainId}&owner=${owner}&allowanceTarget=${allowanceTarget}&tokenAddress=${tokenAddress}&amount=${amount}`,
        {
            method: "GET",
            headers: {
                "API-KEY": API_KEY,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        }
    );

    const json = await response.json();
    return json;
}

// Fetches status of the bridging transaction
async function getBridgeStatus(transactionHash: string, fromChainId: number, toChainId: number) {
    const response = await fetch(
        `https://api.socket.tech/v2/bridge-status?transactionHash=${transactionHash}&fromChainId=${fromChainId}&toChainId=${toChainId}`,
        {
            method: "GET",
            headers: {
                "API-KEY": API_KEY,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        }
    );

    const json = await response.json();
    return json;
}

interface RefuelChainInfo {
    success: boolean;
    result: { name: string; chainId: number; isSendingEnabled: boolean; limits: RefuelLimit[] }[];
}

interface RefuelLimit {
    chainId: number;
    isEnabled: Boolean;
    minAmount: string;
    maxAmount: string;
}

function getRefuelContract(chainId: number): string {
    let address;
    switch (chainId) {
        case ChainId.ethereumMainnet:
            address = "0xb584D4bE1A5470CA1a8778E9B86c81e165204599";
            break;
        case ChainId.optimismMainnet:
            address = "0x5800249621DA520aDFdCa16da20d8A5Fc0f814d8";
            break;
        case ChainId.binanceMainnet:
            address = "0xBE51D38547992293c89CC589105784ab60b004A9";
            break;
        case ChainId.poligonMainnet:
            address = "0xAC313d7491910516E06FBfC2A0b5BB49bb072D91";
            break;
        case ChainId.zkSyncEra:
            address = "0x7Ee459D7fDe8b4a3C22b9c8C7aa52AbadDd9fFD5";
            break;
        case ChainId.zkEvm:
            address = "0x555A64968E4803e27669D64e349Ef3d18FCa0895";
            break;
        case ChainId.baseMainnet:
            address = "0xE8c5b8488FeaFB5df316Be73EdE3Bdc26571a773";
            break;
        case ChainId.arbitrumMainnet:
            address = "0xc0E02AA55d10e38855e13B64A8E1387A04681A00";
            break;
        case ChainId.avalancheMainnet:
            address = "0x040993fbF458b95871Cd2D73Ee2E09F4AF6d56bB";
            break;
        default:
            throw new Error(`Unsupported chain - ${chainId}`);
    }
    return address;
}

task("bungeeRefuel", "Bridge gas token across networks")
    .addParam("targetChainId", "Target chain id", undefined, types.int)
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addFlag("all", "All balance")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        if (
            network.chainId! in
            [
                ChainId.ethereumMainnet,
                ChainId.optimismMainnet,
                ChainId.binanceMainnet,
                ChainId.poligonMainnet,
                ChainId.zkSyncEra,
                ChainId.zkEvm,
                ChainId.baseMainnet,
                ChainId.arbitrumMainnet,
                ChainId.avalancheMainnet,
            ]
        ) {
            throw new Error("Task not supported on this networks");
        }

        let refuelContractAddress: string = getRefuelContract(network.chainId);

        const refuelContract = new ethers.Contract(
            refuelContractAddress,
            refuelContractAbi.abi,
            hre.ethers.provider
        );

        const chainStatus: RefuelChainInfo = (await axios.get(`https://refuel.socket.tech/chains`)).data;

        if (chainStatus.success) {
            const originChainInfo = chainStatus.result.find((info) => {
                return info.chainId == network.chainId;
            });

            const targetChainInfo = originChainInfo?.limits.find((chainLimits) => {
                return chainLimits.chainId == taskArgs.targetChainId;
            });

            if (!originChainInfo?.isSendingEnabled || !targetChainInfo?.isEnabled) {
                console.log(
                    `Not supported: Origin chain sending enabled = ${originChainInfo?.isSendingEnabled}; Destination chain enabled = ${targetChainInfo?.isEnabled}`
                );
                return;
            }

            for (const account of accounts) {
                try {
                    console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                    let amount: BigNumber;
                    if (taskArgs.all) {
                        const fullBalance = await hre.ethers.provider.getBalance(account.address);
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

                    const minAmount = BigNumber.from(targetChainInfo?.minAmount);
                    const maxAmount = BigNumber.from(targetChainInfo?.maxAmount);
        
                    const checkAmount = amount;
        
                    if (
                        checkAmount.lt(minAmount) ||
                        checkAmount.add(percentOf(checkAmount, taskArgs.dust || 0)).gt(maxAmount)
                    ) {
                        console.log(
                            `Max = ${utils.formatEther(checkAmount.add(percentOf(checkAmount, taskArgs.dust || 0)))}`
                        );
                        console.log(
                            `Error amount ${utils.formatEther(checkAmount)} + dust ${
                                taskArgs.dust
                            }%\nMin = ${utils.formatEther(minAmount)}, Max = ${utils.formatEther(maxAmount)}`
                        );
                        return;
                    }
        
                    const bridgeTx = await refuelContract
                        .connect(account)
                        .depositNativeToken(taskArgs.targetChainId, account.address, { value: amount });

                    console.log(
                        `${hre.ethers.utils.formatEther(amount)} native tokens refueled\nTxn ${
                            chainInfo.explorer
                        }${bridgeTx.hash}`
                    );

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
        } else {
            console.log(`Error ${JSON.stringify(chainStatus)}`);
        }
    });
