import { BigNumber, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { addDust, delay, getAccounts, waitForGasPrice } from "../../utils/Utils";
import routerErcAbi from "./RouterErcAbi.json";
import routerEthAbi from "./RouterEthAbi.json";
import stargateRouterAbi from "./StargateRouterAbi.json";
import { BridgeInfo, stargateBridgeInfo } from "./stargateBridgeInfo";

export const StargateTasks = {
    stargateBridge: "stargateBridge",
    stargateStake: "stargateStake",
    stargateStakingBalances: "stargateStakingBalances",
    stargateStakingWithdraw: "stargateStakingWithdraw",
};

function getBridgeInfo(chainId: number) {
    let bridge;
    switch (chainId) {
        case ChainId.ethereumMainnet:
            bridge = stargateBridgeInfo.ethereum;
            break;
        case ChainId.arbitrumMainnet:
            bridge = stargateBridgeInfo.arbitrum;
            break;
        case ChainId.optimismMainnet:
            bridge = stargateBridgeInfo.optimism;
            break;
        case ChainId.poligonMainnet:
            bridge = stargateBridgeInfo.polygon;
            break;
        case ChainId.avalancheMainnet:
            bridge = stargateBridgeInfo.avalanche;
            break;
        case ChainId.binanceMainnet:
            bridge = stargateBridgeInfo.binance;
            break;
        case ChainId.baseMainnet:
            bridge = stargateBridgeInfo.base;
            break;
        case ChainId.lineaMainnet:
            bridge = stargateBridgeInfo.linea;
            break;
        default:
            throw new Error(`Unsupported chain - ${chainId}`);
    }
    return bridge;
}

const STG_TOKEN_ADDRESS = "0x6694340fc020c5E6B96567843da2df01b2CE1eb6";
const STG_STAKING_CONTRACT_ADDRESS = "0xfBd849E6007f9BC3CC2D6Eb159c045B8dc660268";

task("stargateBridgeETH", "Bridge ETH across networks")
    .addParam("targetChainId", "Target chain id", undefined, types.int)
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
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

        if (network.chainId! in [ChainId.arbitrumMainnet, ChainId.ethereumMainnet, ChainId.optimismMainnet]) {
            throw new Error("Task allowed only on arbitrum mainnet");
        }

        let originBridgeInfo: BridgeInfo = getBridgeInfo(network.chainId);
        let targetBridgeInfo: BridgeInfo = getBridgeInfo(taskArgs.targetChainId);

        const routerEthContract = new ethers.Contract(
            originBridgeInfo.routerEthAddress,
            routerEthAbi,
            hre.ethers.provider
        );

        const stargateRouterAddress = await routerEthContract.stargateRouter();

        const stargateRouterContract = new ethers.Contract(
            stargateRouterAddress,
            stargateRouterAbi,
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const fee: BigNumber = (
                    await stargateRouterContract.quoteLayerZeroFee(
                        targetBridgeInfo.chainId, // destination chainId
                        1, // function type: see Bridge.sol for all types
                        account.address, // destination of tokens
                        "0x", // payload, using abi.encode()
                        {
                            dstGasForCall: 0, // extra gas, if calling smart contract,
                            dstNativeAmount: 0, // amount of dust dropped in destination wallet
                            dstNativeAddr: account.address, // destination wallet for dust
                        }
                    )
                )[0];

                let amount: BigNumber;
                if (taskArgs.all) {
                    const fullBalance = await hre.ethers.provider.getBalance(account.address);
                    const minimumBalance = utils
                        .parseEther(addDust({ amount: taskArgs.minBalance, upToPercent: 30 }).toString())
                        .add(fee);
                    amount = fullBalance.sub(minimumBalance);
                } else if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);
                console.log(`Fee ${utils.formatEther(fee)}`);

                const bridgeTx = await routerEthContract.connect(account).swapETH(
                    targetBridgeInfo.chainId, //_dstChainId (uint16)
                    account.address, //_refundAddress (address)
                    account.address, //_toAddress (bytes)
                    amount, //_amountLD (uint256)
                    amount.div(BigNumber.from(100)).mul(BigNumber.from(95)), //_minAmountLD (uint256)
                    { value: amount.add(fee) }
                );

                console.log(
                    `${hre.ethers.utils.formatEther(amount)} ETH bridged\nTxn ${chainInfo.explorer}${
                        bridgeTx.hash
                    }`
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
    });

