import * as dotenv from "dotenv";
import { BigNumber, Contract, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, getDeadline, percentOf } from "../../utils/Utils";

dotenv.config();

task("lineaGoerliOrbiterBridge", "Bridge funds across networks")
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
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
        const MAKER_ADDRESS = "0x4eAF936c172b5e5511959167e8Ab4f7031113Ca3";
        const MINIMUM_BRIDGE_AMOUNT = utils.parseEther("0.0054");
        const MAXIMUM_BRIDGE_AMOUNT = utils.parseEther("3");
        const IDENTIFICATION_CODE = "9522";

        function addBridgeIdentifierCodeToAmount(amount: BigNumber) {
            let result: BigNumber = BigNumber.from(
                amount.toString().slice(undefined, -4) + IDENTIFICATION_CODE
            );
            return result;
        }

        const network = await hre.ethers.provider.getNetwork();
        const currentChainInfo = getChainInfo(network.chainId);

        if (![ChainId.ethereumGoerli].includes(currentChainInfo.chainId)) {
            console.log(`Task supported only on ethereum goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    let fullBalance = await account.getBalance();
                    const minimumBalance = utils.parseEther(
                        addDust({ amount: taskArgs.minBalance }).toString()
                    );
                    amount = fullBalance.sub(minimumBalance);
                    console.log(minimumBalance);
                } else if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                if (amount.lt(MINIMUM_BRIDGE_AMOUNT)) {
                    console.log(
                        `Amount ${utils.formatEther(amount)} lower then minimum (${utils.formatEther(
                            MINIMUM_BRIDGE_AMOUNT
                        )})`
                    );
                    continue;
                }

                if (amount.gt(MAXIMUM_BRIDGE_AMOUNT)) {
                    console.log(
                        `Amount ${utils.formatEther(amount)} bigger then maximum (${utils.formatEther(
                            MAXIMUM_BRIDGE_AMOUNT
                        )})`
                    );
                    continue;
                }
                const amountWithCode = addBridgeIdentifierCodeToAmount(amount);

                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);
                console.log(
                    `Amount ${utils.formatEther(amount)} with code ${utils.formatEther(amountWithCode)}`
                );

                let bridgeTx = await account.sendTransaction({
                    to: MAKER_ADDRESS,
                    value: amountWithCode,
                });
                console.log(
                    `Bridge to LineaGoerli testnet. Amount ${utils.formatEther(amountWithCode)}\nTx ${
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

task("lineaGoerliBridge", "Bridge to Linea goerli")
    .addParam("amount", "Amount to bridge", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("delay", "Add random delay", undefined, types.float, true)
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

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on ethereum goerli!`);
            return;
        }
        const provider = hre.ethers.provider;
        const accounts = await getAccounts(taskArgs, provider);

        const targetAddress = "0xe85b69930fc6d59da385c7cc9e8ff03f8f0469ba";
        const relayer = "0x81682250D4566B2986A2B33e23e7c52D401B7aB7";
        const fee = utils.parseEther("0.01");

        const hopBridgeContract = new Contract(
            targetAddress,
            [
                "function sendToL2(uint256 chainId, address recipient, uint256 amount, uint256 amountOutMin, uint256 deadline, address relayer, uint256 relayerFee) payable",
            ],
            provider
        );
        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    const minBalance = utils.parseEther(addDust({ amount: taskArgs.minBalance }).toString());
                    amount = (await account.getBalance()).sub(minBalance);
                } else if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                const amountAndFee = amount.add(fee);

                const tx = await hopBridgeContract
                    .connect(account)
                    .sendToL2(
                        ChainId.lineaGoerli,
                        account.address,
                        amount,
                        percentOf(amount, 95),
                        5680638762,
                        relayer,
                        0,
                        { value: amountAndFee }
                    );

                console.log(
                    `Bridge Address: ${account.address} amount ${utils.formatEther(amount)}\ntxn: ${tx.hash}`
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

task("lineaGoerliBridgeUsdc", "Bridge USDC to Linea goerli")
    .addParam("amount", "Amount to bridge", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on ethereum goerli!`);
            return;
        }
        const provider = hre.ethers.provider;
        const accounts = await getAccounts(taskArgs, provider);

        const tokenContract = ERC20__factory.connect(
            "0x98339d8c260052b7ad81c28c16c0b98420f2b46a",
            hre.ethers.provider
        );
        const decimals = await tokenContract.decimals();

        const targetAddress = "0x71139b5d8844642aa1797435bd5df1fbc9de0813";
        const relayer = "0x81682250D4566B2986A2B33e23e7c52D401B7aB7";
        const fee = utils.parseEther("0.01");

        const hopBridgeContract = new Contract(
            targetAddress,
            [
                "function sendToL2(uint256 chainId, address recipient, uint256 amount ,uint256 amountOutMin ,uint256 deadline, address relayer, uint256 relayerFee) payable",
            ],
            provider
        );
        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await tokenContract.balanceOf(account.address);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({
                            amount: taskArgs.amount,
                            upToPercent: taskArgs.dust,
                        }).toString(),
                        decimals
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString(), decimals);
                }

                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                if (amount.isZero()) {
                    console.log(`Skip zero balance address`);
                    continue;
                }

                const approveTx = await tokenContract.connect(account).approve(targetAddress, amount);
                console.log(`Approved ${approveTx.hash}`);

                const tx = await hopBridgeContract
                    .connect(account)
                    .sendToL2(
                        ChainId.lineaGoerli,
                        account.address,
                        amount,
                        percentOf(amount, 95),
                        2682151714,
                        relayer,
                        0,
                        { value: fee }
                    );

                console.log(
                    `Bridge Address: ${account.address} amount ${utils.formatUnits(amount, decimals)}\ntxn: ${
                        tx.hash
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

task("lineaGoerliBurnEth", "Send to burn address")
    .addParam("amount", "Amount to bridge", undefined, types.float, true)
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addFlag("dust", "Add random dust to amount")
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

        if (![ChainId.lineaGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on ethereum goerli!`);
            return;
        }
        const provider = hre.ethers.provider;
        const accounts = await getAccounts(taskArgs, provider);

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                const tx = await account.sendTransaction({
                    to: "0x0000000000000000000000000000000000000000",
                    value: amount,
                });

                console.log(
                    `Address: ${account.address} amount ${utils.formatEther(amount)} burned\ntxn: ${tx.hash}`
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

task("lineaTestMint", "Mint test nft")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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
        const targetAddress = "0xDEDE5b84A9F2525A81899DDFEcaB4521078Cb03D";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.lineaGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on linea goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0xa0712d68000000000000000000000000000000000000000000000000000000000000000a`;

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${tx.hash}\n`);

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

