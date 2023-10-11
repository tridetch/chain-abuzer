import { BigNumber, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

task("miscWithbackedCommunityNft", "Mint nft on optimism")
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
        const targetAddress = "0x63a9addf2327a0f4b71bcf9bfa757e333e1b7177";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only at Optimism mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0x6a627842000000000000000000000000${account.address.slice(2)}`;

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

task("layerZeroUsdcBridge", "Layer zero USDC goerli bridge. Send 3 USDC with gas")
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
        const targetAddress = "0x6f53470834e81eb70669d69e9fd95ba17b29d7c0";
        const usdcAddress = "0x07865c6e87b9f70255377e024ace6630c1eaa37f";

        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only at Goerli testnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const approveCallData = `0x095ea7b30000000000000000000000006f53470834e81eb70669d69e9fd95ba17b29d7c000000000000000000000000000000000000000000000000000000000002dc6c0`;

                const approveTx = await account.sendTransaction({
                    to: usdcAddress,
                    data: approveCallData,
                });

                console.log(`Approve txn:\ntxn: ${approveTx.hash}\n`);

                const sendCallData = `0x30ecd4db000000000000000000000000000000000000000000000000000000000000277a00000000000000000000000000000000000000000000000000000000002dc6c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000d5d7a8d80c426aae43e0aa3f99e6a7e2a862d67800000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000005600020000000000000000000000000000000000000000000000000000000000061a80000000000000000000000000000000000000000000000000017508f1956a8000${account.address.slice(
                    2
                )}00000000000000000000`;

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: sendCallData,
                    value: utils.parseEther("0.001810026974520072"),
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

task("mintCatAttackNft", "Mint base nft")
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
        const targetAddress = "0xddb6dcce6b794415145eb5caa6cd335aeda9c272";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.lineaGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Coinbase goerli!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0xbe895ece`;

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

task("mintShapellaNft", "Mint shapella NFT")
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
        const targetAddress = "0x5f04d47d698f79d76f85e835930170ff4c4ebdb7";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only at Ethereum mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0x26092b83`;

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

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

task("mintOpWorldcoinNft", "Mint OP worldcoin NFT")
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
        const targetAddress = "0x6a886c76693ed6f4319a289e3fe2e670b803a2da";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at Optimism mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const claimContract = new ethers.Contract(
            targetAddress,
            ["function mint(address to,uint256 numberOfTokens)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const claimTx = await claimContract.connect(account).mint(account.address, 1);

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${claimTx.hash}\n`);

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