task("stargateBridgeUsdc", "Bridge USDC across networks")
    .addParam("targetChainId", "Target chain id", undefined, types.int)
    .addParam("amount", "Amount of tokens", undefined, types.float, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addFlag("refuel", "Refuel with native")
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const chainInfo = getChainInfo(network.chainId);

        let originBridgeInfo: BridgeInfo = getBridgeInfo(network.chainId);
        let targetBridgeInfo: BridgeInfo = getBridgeInfo(taskArgs.targetChainId);

        if (
            network.chainId in
            [
                ChainId.arbitrumMainnet,
                ChainId.optimismMainnet,
                ChainId.ethereumMainnet,
                ChainId.poligonMainnet,
            ]
        ) {
            throw new Error("Task not allowed in this network");
        }
        if (
            taskArgs.targetChainId in
            [
                ChainId.arbitrumMainnet,
                ChainId.optimismMainnet,
                ChainId.ethereumMainnet,
                ChainId.poligonMainnet,
            ]
        ) {
            throw new Error("Task not allowed to this network");
        }

        const routerErcContract = new ethers.Contract(
            originBridgeInfo.routerErcAddress,
            routerErcAbi,
            hre.ethers.provider
        );

        const usdcContract = ERC20__factory.connect(chainInfo.usdcAddress, hre.ethers.provider);
        const decimals = await usdcContract.decimals();

        const refuelAmount = taskArgs.refuel ? targetBridgeInfo.refuelAmount : BigNumber.from(0);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                const fee: BigNumber = (
                    await routerErcContract.quoteLayerZeroFee(
                        targetBridgeInfo.chainId, // destination chainId
                        1, // function type: see Bridge.sol for all types
                        account.address, // destination of tokens
                        "0x", // payload, using abi.encode()
                        {
                            dstGasForCall: 0, // extra gas, if calling smart contract,
                            dstNativeAmount: refuelAmount, // amount of dust dropped in destination wallet
                            dstNativeAddr: account.address, // destination wallet for dust
                        }
                    )
                )[0];

                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await usdcContract.balanceOf(account.address);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString(),
                        await usdcContract.decimals()
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString(), decimals);
                }

                if (amount.isZero()) {
                    console.log(`Skip zero balance address`);
                    continue;
                }

                const allowed = await usdcContract.allowance(
                    account.address,
                    originBridgeInfo.routerErcAddress
                );

                if (allowed.lt(amount)) {
                    const approveTx = await usdcContract
                        .connect(account)
                        .approve(originBridgeInfo.routerErcAddress, amount, {
                            nonce: account.getTransactionCount(),
                            gasPrice: account.getGasPrice(),
                        });
                    console.log(`Not enought allowance. Approve tokens tx ${approveTx.hash}`);
                    await approveTx.wait();
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const bridgeTx = await routerErcContract.connect(account).swap(
                    targetBridgeInfo.chainId, // destination chainId
                    originBridgeInfo.usdcPoolId, // source poolId
                    targetBridgeInfo.usdcPoolId, // destination poolId
                    account.address, // refund address. extra gas (if any) is returned to this address
                    amount, // quantity to swap
                    amount.div(BigNumber.from(100)).mul(BigNumber.from(95)), // the min qty you would accept on the destination
                    { dstGasForCall: 0, dstNativeAmount: refuelAmount, dstNativeAddr: account.address },
                    account.address, // the address to send the tokens to on the destination
                    "0x", // payload
                    { value: fee, nonce: account.getTransactionCount(), gasPrice: account.getGasPrice() } // "fee" is the native gas to pay for the cross chain message fee. see
                );
                console.log(
                    `${hre.ethers.utils.formatUnits(amount, decimals)} USDC bridged\nTxn ${bridgeTx.hash}`
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
    });

