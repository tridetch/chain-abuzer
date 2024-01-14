import axios from "axios";
import * as dotenv from "dotenv";
import * as ethers from "ethers";
import { BigNumber } from "ethers";
import { task, types } from "hardhat/config";
import * as zksync from "zksync-web3";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import {
    DEFAULT_REFERER,
    MOCK_USER_AGENT,
    addDust,
    dateInSeconds,
    delay,
    getAccounts,
    shuffle,
    waitForGasPrice,
} from "../../utils/Utils";
dotenv.config();

export const ZkSyncV2Tasks = {
    zksyncV2Bridge: "zksyncV2Bridge",
    zksyncV2Balances: "zksyncV2Balances",
};

const ZKSYNC_MAINNET_RPC = "https://zksync2-mainnet.zksync.io/";

task("zksyncEraDeposit", "Bridge ETH to zksyncV2 network")
    .addParam("amount", "Amount of ETH", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addFlag("all", "Use all amount")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.ethereumMainnet) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);

                zkWallet.sendTransaction;

                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = ethers.utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else if (taskArgs.all) {
                    const balance = await account.getBalance();
                    const minBalance = ethers.utils.parseEther(
                        addDust({ amount: taskArgs.minBalance }).toString()
                    );
                    amount = balance.sub(minBalance);
                } else {
                    amount = ethers.utils.parseEther(taskArgs.amount.toString());
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                // Deposit funds to L2
                const depositHandle = await zkWallet.deposit({
                    token: zksync.utils.ETH_ADDRESS,
                    amount: amount,
                });

                console.log(
                    `\n#${accounts.indexOf(account)} ${ethers.utils.formatEther(
                        amount
                    )} bridget from address ${zkWallet.address}\nTxn ${chainInfo.explorer}${
                        depositHandle.hash
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

        console.log("All funds sent across the bridge");
    });

task("zksyncEraWithdraw", "Withdraw ETH from zksyncV2 network")
    .addParam("amount", "Amount of ETH", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addFlag("all", "Use all amount")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
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
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const ethMainnetProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_URL);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);

                let amount: BigNumber;
                if (taskArgs.all) {
                    const balance = await zkWallet.getBalance();

                    const minBalance = ethers.utils.parseEther(
                        addDust({ amount: taskArgs.minBalance, upToPercent: taskArgs.dust }).toString()
                    );

                    amount = balance.sub(minBalance);
                } else if (taskArgs.dust) {
                    amount = ethers.utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = ethers.utils.parseEther(taskArgs.amount.toString());
                }

                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: ethMainnetProvider });

                // Withdraw funds from L2
                const withdrawHandle = await zkWallet.withdraw({
                    to: zkWallet.address,
                    token: zksync.utils.ETH_ADDRESS,
                    amount: amount,
                });

                console.log(
                    `${ethers.utils.formatEther(amount)} bridget\nTxn ${chainInfo.explorer}${
                        withdrawHandle.hash
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

        console.log("All funds sent across the bridge");
    });

task("zksyncEraMuteSwitchSwap", "Make swap on mute.switch eth -> usdc -> eth")
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const muteSwitchAddress = "0x8B791913eB07C32779a16750e3868aA8495F5964";
        const usdcAddress = "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4";
        const network = await hre.ethers.provider.getNetwork();

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on zksyncEra chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const muteSwitchRouterContract = new ethers.Contract(
            muteSwitchAddress,
            [
                "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline, bool[] stable) payable",
                "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline, bool[] stable)",
            ],
            hre.ethers.provider
        );

        const usdcContract = ERC20__factory.connect(usdcAddress, hre.ethers.provider);
        const ethAmount = ethers.utils.parseEther("0.01");
        const ethMinOutAmount = ethers.utils.parseEther("0.0091");
        const minUsdcOut = ethers.utils.parseUnits("15", await usdcContract.decimals());

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);
                const deadline = dateInSeconds(new Date()) + 60 * 10; // now plus 5 min
                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);

                const swapEthTx = await muteSwitchRouterContract
                    .connect(zkWallet)
                    .swapExactETHForTokensSupportingFeeOnTransferTokens(
                        minUsdcOut, // amountOutMin
                        [
                            "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
                            "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
                        ], // path
                        account.address, // to
                        deadline, // deadline
                        [true, false], // stable
                        { value: ethAmount }
                    );
                await swapEthTx.wait();

                console.log(`Swap ETH tx ${swapEthTx.hash}`);
                const usdcAmount = await usdcContract.balanceOf(zkWallet.address);
                const approveTx = await usdcContract
                    .connect(zkWallet)
                    .approve(muteSwitchAddress, usdcAddress);
                await approveTx.wait();

                console.log(`Approve USDC tx ${approveTx.hash}`);

                const swapUsdcTx = await muteSwitchRouterContract
                    .connect(zkWallet)
                    .swapExactTokensForETHSupportingFeeOnTransferTokens(
                        usdcAmount,
                        ethMinOutAmount, // amountOutMin
                        [
                            "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
                            "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
                        ], // path
                        account.address, // to
                        deadline, // deadline
                        [false, false] // stable
                    );

                console.log(`Swap USDC tx ${swapUsdcTx.hash}`);
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