task("eigenlayerDepositStEth", "Deposit stETH to eigenLayer")
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
        const targetAddress = "0x779d1b5315df083e3f9e94cb495983500ba8e907";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at goerli mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const stEthAddress = "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F";
        const stEthContract = ERC20__factory.connect(stEthAddress, hre.ethers.provider);

        const depositContract = new ethers.Contract(
            targetAddress,
            ["function depositIntoStrategy(address strategy,address token,uint256 amount)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const amount = await stEthContract.balanceOf(account.address);
                if (amount.lt(utils.parseEther("0.0001"))) {
                    console.log(`\nAddress: ${account.address} skip zero balance`);
                    continue;
                }
                const approveTx = await stEthContract.connect(account).approve(targetAddress, amount);
                await approveTx.wait();

                const depositTx = await depositContract
                    .connect(account)
                    .depositIntoStrategy("0xB613E78E2068d7489bb66419fB1cfa11275d14da", stEthAddress, amount);

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${depositTx.hash}\n`);

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

task("stakegEthInRoketPool", "Stake gETH for rETH")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
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
        const targetAddress = "0xa9a6a14a3643690d0286574976f45abbdad8f505";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at goerli mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const rEthAddress = "0x178E141a0E3b34152f73Ff610437A7bf9B83267A";
        const rEthContract = ERC20__factory.connect(rEthAddress, hre.ethers.provider);

        const depositContract = new ethers.Contract(
            targetAddress,
            ["function deposit() payable"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const amount = utils.parseEther(taskArgs.amount.toString());

                const depositTx = await depositContract.connect(account).deposit({
                    value: amount,
                });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${depositTx.hash}\n`);

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

task("eigenlayerDepositREth", "Deposit RETH to eigenLayer")
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
        const targetAddress = "0x779d1b5315df083e3f9e94cb495983500ba8e907";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at goerli mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const rEthAddress = "0x178E141a0E3b34152f73Ff610437A7bf9B83267A";
        const rEthContract = ERC20__factory.connect(rEthAddress, hre.ethers.provider);

        const depositContract = new ethers.Contract(
            targetAddress,
            ["function depositIntoStrategy(address strategy,address token,uint256 amount)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const amount = await rEthContract.balanceOf(account.address);
                if (amount.lt(utils.parseEther("0.0001"))) {
                    console.log(`\nAddress: ${account.address} skip zero balance`);
                    continue;
                }
                const approveTx = await rEthContract.connect(account).approve(targetAddress, amount);
                await approveTx.wait();

                const depositTx = await depositContract
                    .connect(account)
                    .depositIntoStrategy("0x879944A8cB437a5f8061361f82A6d4EED59070b5", rEthAddress, amount);

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${depositTx.hash}\n`);

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

task("mintOptimismCoGrantNft", "Mint optimism Co-Grant NFT")
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
        const targetAddress = "0x789D425A45557a9743029F937A3BA9aAC0827008";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at Ethereum mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `TODO`;

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

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
                    `Error when proces  s account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("mintZkLightClient", "Mint zkLightClient NFT")
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
        const targetAddress = "0xd2ccc9ee7ea2ccd154c727a46d475dda49e99852";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.binanceMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Binance mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const callData = `0x1249c58b`;

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

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

task("mintOpBadrockNft", "Mint Optimism badrock NFT")
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
        const targetAddress = "0x04ba6cf3c5aa6d4946f5b7f7adf111012a9fac65";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at optimism mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const claimContract = new ethers.Contract(
            targetAddress,
            [
                "function mint(address creatorContractAddress,uint256 instanceId,uint32 mintIndex,bytes32[] merkleProof,address mintFor) payable",
            ],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const claimTx = await claimContract
                    .connect(account)
                    .mint("0x1B36291fF8F503CfB4E3baBe198a40398BCF54AD", 1055353072, 0, [], account.address, {
                        value: ethers.utils.parseEther("0.0005"),
                    });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${claimTx.hash}\n`);

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

task("lineaMintWeek9", "Mint nft")
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
        const targetAddress = "0xc1783c4e4b631374a9822c1cf8dd765b1b29016f";
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
                    maxPriorityFeePerGas: ethers.utils.parseUnits("5", "wei"),
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

task("mintManifoldSoundNft", "Mint nft")
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
        const targetAddress = "0x1eb73fee2090fb1c20105d5ba887e3c3ba14a17e";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at optimism mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new ethers.Contract(
            targetAddress,
            [
                "function mint(address creatorContractAddress,uint256 instanceId,uint32 mintIndex,bytes32[] merkleProof,address mintFor) payable",
            ],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const mintTx = await mintContract
                    .connect(account)
                    .mint("0xf970aAE088F1e18B2EC271ceE4d6F46E14597930", 1030031600, 0, [], account.address, {
                        value: utils.parseEther("0.0005"),
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

task("mintEigenWorldNft", "Mint Eigen World nft")
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
        const targetAddress = "0x8d0802559775C70fb505f22988a4FD4A4f6D3B62";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at ethereum mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new ethers.Contract(
            targetAddress,
            ["function mint(string text_)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                await waitForGasPrice({ maxPriceInGwei: 15, provider: hre.ethers.provider });
                const mintTx = await mintContract.connect(account).mint(account.address, {
                    ...txParams,
                });

                console.log(
                    `\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${chainInfo.explorer}${
                        mintTx.hash
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

task("mintFunCustomNft", "Mint custom NFT on MintFun")
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addParam("contractAddress", "Contract address of NFT", undefined, types.string, false)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new ethers.Contract(
            taskArgs.contractAddress,
            ["function mint(uint256 amount)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                await waitForGasPrice({ maxPriceInGwei: 15, provider: hre.ethers.provider });

                const mintTx = await account.sendTransaction({
                    to: mintContract.address,
                    data: "0xa0712d68000000000000000000000000000000000000000000000000000000000000000a0021fb3f",
                    ...txParams,
                });

                console.log(
                    `\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${chainInfo.explorer}${
                        mintTx.hash
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