task("stargateBridgeUsdt", "Bridge USDT across networks")
    .addParam("targetChainId", "Target chain id", undefined, types.int)
    .addParam("amount", "Amount of tokens", undefined, types.float, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addFlag("refuel", "Refuel with native")
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const chainInfo = getChainInfo(network.chainId);

        let originBridgeInfo: BridgeInfo = getBridgeInfo(network.chainId);
        let targetBridgeInfo: BridgeInfo = getBridgeInfo(taskArgs.targetChainId);

        if (
            network.chainId in
            [ChainId.arbitrumMainnet, ChainId.ethereumMainnet, ChainId.binanceMainnet, ChainId.poligonMainnet]
        ) {
            throw new Error("Task not allowed in this network");
        }
        if (
            taskArgs.targetChainId in
            [ChainId.arbitrumMainnet, ChainId.ethereumMainnet, ChainId.binanceMainnet, ChainId.poligonMainnet]
        ) {
            throw new Error("Task not allowed to this network");
        }

        const routerErcContract = new ethers.Contract(
            originBridgeInfo.routerErcAddress,
            routerErcAbi,
            hre.ethers.provider
        );

        const usdtContract = ERC20__factory.connect(chainInfo.usdtAddress, hre.ethers.provider);
        const decimals = await usdtContract.decimals();

        const refuelAmount = taskArgs.refuel ? targetBridgeInfo.refuelAmount : BigNumber.from(0);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                const fee: BigNumber = (
                    await routerErcContract.quoteLayerZeroFee(
                        targetBridgeInfo.chainId, // destination chainId
                        1, // function type: see Bridge.sol for all types
                        account.address, // destination of tokens
                        "0x", // payload, using abi.encode()
                        {
                            dstGasForCall: 0, // extra gas, if calling smart contract,
                            dstNativeAmount: refuelAmount, // amount of dust dropped in destination wallet
                            dstNativeAddr: account.address, // destination wallet for dust
                        }
                    )
                )[0];

                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await usdtContract.balanceOf(account.address);
                } else if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString(), decimals);
                }

                if (amount.isZero()) {
                    console.log(`Skip zero balance address`);
                    continue;
                }

                const allowed = await usdtContract.allowance(
                    account.address,
                    originBridgeInfo.routerErcAddress
                );

                if (allowed.lt(amount)) {
                    const approveTx = await usdtContract
                        .connect(account)
                        .approve(originBridgeInfo.routerErcAddress, amount, {
                            nonce: account.getTransactionCount(),
                            gasPrice: account.getGasPrice(),
                        });
                    console.log(`Not enought allowance. Approve tokens tx ${approveTx.hash}`);
                    await approveTx.wait();
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const bridgeTx = await routerErcContract.connect(account).swap(
                    targetBridgeInfo.chainId, // destination chainId
                    originBridgeInfo.usdtPoolId, // source poolId
                    targetBridgeInfo.usdtPoolId, // destination poolId
                    account.address, // refund address. extra gas (if any) is returned to this address
                    amount, // quantity to swap
                    amount.div(BigNumber.from(100)).mul(BigNumber.from(95)), // the min qty you would accept on the destination
                    { dstGasForCall: 0, dstNativeAmount: refuelAmount, dstNativeAddr: account.address },
                    account.address, // the address to send the tokens to on the destination
                    "0x", // payload
                    { value: fee, nonce: account.getTransactionCount(), gasPrice: account.getGasPrice() } // "fee" is the native gas to pay for the cross chain message fee. see
                );
                console.log(
                    `${hre.ethers.utils.formatUnits(amount, decimals)} USDT bridged\nTxn ${bridgeTx.hash}`
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
    });

