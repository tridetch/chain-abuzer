import { Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, populateTxnParams } from "../../utils/Utils";

task("baseMintOnchainSummerNFT", "Mint Onchain Summer NFT")
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
    .addFlag("randomize", "Randomize accounts execution order")
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

task("baseMintOnchainSummerD4IchRUNFT", "Mint Onchain Summer Day Four NFT")
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
        const contractAddress = "0x8b2937ead425ccc91fc0ad884638dc2129c51cb2";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.baseMainnet].includes(currentNetwork.chainId)) {
            console.log("Task available only at Base mainnet network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new Contract(
            contractAddress,
            ["function mint(address _to,uint256 _phaseId,uint256 _quantity,bytes _signature) payable"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });

                const mintTx = await mintContract.connect(account).mint(account.address, 0, 1, [], {
                    value: utils.parseEther("0.0022"),
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

task("baseMintOnchainSummerD4OriginatorNFT", "Mint Onchain Summer Day Four NFT")
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
        const contractAddress = "0x33ed5107f821bb1465da30b7dce4fb7105b0ad16";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.baseMainnet].includes(currentNetwork.chainId)) {
            console.log("Task available only at Base mainnet network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new Contract(
            contractAddress,
            ["function mint(address _to,uint256 _phaseId,uint256 _quantity,bytes _signature) payable"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });

                const mintTx = await mintContract.connect(account).mint(account.address, 0, 1, [], {
                    value: utils.parseEther("0.0011"),
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

task("baseMintOnchainSummerD4ParadiseNFT", "Mint Onchain Summer Day Four NFT")
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
        const contractAddress = "0x0c664a85521d5721bca047d29238d9e2a9e9e861";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.baseMainnet].includes(currentNetwork.chainId)) {
            console.log("Task available only at Base mainnet network!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new Contract(
            contractAddress,
            ["function mint(address _to,uint256 _phaseId,uint256 _quantity,bytes _signature) payable"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });

                const mintTx = await mintContract.connect(account).mint(account.address, 0, 1, [], {
                    value: utils.parseEther("0.00055"),
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

task("baseMintOnchainSummerZorbNFT", "Mint Onchain Summer Zorb NFT")
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
        const targetAddress = "0xbd52c54ab5116b1d9326352f742e6544ffdeb2cb";

        if (![ChainId.baseMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Base mainnet!`);
            return;
        }
        let mintContract = new Contract(
            targetAddress,
            [
                "function mintWithRewards(address minter,uint256 tokenId,uint256 quantity,bytes minterArguments,address mintReferral) payable",
            ],
            hre.ethers.provider
        );

        const referral = "0x7bf90111Ad7C22bec9E9dFf8A01A44713CC1b1B6";

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                let minterArgs = utils.hexZeroPad(utils.hexlify(account.address), 32);
                const tx = await mintContract
                    .connect(account)
                    .mintWithRewards(
                        "0xFF8B0f870ff56870Dc5aBd6cB3E6E89c8ba2e062",
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

task("baseMintOnchainSummerClashMonNFT", "Mint Onchain Summer ClashMon NFT")
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
        const contractAddress = "0x75ed58e1d029853231a9e9825f0035e0449fbafa";
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

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const calldata = `0x84bb1e42000000000000000000000000${account.address.slice(
                    2
                )}0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000d93af387`;

                const txParams = populateTxnParams({ signer: account, chain: chainInfo });

                const mintTx = await account.sendTransaction({
                    to: mintContract.address,
                    data: calldata,
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