task("lineaMintGhostNft", "Mint Ghost nft")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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
        const targetAddress = "0x9C4c49C3c3bd7ab49D91576d0103A25514CaD1D6";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.lineaGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on ethereum goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0x9b6528e2000000000000000000000000d500efdef75e89bf6caf5c98f7633575d0049a72`;

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${tx.hash}\n`);

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

task("lineaMintUsdc", "Mint test USDC")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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
        const targetAddress = "0x1c1cb8744633ce0f785c5895389dfa04de5c1ace";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on ethereum goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0x40c10f19000000000000000000000000${account.address.slice(
                    2
                )}0000000000000000000000000000000000000000000000000000000000989680`;

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${tx.hash}\n`);

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

task("lineaMintEchoDexNft", "Mint Echo Dex NFT nft")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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
        const targetAddress = "0xf893Ba09d5aac3dfaFc0E706a9f7778eC71788b4";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.lineaGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on linea goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0x14f710fe`;

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${tx.hash}\n`);

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

task("lineaEchoDexSwap", "Swap on echoDex")
    .addParam("delay", "Add random delay", undefined, types.int, true)
    .addParam("amount", "Amount to swap", undefined, types.float)
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
        const targetAddress = "0x106c6743C1f8ED9c5c824887AadAc8215294f8b6";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.lineaGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on ethereum goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const swapContract = new hre.ethers.Contract(
            targetAddress,
            [
                "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable",
            ],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                let amount = utils.parseEther(
                    addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                );

                const tx = await swapContract
                    .connect(account)
                    .swapExactETHForTokens(
                        0,
                        [
                            "0x2c1b868d6596a18e32e61b901e4060c872647b6c",
                            "0xb77c5a8426ee2af0ef2a69fe1202dbaffd0fbddf",
                        ],
                        account.address,
                        getDeadline().getTime(),
                        { value: amount }
                    );

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${tx.hash}\n`);

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

task("lineaTestMintAttic", "Mint test nft")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const targetAddress = "0x0E685e48Bb85285B50E0B6aA9208AaCeaF9147fF";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.lineaGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on linea goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0xa0712d680000000000000000000000000000000000000000000000000000000000000001`;

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${tx.hash}\n`);

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