task("zksyncNexonRoute", "Get tokens from faucet, lent ETH at Nexon and then withdraw, lend DAI")
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
        const nexonAddress = "0x2e147b1243a67073d22a2ceaa8d62912f158abb9";
        const faucetAddress = "0x60371a3af7ea5a1ce594de2e419ff942134b1f70";
        const daiTokenAddress = "0xfc26fcf18291f13c4c39f004bc8f51e25149ebe1";
        const daiMarketAddress = "0x3ef0d3daeffe6308e19054ad09d28f690140c50f";
        const network = await hre.ethers.provider.getNetwork();

        if (network.chainId != ChainId.ethereumMainnet) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        /* Request from faucet */
        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)}`);

                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);
                const callData = `0x4451d89f`;

                const tx = await zkWallet.sendTransaction({
                    to: faucetAddress,
                    data: callData,
                });
                await tx.wait();
                console.log(`Faucet tx ${tx.hash}`);
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }

        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)} ${account.address}`);
                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);

                /* Lend ETH */
                const lendEthcallData = `0x1249c58b`;

                const lendEthTx = await zkWallet.sendTransaction({
                    to: nexonAddress,
                    data: lendEthcallData,
                    value: ethers.utils.parseEther("0.0001"),
                });
                await lendEthTx.wait();
                console.log(`Lend ETH tx ${lendEthTx.hash}`);

                const withdrawEthcallData = `0xdb006a75000000000000000000000000000000000000000000000000000000000007a11d`;

                /* Withdraw ETH */
                const withdrawEthTx = await zkWallet.sendTransaction({
                    to: nexonAddress,
                    data: withdrawEthcallData,
                });
                await withdrawEthTx.wait();
                console.log(`Withdraw ETH tx ${withdrawEthTx.hash}`);

                /* Lend DAI */
                const approveCallData = `0x095ea7b30000000000000000000000003ef0d3daeffe6308e19054ad09d28f690140c50f0000000000000000000000000000000000000000000000008ac7230489e80000`;

                const approveTx = await zkWallet.sendTransaction({
                    to: daiTokenAddress,
                    data: approveCallData,
                });

                const lendDaiCallData = `0xa0712d680000000000000000000000000000000000000000000000004563918244f40000`;
                const lendTx = await zkWallet.sendTransaction({
                    to: daiMarketAddress,
                    data: lendDaiCallData,
                });

                console.log(`Lend dai tx ${lendTx.hash}`);

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

