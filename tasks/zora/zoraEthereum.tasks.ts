import { BigNumber, Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

task("bridgeToZoraTestnet", "Bridge ETH to ZORA testnet")
    .addParam("amount", "Amount to send", undefined, types.float)
    .addFlag("dust", "Add random amount of dust")
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at Goerli mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const bridgeAddress = "0x7cc09ac2452d6555d5e0c213ab9e2d44efbfc956";

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

                const balance = await account.getBalance();
                if (balance.gte(amount)) {
                    const txn = await account.sendTransaction({ to: bridgeAddress, value: amount });
                    console.log(
                        `\n#${accounts.indexOf(account)} Address: ${
                            account.address
                        } Bridge ${utils.formatUnits(amount)} ETH to ZORA testnet\ntxn: ${txn.hash}`
                    );
                } else {
                    console.log(
                        `#${accounts.indexOf(account)} Address: ${
                            account.address
                        } not enought funds (${utils.formatEther(balance)})`
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

task("zoraPurchaseNft", "Mint Zora NFT")
    .addParam("nftAddress", "Zora nft contract address", undefined, types.string, false)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const targetAddress = taskArgs.nftAddress;
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.ethereumMainnet, ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 quantity) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        var priorityFee = undefined;
        if (chainInfo.chainId == ChainId.optimismMainnet) {
            priorityFee = ethers.utils.parseUnits("2", "wei");
        }

        for (const account of accounts) {
            try {
                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: utils.parseEther("0.000777"),
                    maxPriorityFeePerGas: priorityFee,
                });

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

task("mintCoinbaseNft", "Mint base nft")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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
        const targetAddress = "0xd4307e0acd12cf46fd6cf93bc264f5d5d1598792";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0xefef39a10000000000000000000000000000000000000000000000000000000000000001`;

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                    value: utils.parseEther("0.000777"),
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

task("mintZoraBreatheNft", "Mint zora nft")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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
        const targetAddress = "0x21b589e8ad9efcd3582eac5de321d06def182e0f";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0xefef39a10000000000000000000000000000000000000000000000000000000000000001`;

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                    value: utils.parseEther("0.000777"),
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

task("mintBaseCryptonikaNft", "Mint base nft")
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
        const targetAddress = "0x2c43bbdeede52d9236595705cf7a1d38f08e992e";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.lineaGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Coinbase goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0x0d23d6690000000000000000000000000000000000000000000000000000000000000001ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000e3636c01412c8309a78b89bdb80cac75bc0ee07f0000000000000000000000000000000000000000000000000000000000a5a5ca000000000000000000000000000000000000000000000000000000000000001b01e3ffeef52d0786835e3f8fe73b9314741048a55d21740af5be626c7ef35cf0497303413dc79396160d4d47628655cbbc12c9eece3380d1ae484aa23f8429cd`;

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

task("mintZora1155", "Mint zora nft")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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
        const targetAddress = "0xabba7d7f7f2e9eb818e7bd0c965f276b5b348fb9";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            [
                "function mint(address minter, uint256 tokenId, uint256 quantity, bytes minterArguments) payable",
            ],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        var tokenId = 1;
        for (const account of accounts) {
            try {
                // Address to hex
                let minterArgs = utils.hexZeroPad(utils.hexlify(account.address), 32);

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });
                const tx = await mintContract
                    .connect(account)
                    .mint("0x5Ff5a77dD2214d863aCA809C0168941052d9b180", tokenId, 1, minterArgs, {
                        value: utils.parseEther("0.000777"),
                    });

                if (tokenId < 3) {
                    tokenId += 1;
                } else {
                    tokenId = 1;
                }

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

task("mintZoraFarcasterNft", "Mint farcaster nft")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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
        const targetAddress = "0xa723a8a69d9b8cf0bc93b92f9cb41532c1a27f8f";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0xefef39a10000000000000000000000000000000000000000000000000000000000000001`;
                console.log(`#${accounts.indexOf(account)} Address: ${account.address}`);

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                    value: utils.parseEther("0.001554"),
                });

                console.log(`Task result: txn: ${tx.hash}\n`);

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

task("mintZoraZineNft", "Mint the ZINE x Seed Club NFT")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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
        const targetAddress = "0xc747a17cc411264e78d8fd55d30b8936e4101e13";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0xefef39a10000000000000000000000000000000000000000000000000000000000000001`;
                console.log(`#${accounts.indexOf(account)} Address: ${account.address}`);

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                    value: utils.parseEther("0.001777"),
                });

                console.log(`Task result: txn: ${tx.hash}\n`);

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

task("mintStandWithCrypto", "Mint stand with crypto")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const targetAddress = "0x9d90669665607f08005cae4a7098143f554c59ef";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 quantity) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: utils.parseEther("0.000777"),
                });

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

task("mintCashmereLabs", "Mint CashmereLabs")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const targetAddress = "0x3a40312a1c376aecf855ef784371d1fb1aa2d25d";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 quantity) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: utils.parseEther("0.001777"),
                });

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

task("mintWordsYouCanOwn", "Mint Words You Can Own")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const targetAddress = "0xb21c9e7374f8aa119459ddfd5dbadd77de2704a8";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 quantity) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: utils.parseEther("0.000777"),
                });

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

task("mintOptimisticZorb", "Mint Optimistic Zorb")
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
        const targetAddress = "0x544c2bd4a3ce5015036eb95ce3ba9626d25ad8c8";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on --network optimismMainnet`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            [
                "function mint(address minter, uint256 tokenId, uint256 quantity, bytes minterArguments) payable",
            ],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                // Address to hex
                let minterArgs = utils.hexZeroPad(utils.hexlify(account.address), 32);

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });
                const tx = await mintContract
                    .connect(account)
                    .mint("0x3678862f04290E565cCA2EF163BAeb92Bb76790C", 1, 1, minterArgs, {
                        value: utils.parseEther("0.000777"),
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

task("zoraMintFarcasterBaseNFT", "Mint farcaster NFT")
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
        const contractAddress = "0xbfdb5d8d1856b8617f1881fd718580256fa8cf35";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.baseMainnet].includes(currentNetwork.chainId)) {
            console.log("Task available only at Base mainnet network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new Contract(
            contractAddress,
            [
                "function mintWithRewards(address recipient,uint256 quantity,string comment,address mintReferral) payable",
            ],
            hre.ethers.provider
        );

        const referral = "0x0000000000000000000000000000000000000000";

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });

                const mintTx = await mintContract
                    .connect(account)
                    .mintWithRewards(account.address, 1, "", referral, {
                        value: utils.parseEther("0.000777"),
                        ...txParams,
                    });

                console.log(`Mint txn: ${chainInfo.explorer}${mintTx.hash}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(
                    `\nError when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });
