import { BigNumber, Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

task("baseMainnetBridge", "Bridge ETH to base network")
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
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

task("baseMintOnchainSummerNFT", "Mint Onchain Summer NFT")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const contractAddress = "0xea2a41c02fa86a4901826615f9796e603c6a4491";
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
                "function claim(address, uint256, address, uint256, (bytes32[],uint256,uint256,address), bytes) payable",
            ],
            hre.ethers.provider
        );

        const priorityFee = ethers.utils.parseUnits("0.005", "gwei");

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const calldata = `0x84bb1e42000000000000000000000000${account.address.slice(
                    2
                )}0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000080ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000`;

                const mintTx = await account.sendTransaction({
                    to: mintContract.address,
                    data: calldata,
                    maxPriorityFeePerGas: priorityFee,
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

task("baseMintOnchainSummerD1NFT", "Mint Onchain Summer Day One NFT")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const contractAddress = "0x7d5861cfe1c74aaa0999b7e2651bf2ebd2a62d89";
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

        const referral = "0x9652721d02b9db43f4311102820158aBb4ecc95B";

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
