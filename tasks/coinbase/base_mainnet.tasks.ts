import { BigNumber, Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams, shuffle, waitForGasPrice } from "../../utils/Utils";

task("baseMainnetBridge", "Bridge ETH to base network")
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
        const coinbaseBridgeAddress = "0x49048044D57e1C92A77f79988d21Fa8fAF74E97e";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log("Bridge to Base supported only from Ethereum mainnet network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    const fullBalance = await hre.ethers.provider.getBalance(account.address);
                    const minimumBalance = utils.parseEther(
                        addDust({ amount: taskArgs.minBalance, upToPercent: 20 }).toString()
                    );
                    amount = fullBalance.sub(minimumBalance);
                } else if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const ethDepositTxResponse = await account.sendTransaction({
                    to: coinbaseBridgeAddress,
                    value: amount,
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

task("baseGenesisBuilderNFT", "Mint Genesis Builder NFT")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const contractAddress = "0x1FC10ef15E041C5D3C54042e52EB0C54CB9b710c";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.baseMainnet].includes(currentNetwork.chainId)) {
            console.log("Task available only at Base mainnet network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new Contract(
            contractAddress,
            ["function mint(bytes signature)"],
            hre.ethers.provider
        );

        const priorityFee = ethers.utils.parseUnits("0.005", "gwei");

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const bytes = await account.signMessage("all your base are belong to you.");
                console.log(`Signature ${bytes}`);

                const mintTx = await mintContract
                    .connect(account)
                    .mint(bytes, { maxPriorityFeePerGas: priorityFee });

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

task("baseMintLayerZeroExpedition", "Mint MintDAO LayerZero EXPEDITION NFT")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
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
        const contractAddress = "0x10498cbbe46946ca5b0d86cb5a5b225000a7a3a7";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.baseMainnet].includes(currentNetwork.chainId)) {
            console.log("Task available only at Base mainnet network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const calldata = `0xe912512000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000`;

                const txParams = populateTxnParams({ signer: account, chain: chainInfo });

                const mintTx = await account.sendTransaction({
                    to: contractAddress,
                    data: calldata,
                    value: utils.parseEther("0.001234267542150659"),
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

task("baseContractInteractions", "Interact with erc-20 contracts")
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("interactions", "Number of contracts to interact", undefined, types.int, true)
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

        if (network.chainId != ChainId.baseMainnet) {
            throw new Error("Task allowed only on Base chain");
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const erc20Contracts = [
            ERC20__factory.connect("0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca", hre.ethers.provider),
            ERC20__factory.connect("0xE3B53AF74a4BF62Ae5511055290838050bf764Df", hre.ethers.provider),
            ERC20__factory.connect("0x50c5725949a6f0c72e6c4a641f24049a917db0cb", hre.ethers.provider),
            ERC20__factory.connect("0x4A3A6Dd60A34bB2Aba60D73B4C88315E9CeB6A3D", hre.ethers.provider),
            ERC20__factory.connect("0x27D2DECb4bFC9C76F0309b8E88dec3a601Fe25a8", hre.ethers.provider),
            ERC20__factory.connect("0x4200000000000000000000000000000000000006", hre.ethers.provider),
            ERC20__factory.connect("0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2", hre.ethers.provider),
            ERC20__factory.connect("0x9e1028F5F1D5eDE59748FFceE5532509976840E0", hre.ethers.provider),
            ERC20__factory.connect("0x3bB4445D30AC020a84c1b5A8A2C6248ebC9779D0", hre.ethers.provider),
        ];

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                var erc20Shuffled = shuffle(erc20Contracts);

                if (taskArgs.interactions <= erc20Shuffled.length) {
                    erc20Shuffled = erc20Shuffled.slice(undefined, taskArgs.interactions)
                }
                
                for (const erc20 of erc20Shuffled) {
                    const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                    const tx = await erc20
                        .connect(account)
                        .approve(erc20.address, BigNumber.from(0), { ...txParams });
                    console.log(`Approve ${await erc20.symbol()} tx ${chainInfo.explorer}${tx.hash}`);
                    await delay(0.1);
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
