import axios from "axios";
import * as dotenv from "dotenv";
import { BigNumber, Contract, utils } from "ethers";
import { task, types } from "hardhat/config";
import { Account, Call, Contract as StarknetContract, Uint256, cairo, ec, uint256 } from "starknet";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { addDust, delay, getAccounts, waitForGasPrice } from "../../utils/Utils";
import { EthContractInfo } from "./EthContractInfo";
import { StarkScanUrl, StarknetAccountConstants, StarknetGatewayUrl } from "./StarknetConstants";
import {
    StarkgatePayload,
    constructorCallData,
    getStarknetProvider,
    isStarknetAccountDeployed,
    starknetAddressFromHash,
    toStarknetAccount,
} from "./starknetUtils";

dotenv.config();

task("starknetAccounts", "Show Starknet accounts derived from your seed phrase or private keys")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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

        if (network.chainId != ChainId.ethereumMainnet) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const starknetProvider = getStarknetProvider();
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        //new Argent X account v0.2.3
        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                const starknetAccount = toStarknetAccount(starknetProvider, account);

                console.log(`Starknet address: ${starknetAccount.address}`);

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

task("starknetDeployAccounts", "Deploy Starknet accounts")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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

        if (network.chainId != ChainId.ethereumMainnet) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const starknetProvider = getStarknetProvider();
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        //new Argent X account v0.3.0
        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const privateKeyAX = "0x" + ec.starkCurve.grindKey(account.privateKey);
                // console.log(`\nGRIND_ACCOUNT_PRIVATE_KEY= ${privateKeyAX}`);
                const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKeyAX);

                const AXproxyConstructorCallData = constructorCallData(starkKeyPubAX);
                const AXcontractAddress = starknetAddressFromHash(starkKeyPubAX);

                const deployAccountPayload = {
                    classHash: StarknetAccountConstants.argentXaccountClassHash,
                    constructorCalldata: AXproxyConstructorCallData,
                    addressSalt: starkKeyPubAX,
                };

                const accountAX = new Account(starknetProvider, AXcontractAddress, privateKeyAX);

                if (await isStarknetAccountDeployed(accountAX)) {
                    console.log(`Account already deployed at ${account.address}`);
                    continue;
                }

                const { transaction_hash: AXdAth, contract_address: AXcontractFinalAdress } =
                    await accountAX.deployAccount(deployAccountPayload);

                console.log(
                    `ArgentX account deployed at: ${AXcontractFinalAdress}\ntx: ${StarkScanUrl}${AXdAth}`
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

task("starknetStarkgateDeposit", "Deposit throught official bridge")
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
        const currentChain = getChainInfo(network.chainId);

        if (network.chainId != ChainId.ethereumMainnet) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const bridgeContract = new Contract(
            "0xae0Ee0A63A2cE6BaeEFFE56e7714FB4EFE48D419",
            ["function deposit(uint256 amount,uint256 l2Recipient) payable"],
            hre.ethers.provider
        );

        const starknetProvider = getStarknetProvider();
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const starknetAccount = toStarknetAccount(starknetProvider, account);
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                let amount: BigNumber;
                if (taskArgs.all) {
                    const fullBalance = await hre.ethers.provider.getBalance(account.address);
                    const minimumBalance = utils.parseEther(
                        addDust({ amount: taskArgs.minBalance, upToPercent: 30 }).toString()
                    );
                    amount = fullBalance.sub(minimumBalance);
                } else if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                const bridgePayload: StarkgatePayload = {
                    from_address: "993696174272377493693496825928908586134624850969",
                    to_address: "0x073314940630fd6dcda0d772d4c972c4e0a9946bef9dabf4ef84eda8ef542b82",
                    entry_point_selector: "0x2d757788a8d8d6f21d1cd40bce38a8222d70654214e96ff95d8086e684fbee5",
                    payload: [starknetAccount.address, amount._hex, "0x0"],
                };

                const feeData = (await axios.post(StarknetGatewayUrl, bridgePayload)).data;
                // console.log(feeData);

                const feeAmount = BigNumber.from(feeData.overall_fee);
                console.log(`Bridge fee ${utils.formatEther(feeAmount)}`);

                const bridgeTx = await bridgeContract
                    .connect(account)
                    .deposit(amount, BigNumber.from(starknetAccount.address).toString(), {
                        value: amount.add(feeAmount),
                    });

                console.log(
                    `Deposit ${utils.formatEther(amount)} ETH to starknet address ${
                        starknetAccount.address
                    }\nTx: ${currentChain.explorer}${bridgeTx.hash}`
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

task("starknetBalances", "Deploy Starknet accounts")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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

        if (network.chainId != ChainId.ethereumMainnet) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const starknetProvider = getStarknetProvider();
        const accounts = (await getAccounts(taskArgs, hre.ethers.provider)).map((acc) =>
            toStarknetAccount(starknetProvider, acc)
        );

        const ethToken = new StarknetContract(EthContractInfo.abi, EthContractInfo.address, starknetProvider);

        for (const account of accounts) {
            try {
                ethToken.connect(account);
                const balance = await ethToken.balanceOf(account.address);

                console.log(
                    `#${accounts.indexOf(account)} Address: ${account.address} Balance: ${utils.formatEther(
                        uint256.uint256ToBN(balance.balance).toString()
                    )}`
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

task("starknetSendSelf", "Deploy Starknet accounts")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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

        if (network.chainId != ChainId.ethereumMainnet) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const starknetProvider = getStarknetProvider();
        const accounts = (await getAccounts(taskArgs, hre.ethers.provider)).map((acc) =>
            toStarknetAccount(starknetProvider, acc)
        );

        const ethToken = new StarknetContract(EthContractInfo.abi, EthContractInfo.address, starknetProvider);

        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)} Address: ${account.address}`);
                ethToken.connect(account);

                const amount: Uint256 = cairo.uint256(utils.parseEther("0.001").toBigInt());

                const transferCallData: Call = ethToken.populate("transfer", {
                    recipient: account.address,
                    amount: amount,
                });
                console.log(transferCallData);
                
                const { transaction_hash } = await ethToken.transfer(transferCallData.calldata);

                console.log(`Tx: ${StarkScanUrl}${transaction_hash}`);

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