task("stargateStake", "Stake STG tokens on arbitrum chain")
    .addParam("amount", "Amount of STG to deposit", undefined, types.float, true)
    .addParam(
        "lockUntil",
        "Unlock date in format YYYY-MM-DD (ex. 2023-12-31)",
        undefined,
        types.string,
        false
    )
    .addFlag("all", "Use all balance of tokens")
    .addParam("dust", "Dust percentage", undefined, types.int, true)
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
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.arbitrumMainnet)
            throw new Error("Task allowed only on arbitrum mainnet");

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const stgToken = ERC20__factory.connect(STG_TOKEN_ADDRESS, hre.ethers.provider);
        const stgTokenDecimals = await stgToken.decimals();

        const stgStakingContract = new ethers.Contract(
            STG_STAKING_CONTRACT_ADDRESS,
            require("./StakingContractAbi.json"),
            hre.ethers.provider
        );

        const timestamp = Date.parse(taskArgs.lockUntil) / 1000;

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);
                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await stgToken.connect(account).balanceOf(account.address);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount }).toString(),
                        stgTokenDecimals
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount, stgTokenDecimals);
                }

                if (amount.isZero()) {
                    console.log(`Skip address with zero balance ${account.address}`);
                    continue;
                }

                const approvedAmount = await stgToken
                    .connect(account)
                    .allowance(account.address, STG_STAKING_CONTRACT_ADDRESS);

                const missingAllowance = amount.sub(approvedAmount);

                if (missingAllowance.gt(BigNumber.from("0"))) {
                    console.log(
                        `Allowance ${utils.formatUnits(
                            approvedAmount,
                            stgTokenDecimals
                        )} lower then amount ${utils.formatUnits(
                            amount,
                            stgTokenDecimals
                        )}. Approve ${utils.formatUnits(amount, stgTokenDecimals)}...`
                    );

                    const approveTxn = await stgToken
                        .connect(account)
                        .approve(stgStakingContract.address, missingAllowance);
                    await approveTxn.wait();
                    console.log(
                        `Add allowance ${utils.formatUnits(missingAllowance, stgTokenDecimals)}. Txn ${
                            approveTxn.hash
                        }`
                    );
                }

                const stakeTxn = await stgStakingContract.connect(account).create_lock(amount, timestamp);
                console.log(
                    `${utils.formatUnits(amount, stgTokenDecimals)} staked. Txn ${chainInfo.explorer}${
                        stakeTxn.hash
                    }`
                );

                if (taskArgs.delay) {
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

task("stargateStakeIncrease", "Stake STG tokens on arbitrum chain")
    .addParam("amount", "Amount of STG to deposit", undefined, types.float, true)
    .addParam(
        "lockUntil",
        "Unlock date in format YYYY-MM-DD (ex. 2023-12-31)",
        undefined,
        types.string,
        false
    )
    .addFlag("all", "Use all balance of tokens")
    .addParam("dust", "Dust percentage", undefined, types.int, true)
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
        const network = await hre.ethers.provider.getNetwork();

        if (network.chainId != ChainId.arbitrumMainnet)
            throw new Error("Task allowed only on arbitrum mainnet");

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const stgToken = ERC20__factory.connect(STG_TOKEN_ADDRESS, hre.ethers.provider);
        const stgTokenDecimals = await stgToken.decimals();

        const stgStakingContract = new ethers.Contract(
            STG_STAKING_CONTRACT_ADDRESS,
            require("./StakingContractAbi.json"),
            hre.ethers.provider
        );

        const timestamp = Date.parse(taskArgs.lockUntil) / 1000;

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await stgToken.connect(account).balanceOf(account.address);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount }).toString(),
                        stgTokenDecimals
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount, stgTokenDecimals);
                }

                if (amount.isZero()) {
                    console.log(`Skip address with zero balance ${account.address}`);
                    continue;
                }

                const approvedAmount = await stgToken
                    .connect(account)
                    .allowance(account.address, STG_STAKING_CONTRACT_ADDRESS);

                const missingAllowance = amount.sub(approvedAmount);

                if (missingAllowance.gt(BigNumber.from("0"))) {
                    console.log(
                        `Allowance ${utils.formatUnits(
                            approvedAmount,
                            stgTokenDecimals
                        )} lower then amount ${utils.formatUnits(
                            amount,
                            stgTokenDecimals
                        )}. Approve ${utils.formatUnits(amount, stgTokenDecimals)}...`
                    );

                    const approveTxn = await stgToken
                        .connect(account)
                        .approve(stgStakingContract.address, missingAllowance);
                    await approveTxn.wait();
                    console.log(
                        `Add allowance ${utils.formatUnits(missingAllowance, stgTokenDecimals)}. Txn ${
                            approveTxn.hash
                        }`
                    );
                }

                const stakeTxn = await stgStakingContract
                    .connect(account)
                    .increase_amount_and_time(amount, timestamp);
                console.log(
                    `#${accounts.indexOf(account)} ${utils.formatUnits(
                        amount,
                        stgTokenDecimals
                    )} staked from address ${account.address}. Txn ${stakeTxn.hash}`
                );

                if (taskArgs.delay) {
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

task("stargateStakeIncreaseUnlockDate", "Increase unlock date")
    .addParam("unlockDate", "Unlock date in Unix timestamp format", undefined, types.string, true)
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
        const network = await hre.ethers.provider.getNetwork();

        if (network.chainId != ChainId.arbitrumMainnet)
            throw new Error("Task allowed only on arbitrum mainnet");

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const stgToken = ERC20__factory.connect(STG_TOKEN_ADDRESS, hre.ethers.provider);
        const stgTokenDecimals = await stgToken.decimals();

        const stgStakingContract = new ethers.Contract(
            STG_STAKING_CONTRACT_ADDRESS,
            require("./StakingContractAbi.json"),
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const stakeTxn = await stgStakingContract
                    .connect(account)
                    .increase_unlock_time(BigNumber.from(taskArgs.unlockDate));
                console.log(
                    `#${accounts.indexOf(account)} ${account.address}. Unlock date increased. Txn ${
                        stakeTxn.hash
                    }`
                );

                if (taskArgs.delay) {
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

task("stargateStakingBalances", "Show stargate staking balances")
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const stgStakingContract = new ethers.Contract(
            STG_STAKING_CONTRACT_ADDRESS,
            require("./StakingContractAbi.json"),
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const stakingBalance: { amount: BigNumber; end: BigNumber } = await stgStakingContract
                    .connect(account)
                    .locked(account.address);

                const unlockDate = new Date(stakingBalance.end.toNumber() * 1000);

                console.log(
                    `#${accounts.indexOf(account)} Address ${account.address} has ${utils.formatUnits(
                        stakingBalance.amount
                    )} STG locked until ${unlockDate.toLocaleDateString()} (unix ${stakingBalance.end})`
                );
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("stargateStakingWithdraw", "Withdraw tokens from stargate staking")
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const stgToken = ERC20__factory.connect(STG_TOKEN_ADDRESS, hre.ethers.provider);
        const stgTokenDecimals = await stgToken.decimals();

        const stgStakingContract = new ethers.Contract(
            STG_STAKING_CONTRACT_ADDRESS,
            require("./StakingContractAbi.json"),
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const withdrawTxn = await stgStakingContract.connect(account).withdraw();
                console.log(
                    `\n#${accounts.indexOf(account)} Address ${account.address} Tokens withdrawed\nTxn ${
                        withdrawTxn.hash
                    }`
                );
                if (taskArgs.delay) {
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