task("zksyncZkDucksClaim", "Claim zkDucks")
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const targetAddress = "0x9c2274cdDed274F57583c1433Cfe90B7548c8F06";
        const network = await hre.ethers.provider.getNetwork();

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on zksyncEra chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const claimContract = new ethers.Contract(
            targetAddress,
            ["function claimZkDucks(uint256 _quantity)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)} Address ${account.address}`);
                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);

                const claimTx = await claimContract.connect(zkWallet).claimZkDucks(1);

                console.log(`Claimed ${claimTx.hash}\n`);

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

task("zksyncTevaeraMintProfile", "Mint tevaera profile")
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
        const network = await hre.ethers.provider.getNetwork();

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on zksyncEra chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const profileContractAddress = "0xd29Aa7bdD3cbb32557973daD995A3219D307721f";
        const guardianNftContractAddress = "0x50B2b7092bCC15fbB8ac74fE9796Cf24602897Ad";
        const amount = ethers.utils.parseEther("0.0003");

        for (const account of accounts) {
            try {
                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);

                console.log(`\n#${accounts.indexOf(account)} Address ${zkWallet.address}`);

                const mintTx = await zkWallet.sendTransaction({
                    to: profileContractAddress,
                    data: "0xfefe409d",
                    value: amount,
                });

                await mintTx.wait();

                console.log(`Mint txn ${mintTx.hash}`);

                const guardianNftTx = await zkWallet.sendTransaction({
                    to: guardianNftContractAddress,
                    data: "0x1249c58b",
                });

                await guardianNftTx.wait();

                console.log(`Guardian nft txn ${guardianNftTx.hash}`);

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

task("zksyncL0MintNft", "Mint L0 nft")
    .addParam("delay", "Add random delay", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account ixndex", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const network = await hre.ethers.provider.getNetwork();

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on zksyncEra chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const l0NftContract = new ethers.Contract("0x31DCD96f29BD32F3a1856247846E9d2f95C2b639", [
            "function mint()",
            "function crossChain(uint16 dstChainId, uint256 tokenId) payable",
        ]);

        for (const account of accounts) {
            try {
                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);

                console.log(`\n#${accounts.indexOf(account)} Address ${zkWallet.address}`);

                const mintTx = await l0NftContract.connect(account).mint();
                console.log(`Mint txn ${mintTx.hash}`);

                const mintTxReceip = await mintTx.wait();
                const nftId = BigInt(mintTxReceip.logs[2].topics[3]).toString();

                const bridgeTx = await l0NftContract
                    .connect(account)
                    .crossChain(109, nftId, { value: ethers.utils.parseEther("0.0003") });

                console.log(`Bridge tx ${bridgeTx.hash}`);

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

task("zksyncEraContractInteractions", "Interact with erc-20 contracts")
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

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on zksyncEra chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const erc20Contracts = [
            ERC20__factory.connect("0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4", hre.ethers.provider),
            ERC20__factory.connect("0x0e97C7a0F8B2C9885C8ac9fC6136e829CbC21d42", hre.ethers.provider),
            ERC20__factory.connect("0xc2B13Bb90E33F1E191b8aA8F44Ce11534D5698E3", hre.ethers.provider),
            ERC20__factory.connect("0x42c1c56be243c250AB24D2ecdcC77F9cCAa59601", hre.ethers.provider),
            ERC20__factory.connect("0xeE1E88eb20bECDebE1e88f50C9f8b1d72478f2d0", hre.ethers.provider),
            ERC20__factory.connect("0x503234F203fC7Eb888EEC8513210612a43Cf6115", hre.ethers.provider),
            ERC20__factory.connect("0xBbD1bA24d589C319C86519646817F2F153c9B716", hre.ethers.provider),
            ERC20__factory.connect("0x9E22D758629761FC5708c171d06c2faBB60B5159", hre.ethers.provider),
            ERC20__factory.connect("0x140D5bc5b62d6cB492B1A475127F50d531023803", hre.ethers.provider),
            ERC20__factory.connect("0x9929bCAC4417A21d7e6FC86F6Dae1Cc7f27A2e41", hre.ethers.provider),
            ERC20__factory.connect("0xD63eF5e9C628c8a0E8984CDfb7444AEE44B09044", hre.ethers.provider),
            ERC20__factory.connect("0x3f0B8B206A7FBdB3ecFc08c9407CA83F5aB1Ce59", hre.ethers.provider),
        ];

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                var erc20Shuffled = shuffle(erc20Contracts);

                if (taskArgs.interactions <= erc20Shuffled.length) {
                    erc20Shuffled = erc20Shuffled.slice(undefined, taskArgs.interactions);
                }

                for (const erc20 of erc20Shuffled) {
                    const tx = await erc20.connect(account).approve(erc20.address, BigNumber.from(0));
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

task("zksyncAdcaNft", "Mint ADCA Nft")
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
        const targetAddress = "0x111f5DAB17D942ae5C0BA829cA913B806e6d3040";
        const network = await hre.ethers.provider.getNetwork();

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        /* Request from faucet */
        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)} Address: ${account.address}`);

                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);
                const callData = `0x6a627842000000000000000000000000${account.address.slice(2)}`;

                const tx = await zkWallet.sendTransaction({
                    to: targetAddress,
                    data: callData,
                });
                await tx.wait();

                console.log(`Claim tx ${tx.hash}`);

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

task("claimPeperaDrop", "Claim PEPERA drop")
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
        const zkApesTokenAddress = "0x47EF4A5641992A72CFd57b9406c9D9cefEE8e0C4";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.zkSyncEra != currentNetwork.chainId) {
            console.log("Task awailable only at zksyncEra");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const claimContract = new ethers.Contract(
            "0xBc0AeEdc14BF2Ea2427A5945ccD428768eA50400",
            ["function claim(bytes signature, address referrer)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const claimData = await axios.post(
                    `https://zksync-ape-apis.zkape.io/airdrop/index/getcertificate`,
                    { address: account.address }
                );

                if (claimData.data.Code != 200) {
                    console.log(`Not eligible or already claimed`);
                    continue;
                }

                // console.log(claimData.data);

                let claimTx = await claimContract
                    .connect(account)
                    .claim(
                        claimData.data.Data.owner,
                        claimData.data.Data.value,
                        claimData.data.Data.nonce,
                        claimData.data.Data.deadline,
                        claimData.data.Data.v,
                        claimData.data.Data.r,
                        claimData.data.Data.s
                    );

                console.log(`Tx hash ${claimTx.hash}`);
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

task("zksyncMintCryptomazeNft", "Cryptomaze first")
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
        const targetAddress = "0x3F9931144300f5Feada137d7cfE74FAaa7eF6497";
        const mintPassAddress = "0x54948AF9D4220aCee7aA5340C818865F6B313f96";
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);
                for (let i = 0; i < 5; i++) {
                    const callData = `0x57bc3d78000000000000000000000000${account.address.slice(
                        2
                    )}000000000000000000000000000000000000000000000000000000000000000${i}0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`;

                    try {
                        const tx = await zkWallet.sendTransaction({
                            to: targetAddress,
                            data: callData,
                        });
                        await tx.wait();

                        console.log(`Mint #${i} nft tx ${chainInfo.explorer}${tx.hash}`);
                    } catch (error) {
                        console.log(`Already minted or error occurs when mint #${i} nft`);
                    }
                }

                const passCallData = `0x57bc3d78000000000000000000000000${account.address.slice(
                    2
                )}00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`;

                try {
                    const tx = await zkWallet.sendTransaction({
                        to: mintPassAddress,
                        data: passCallData,
                    });
                    await tx.wait();

                    console.log(`Mint pass nft tx ${chainInfo.explorer}${tx.hash}`);
                } catch (error) {
                    console.log(`Already minted or error occurs when mint Pass nft`);
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

task("zksyncCheckLibertasNft", "Check LIBERTAS OMNIBUS Nft balance")
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
        const targetAddress = "0xD07180c423F9B8CF84012aA28cC174F3c433EE29";
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const contract = new ethers.Contract(
            targetAddress,
            ["function balanceOf(address owner) view returns (uint256 balance)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);
                const balance = ((await contract.balanceOf(zkWallet.address)) as BigNumber).toNumber();
                console.log(`Balance ${balance}`);

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

task("zksyncTevaeraMintOnftBundleNft", "Mint Tevaera ONFT bundle")
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
        const targetAddress = "0x5dE117628B5062F56f37d8fB6603524C7189D892";
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on zkSyncEra chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        /* Request from faucet */
        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);
                const callData = `0x410404b7`;

                const tx = await zkWallet.sendTransaction({
                    to: targetAddress,
                    data: callData,
                    value: ethers.utils.parseEther("0.0009"),
                });
                await tx.wait();

                console.log(`Mint tx ${chainInfo.explorer}${tx.hash}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("zksyncClaimZkPepeAirdrop", "Check zkpepe airdrop amount")
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
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on ethereum chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const zkPepe = ERC20__factory.connect("0x7D54a311D56957fa3c9a3e397CA9dC6061113ab3", zkProvider);
        const zkPepeDecimals = await zkPepe.decimals();

        const claimContract = new ethers.Contract("0x95702a335e3349d197036Acb04BECA1b4997A91a", [
            "function claim(bytes32[] proof, uint256 amount)",
        ]);

        const headers = {
            "sec-ch-ua": '"Chromium";v="119", "Not?A_Brand";v="24"',
            Accept: "application/json, text/plain, */*",
            Referer: "https://www.zksyncpepe.com/airdrop",
            DNT: "1",
            "sec-ch-ua-mobile": "?0",
            "User-Agent": MOCK_USER_AGENT,
            "sec-ch-ua-platform": '"macOS"',
        };

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const response = await axios.get(
                    `https://www.zksyncpepe.com/resources/amounts/${account.address.toLowerCase()}.json`,
                    {
                        headers: headers,
                    }
                );

                if (typeof response.data[0] === "number") {
                    const amount = ethers.utils.parseUnits(response.data[0].toString(), zkPepeDecimals);
                    console.log(
                        `Congrats! ${ethers.utils.formatUnits(
                            amount,
                            zkPepeDecimals
                        )} $zkPepe awailable. Claiming...`
                    );

                    const proof = await axios.get(
                        `https://www.zksyncpepe.com/resources/proofs/${account.address.toLowerCase()}.json`,
                        {
                            headers: headers,
                        }
                    );

                    const claimTx = await claimContract.connect(account).claim(proof.data, amount);

                    console.log(`Claim Tx - ${chainInfo.explorer}${claimTx.hash}`);
                } else {
                    console.log(`What a pity! You are not eligible for this airdrop round.`);
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

task("zksyncOwltoCheckIn", "Daily check-in")
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addParam("referer", "Add random delay", DEFAULT_REFERER, types.string, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account ixndex", undefined, types.string)
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

        if (network.chainId != ChainId.zkSyncEra) {
            throw new Error("Task allowed only on zksyncEra chain");
        }

        const zkProvider = new zksync.Provider(ZKSYNC_MAINNET_RPC);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const contract = new ethers.Contract("0xD48e3caf0D948203434646a3f3e80f8Ee18007dc", [
            "function checkIn(uint256 date)",
        ]);

        const date = new Date().toISOString().replace(/-/g, "").slice(0, 8);

        var ref: string = "https://owlto.finance";

        if (taskArgs.referal && taskArgs.referal != "") {
            ref = `https://owlto.finance/?ref=${taskArgs.referal}`
        }

        for (const account of accounts) {
            try {
                const zkWallet = new zksync.Wallet(account.privateKey, zkProvider, hre.ethers.provider);
                console.log(`\n#${accounts.indexOf(account)} Address ${zkWallet.address}`);

                const checkInTx = await contract.connect(account).checkIn(date);
                await checkInTx.wait()

                console.log(`Check-In tx ${chainInfo.explorer}${checkInTx.hash}`);

                const response = await axios.get("https://owlto.finance/api/lottery/maker/sign/in", {
                    params: {
                        hash: checkInTx.hash,
                        chainId: "324",
                        userAddress: account.address,
                    },
                    headers: {
                        authority: "owlto.finance",
                        accept: "application/json, text/plain, */*",
                        "accept-language": "en-US,en;q=0.9",
                        dnt: "1",
                        referer: ref,
                        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": '"macOS"',
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "user-agent": MOCK_USER_AGENT,
                    },
                });

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
