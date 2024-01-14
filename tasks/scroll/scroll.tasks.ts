import axios, { AxiosResponse } from "axios";
import * as dotenv from "dotenv";
import { BigNumber, Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams, shuffle, waitForGasPrice } from "../../utils/Utils";

dotenv.config();

task("scrollDeposit", "Bridge ETH to scroll")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Ethereum!`);
            return;
        }

        let contractAddress: string = "0xF8B1378579659D8F7EE5f3C929c2f3E332E41Fd6";

        const bridgeContract = new Contract(
            contractAddress,
            ["function depositETH(uint256 _amount,uint256 _gasLimit) payable"],
            hre.ethers.provider
        );

        const gasLimit = 168000;

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    const minBalance = utils.parseEther(
                        addDust({ amount: taskArgs.minBalance, upToPercent: taskArgs.dust }).toString()
                    );
                    amount = (await account.getBalance()).sub(minBalance);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.addDust }).toString()
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString());
                }
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const bridgeFee = await calculateBridgeFee(hre, gasLimit);

                console.log(`Bridge fee = ${utils.formatEther(bridgeFee)}`);

                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await bridgeContract.connect(account).depositETH(amount, gasLimit, {
                    value: amount.add(bridgeFee),
                    ...txParams,
                });

                console.log(`txn: ${chainInfo.explorer}${tx.hash}`);

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

        async function calculateBridgeFee(hre: HardhatRuntimeEnvironment, gasLimit: number) {
            const scrollProvider = new hre.ethers.providers.JsonRpcProvider(process.env.SCROLL_MAINNET_URL);

            const baseFee = await scrollProvider.getGasPrice();
            // console.log(`Base fee per gas ${utils.formatEther(baseFee)}`);
            const _gasLimit = BigNumber.from(gasLimit);
            const l2Fee = baseFee.mul(_gasLimit);
            // console.log(`L2Fee = ${utils.formatEther(l2Fee)}`);
            // console.log(`Bridge fee = ${utils.formatEther(l2Fee)}`);
            return l2Fee;
        }
    });

task("scrollMintHelloScrollNft", "Mint Hello Scroll NFT from Omnisea")
    .addParam("delay", "Add random delay", undefined, types.int, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const targetAddress = "0xf28e0318887fb73ec0d9feeb6f89cea347ef775d";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.scrollMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Scroll mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                const callData = `0xb2dd898a0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000149b349ae2e1314fb3429f86586f13079da4f1f80000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000`;

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                    value: utils.parseEther("0.00025"),
                    ...txParams,
                });

                console.log(`Mint txn: ${chainInfo.explorer}${tx.hash}`);

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

task("scrollContractInteractions", "Interact with erc-20 contracts")
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("interactions", "Number of contracts to interact", undefined, types.int, true)
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
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.scrollMainnet) {
            throw new Error("Task allowed only on Scroll Mainnet");
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const erc20Contracts = [
            ERC20__factory.connect("0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4", hre.ethers.provider),
            ERC20__factory.connect("0xf55bec9cafdbe8730f096aa55dad6d22d44099df", hre.ethers.provider),
            ERC20__factory.connect("0x5300000000000000000000000000000000000004", hre.ethers.provider),
            ERC20__factory.connect("0x3c1bca5a656e69edcd0d4e36bebb3fcdaca60cf1", hre.ethers.provider),
            ERC20__factory.connect("0x608ef9a3bffe206b86c3108218003b3cfbf99c84", hre.ethers.provider),
            ERC20__factory.connect("0xca77eb3fefe3725dc33bccb54edefc3d9f764f97", hre.ethers.provider),
            ERC20__factory.connect("0x2bbbdf97295f73175b12cc087cf446765931e1c3", hre.ethers.provider),
            ERC20__factory.connect("0xf610a9dfb7c89644979b4a0f27063e9e7d7cda32", hre.ethers.provider),
        ];

        const spenderAddress = "0x80e38291e06339d10AAB483C65695D004dBD5C69"; //SyncSwap router
        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                var erc20Shuffled = shuffle(erc20Contracts);

                if (taskArgs.interactions <= erc20Shuffled.length) {
                    erc20Shuffled = erc20Shuffled.slice(undefined, taskArgs.interactions);
                }

                for (const erc20 of erc20Shuffled) {
                    var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                    const tx = await erc20
                        .connect(account)
                        .approve(spenderAddress, BigNumber.from(0), { ...txParams });
                    console.log(`Approve ${await erc20.symbol()} tx ${chainInfo.explorer}${tx.hash}`);
                    await delay(0.05);
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

task("mintScrollOriginNft", "Mint Scroll Origin NFT")
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        interface ScrollOriginMintDataPayload {
            metadata: {
                deployer: string;
                firstDeployedContract: string;
                bestDeployedContract: string;
                rarityData: string;
            };
            proof: string[];
        }

        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.scrollMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Scroll mainnet!`);
            return;
        }

        const targetAddress = "0x74670a3998d9d6622e32d0847ff5977c37e0ec91";
        const mintContract = new ethers.Contract(
            targetAddress,
            ["function mint(address, (address,address,address,uint256), bytes32[])"],
            hre.ethers.provider
        );

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });
                const mintData: AxiosResponse<ScrollOriginMintDataPayload> = await axios.get(
                    `https://nft.scroll.io/p/${account.address}.json?timestamp=${new Date().getTime()}`
                );

                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await mintContract
                    .connect(account)
                    .mint(
                        account.address,
                        [
                            mintData.data.metadata.deployer,
                            mintData.data.metadata.firstDeployedContract,
                            mintData.data.metadata.bestDeployedContract,
                            mintData.data.metadata.rarityData,
                        ],
                        mintData.data.proof,
                        { ...txParams }
                    );

                console.log(`Mint txn: ${chainInfo.explorer}${tx.hash}`);

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
