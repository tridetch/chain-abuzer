import axios from "axios";
import { BigNumber, Contract, ethers, utils } from "ethers";
import FormData from "form-data";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import {
    MOCK_USER_AGENT,
    addDust,
    delay,
    getAccounts,
    populateTxnParams,
    toHexZeroPad,
    waitForGasPrice,
} from "../../utils/Utils";

task("bridgeToZoraMainnet", "Bridge ETH to ZORA mainnet")
    .addParam("amount", "Amount to send", undefined, types.float)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at --network zoraMainnet`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const bridgeAddress = "0x1a0ad011913A150f69f6A19DF447A0CfD9551054";

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
                    await waitForGasPrice({
                        maxPriceInGwei: taskArgs.gasPrice,
                        provider: hre.ethers.provider,
                    });
                    const txn = await account.sendTransaction({
                        to: bridgeAddress,
                        value: amount,
                        gasLimit: 100000,
                    });
                    console.log(
                        `\n#${accounts.indexOf(account)} Address: ${
                            account.address
                        } Bridge ${utils.formatUnits(amount)} ETH to ZORA\ntxn: ${chainInfo.explorer}${
                            txn.hash
                        }`
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

task("withdrawFromZoraMainnet", "Withdraw ETH from ZORA mainnet")
    .addParam("amount", "Amount to send", undefined, types.float)
    .addFlag("all", "Withdraw all")
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at Ethereum mainnet!`);
            return;
        }
        console.log(`Not implemented!`);

        return;
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const bridgeAddress = "0x1a0ad011913A150f69f6A19DF447A0CfD9551054";

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
                        } Bridge ${utils.formatUnits(amount)} ETH to ZORA\ntxn: ${chainInfo.explorer}${
                            txn.hash
                        }`
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

task("mintZoraTheSourceOfLightNft", "Mint THE SOURCE OF LIGHT Nft")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0x6c00CF938446c553A581F913Fb0ad17a613157F9";

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on ZORA mainnet!`);
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
                let minterArgs = utils.hexZeroPad(utils.hexlify(account.address), 32);

                const tx = await mintContract
                    .connect(account)
                    .mint("0x169d9147dfc9409afa4e558df2c9abeebc020182", 1, 1, minterArgs, {
                        value: utils.parseEther("0.000777"),
                    });

                console.log(
                    `Task result:\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${
                        chainInfo.explorer
                    }${tx.hash}\n`
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

task("mintZoraGitcoinImpactNft", "Mint Gitcoin Impact Report 01: PDF Onchain")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0x81D226fb36cA785583E79E84312335d0e166D59B";

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on ZORA mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            [
                "function mint(address minter, uint256 tokenId, uint256 quantity, bytes minterArguments) payable",
            ],
            hre.ethers.provider
        );
        const minterAddress = "0x169d9147dfc9409afa4e558df2c9abeebc020182";
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                let minterArgs = utils.hexZeroPad(utils.hexlify(account.address), 32);

                const tx = await mintContract.connect(account).mint(minterAddress, 1, 1, minterArgs, {
                    value: utils.parseEther("0.000777"),
                });

                console.log(
                    `Task result:\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${
                        chainInfo.explorer
                    }${tx.hash}\n`
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

task("mintZoraRainbowNft", "Mint Rainbow Zorb Energy")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0x12e4527e2807978A49469f8D757abF5E07b32b8F";

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on ZORA mainnet!`);
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
                let minterArgs = utils.hexZeroPad(utils.hexlify(account.address), 32);

                const tx = await mintContract.connect(account).purchase(minterArgs, {
                    value: utils.parseEther("0.000777"),
                });

                console.log(
                    `Task result:\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${
                        chainInfo.explorer
                    }${tx.hash}\n`
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

task("zoraMintEnjoyEthereumNft", "Mint Enjoy Ethereum+ NFT")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0xc51bA90509E1d3a5CB5A78E21705A844ABfb8172";

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Zora mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            [
                "function mintWithRewards(address minter,uint256 tokenId,uint256 quantity,bytes minterArguments,address mintReferral) payable",
            ],
            hre.ethers.provider
        );

        const referral = "0x0000000000000000000000000000000000000000";

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                let minterArgs = toHexZeroPad(account.address);
                const tx = await mintContract
                    .connect(account)
                    .mintWithRewards(
                        "0x04e2516a2c207e84a1839755675dfd8ef6302f0a",
                        1,
                        1,
                        minterArgs,
                        referral,
                        {
                            value: utils.parseEther("0.000777"),
                            ...txParams,
                        }
                    );

                console.log(
                    `\nTask result:\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${
                        chainInfo.explorer
                    }${tx.hash}`
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

task("zoraMintFarcasterElephantNft", "Mint Farcaster Elephant NFT")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0xb9A2F7762c890B243C92348cBB2b1FF31e4D7fDa";

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Zora mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            [
                "function mintWithRewards(address minter,uint256 tokenId,uint256 quantity,bytes minterArguments,address mintReferral) payable",
            ],
            hre.ethers.provider
        );

        const referral = "0x0000000000000000000000000000000000000000";

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                let minterArgs = toHexZeroPad(account.address);
                const tx = await mintContract
                    .connect(account)
                    .mintWithRewards(
                        "0x04e2516a2c207e84a1839755675dfd8ef6302f0a",
                        1,
                        1,
                        minterArgs,
                        referral,
                        {
                            value: utils.parseEther("0.000777"),
                            ...txParams,
                        }
                    );

                console.log(
                    `\nTask result:\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${
                        chainInfo.explorer
                    }${tx.hash}`
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

task("zoraMintWithRewards", "Mint zora NFT")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addParam("referral", "Referral address", ethers.constants.AddressZero, types.string, true)
    .addFlag("selfReferral", "User same account address as referral")
    .addParam("contractAddress", "Address of NFT contract")
    // .addParam("message", "Message to post in tokenchat after mint", undefined, types.string, true)
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
        const targetAddress = taskArgs.contractAddress;

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Zora mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            [
                "function mintWithRewards(address minter,uint256 tokenId,uint256 quantity,bytes minterArguments,address mintReferral) payable",
            ],
            hre.ethers.provider
        );

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                let minterArgs = toHexZeroPad(account.address);

                var referral = ethers.constants.AddressZero
                
                if (taskArgs.selfReferral) {
                    referral = account.address
                } else if (taskArgs.referral){
                    referral = taskArgs.referral
                }
                
                const tx = await mintContract
                    .connect(account)
                    .mintWithRewards(
                        "0x04e2516a2c207e84a1839755675dfd8ef6302f0a",
                        1,
                        1,
                        minterArgs,
                        referral,
                        {
                            value: utils.parseEther("0.000777"),
                            ...txParams,
                        }
                    );
                console.log(`Mint txn: ${chainInfo.explorer}${tx.hash}`);

                /* if (taskArgs.message) {
                    try {
                        const sessionResponse = await axios.post("https://tokenchat.co/api/session-update");
                        console.log(sessionResponse);
                        var token: string | undefined = sessionResponse.headers["set-cookie"]?.[0];
                        console.log(token);
                        if (token) {
                            var endIndex = token.search(";");
                            token = token.substring(0, endIndex);
                        }
                        console.log(token);

                        const formData = new FormData();
                        formData.append("comment", taskArgs.message);
                        const messageResponse = await axios.post(
                            `https://tokenchat.co/api/new-comment/zora:${tx.hash}`,
                            formData,
                            {
                                headers: {
                                    "User-Agent": MOCK_USER_AGENT,
                                    Cookie: token,
                                },
                            }
                        );
                        console.log(messageResponse);

                        console.log(`Message ${taskArgs.message} posted`);
                    } catch (error) {
                        console.log(error);
                    }
                } */

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
