import { ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, getDeadline } from "../../utils/Utils";

const USDT_ADDRESS = "0x3e8b7c72f4a9f4c8ec375c11f44fb84242c3893f";
const USDC_ADDRESS = "0x2e9F75DF8839ff192Da27e977CD154FD1EAE03cf";
const DACKIE_ADDRESS = "0xcf8E7e6b26F407dEE615fc4Db18Bf829E7Aa8C09";

task("baseGoerliBridge", "Bridge 0.1 ETH to base network")
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
        const coinbaseBridgeAddress = "0xe93c8cd0d409341205a592f8c4ac1a5fe5585cfa";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log("Bridge to Coinbase supported only from Ethereum goerli networks!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0xe9e05c42000000000000000000000000${account.address.slice(
                    2
                )}000000000000000000000000000000000000000000000000016345785d8a000000000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000`;

                const ethDepositTxResponse = await account.sendTransaction({
                    to: coinbaseBridgeAddress,
                    data: callData,
                    value: utils.parseEther("0.1"),
                });

                console.log(
                    `Deposit result:\nAddress: ${account.address}\ntxn: ${ethDepositTxResponse.hash}\n`
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
        console.log("All funds sent across the bridge");
    });

task("baseDackieSwapFaucet", "Request tokens from faucets")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
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
        const targetAddress = "0x2fff9bf9384b91aa61615761b26c4f69d5a0ec3a";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.baseGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on base goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const swapContract = new hre.ethers.Contract(
            targetAddress,
            ["function claim()"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const tx = await swapContract.connect(account).claim();

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

task("baseDackieSwapTokens", "Swap tokens")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addParam("fromToken", "Token to sell", undefined, types.string)
    .addParam("toToken", "Token to buy", undefined, types.string)
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
        const targetAddress = "0x29843613c7211d014f5dd5718cf32bcd314914cb";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.baseGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on base goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const fromToken = ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
        const decimals = await fromToken.decimals();

        const swapContract = new hre.ethers.Contract(
            targetAddress,
            [
                "function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline)",
            ],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const amount = utils.parseUnits(taskArgs.amount.toString(), decimals);
                const balance = await fromToken.balanceOf(account.address);

                if (balance.lt(amount)) {
                    console.log(
                        `Not enought funds \nAddress: ${account.address} balance: ${utils.formatUnits(
                            balance,
                            decimals
                        )}\n`
                    );
                }

                const allowance = await fromToken.allowance(account.address, targetAddress);

                if (allowance.lt(amount)) {
                    const approveTx = await fromToken.connect(account).approve(targetAddress, amount);
                    console.log(`Approve tx ${approveTx.hash}`);
                }

                const tx = await swapContract
                    .connect(account)
                    .swapExactTokensForTokens(
                        amount,
                        0,
                        [taskArgs.fromToken, taskArgs.toToken],
                        account.address,
                        getDeadline(120).getTime()
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

task("mintMasaBaseName", "Mint masa base domain name")
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
        let names: string[] = require("../ens/names.json");
        names = names.slice(taskArgs.startAccount, taskArgs.endAccount);

        if (taskArgs.accountIndex != undefined) {
            names = [names[taskArgs.accountIndex]];
        }

        const storeRequestUrl = "https://middleware.masa.finance/soul-name/store";
        const contractAddress = "0x22b8bcbdebbbe223435d899b0100a171a106bb58";

        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log("Task awailable only from base goerli network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                const index = accounts.indexOf(account);
                const name = names[index];

                const payload = {
                    soulName: name,
                    receiver: account.address,
                    duration: 5,
                    network: "basegoerli",
                };

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
        console.log("All funds sent across the bridge");
    });

task("mintBaseName", "Mint masa base domain name")
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
        let names: string[] = require("../ens/names.json");
        names = names.slice(taskArgs.startAccount, taskArgs.endAccount);

        if (taskArgs.accountIndex != undefined) {
            names = [names[taskArgs.accountIndex]];
        }

        const contractAddress = "0xcd6bb0f23b46a5cbf4949f6f4bd91bf8a9ad81a1";

        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.baseGoerli].includes(currentNetwork.chainId)) {
            console.log("Task awailable only from base goerli network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                const index = accounts.indexOf(account);
                const name = names[index];

                console.log(`Registration process of "${name}" for address ${account.address}`);
                const namehash = utils.namehash(`${name}.base`);
                console.log(`${name}.base ${namehash}`);

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

task("baseMintPathToMainnet", "Mint nft")
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
        const targetAddress = "0x02cf7b313026ddc3c9bdcfbc3feac1ed08582ec8";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at optimism mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new ethers.Contract(
            targetAddress,
            ["function purchase(address tokenRecipient,string message)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const mintTx = await mintContract.connect(account).purchase(account.address, "");

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${mintTx.hash}\n`);

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

task("baseDackieSwapFarm", "Farm")
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
        const targetAddress = "0x70249aF497f2040c0677f5Ea1B0dB2595f94803F";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.baseGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on base goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const dackieToken = ERC20__factory.connect(DACKIE_ADDRESS, hre.ethers.provider);
        const decimals = await dackieToken.decimals();

        const farmContract = new hre.ethers.Contract(
            targetAddress,
            ["function deposit(uint256 amount)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const amount = await dackieToken.balanceOf(account.address);

                if (amount.isZero()) {
                    console.log(
                        `#${accounts.indexOf(account)} Address: ${
                            account.address
                        }\nNot enought funds balance: ${utils.formatUnits(amount, decimals)}\n`
                    );
                    continue;
                }

                const allowance = await dackieToken.allowance(account.address, targetAddress);

                if (allowance.lt(amount)) {
                    const approveTx = await dackieToken.connect(account).approve(targetAddress, amount);
                    console.log(`Approve tx ${approveTx.hash}`);
                }

                const tx = await farmContract.connect(account).deposit(amount);

                console.log(
                    `Task result:\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${
                        tx.hash
                    }\n`
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

task("baseDackieSwapHarvest", "Harvest")
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
        const targetAddress = "0x70249aF497f2040c0677f5Ea1B0dB2595f94803F";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.baseGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on base goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const farmContract = new hre.ethers.Contract(
            targetAddress,
            ["function deposit(uint256 amount)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const tx = await farmContract.connect(account).deposit(0);

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

task("baseMintPlungeNft", "Mint Plunge into Vision Jungle NFTs")
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
        const coinbaseBridgeAddress = "0x38b96117b87f9982627d90909f178af2ced0b015";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.baseGoerli].includes(currentNetwork.chainId)) {
            console.log("Task available only from Ethereum goerli networks!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0xd6316d42000000000000000000000000${account.address.slice(
                    2
                )}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000`;

                const ethDepositTxResponse = await account.sendTransaction({
                    to: coinbaseBridgeAddress,
                    data: callData,
                });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${ethDepositTxResponse.hash}\n`);

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
        console.log("All funds sent across the bridge");
    });

task("baseMintSecurityNft", "Mint Base’s Security-First Approach nft")
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
        const targetAddress = "0x74ce067b0a0c195cd55f5458cbf217674e6c85ed";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at optimism mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new ethers.Contract(
            targetAddress,
            ["function purchase(address tokenRecipient,string message) payable"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const mintTx = await mintContract.connect(account).purchase(account.address, "", {
                    value: utils.parseEther("0.00069"),
                    maxPriorityFeePerGas: ethers.utils.parseUnits("2", "wei"),
                });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${mintTx.hash}\n`);

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
