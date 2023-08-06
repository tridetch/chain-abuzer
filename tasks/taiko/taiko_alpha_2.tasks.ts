import * as dotenv from "dotenv";
import { BigNumber, Contract, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts } from "../../utils/Utils";
import { taikoErcBridgeContractInfo } from "./TaikoErcBridgeContractInfo";
import { taikoEthBridgeContractInfo } from "./TaikoEthBridgeContractInfo";

dotenv.config();

const BULL_TOKEN_ADDRESS_SEPOLIA = "0x39e12053803898211F21047D56017986E0f070c1";
const BULL_TOKEN_ADDRESS_TAIKO = "0x6302744962a0578E814c675B40909e64D9966B0d";
const HORSE_TOKEN_ADDRESS_SEPOLIA = "0x958b482c4E9479a600bFFfDDfe94D974951Ca3c7";
const HORSE_TOKEN_ADDRESS_TAIKO = "0xa4505BB7AA37c2B68CfBC92105D10100220748EB";
const TEST_TAIKO_TOKEN_ADDRESS = "0x7b1a3117B2b9BE3a3C31e5a097c7F890199666aC";
const UNISWAP_ROUTER_ADDRESS = "0x501f63210aE6D7Eeb50DaE74DA5Ae407515ee246";

task("taikoA3DepositEth", "Deposit ETH")
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumSepolia].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Sepolia network!`);
            return;
        }

        let bridgeContract = new Contract(
            taikoEthBridgeContractInfo.address,
            taikoEthBridgeContractInfo.abi,
            hre.ethers.provider
        );

        const processingFee = utils.parseEther("0.0013500000009");
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                const tx = await bridgeContract.connect(account).sendMessage(
                    {
                        id: 1,
                        sender: account.address,
                        srcChainId: 11155111,
                        destChainId: 167005,
                        owner: account.address,
                        to: account.address,
                        refundAddress: account.address,
                        depositValue: amount,
                        callValue: 0,
                        processingFee: processingFee,
                        gasLimit: 140000,
                        data: "0x",
                        memo: "",
                    },
                    { value: amount.add(processingFee), gasLimit: 150000 }
                );

                console.log(`ETH bridget ${utils.formatEther(amount)} \ntxn: ${tx.hash}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("taikoA3MintBull", "Mint BULL tokens")
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const provider = hre.ethers.provider;

        let mintBullContract = new Contract(
            BULL_TOKEN_ADDRESS_SEPOLIA,
            ["function mint(address to)"],
            provider
        );
        const accounts = await getAccounts(taskArgs, provider);
        for (const account of accounts) {
            try {
                const tx = await mintBullContract
                    .connect(account)
                    .mint(account.address, { gasLimit: 100000 });

                console.log(`Minted Bull tokens Address: ${account.address}\ntxn: ${tx.hash}`);

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

task("taikoA3MintHorse", "Mint HORSE tokens")
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const provider = new hre.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_SEPOLIA_URL);

        let mintBullContract = new Contract(
            HORSE_TOKEN_ADDRESS_SEPOLIA,
            ["function mint(address to)"],
            provider
        );
        const accounts = await getAccounts(taskArgs, provider);
        for (const account of accounts) {
            try {
                const tx = await mintBullContract
                    .connect(account)
                    .mint(account.address, { gasLimit: 100000 });

                console.log(`Minted Bull tokens Address: ${account.address}\ntxn: ${tx.hash}`);

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

task("taikoA3BridgeBull", "Deposit ETH")
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);
        if (![ChainId.ethereumSepolia].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Sepolia network!`);
            return;
        }

        let bridgeContract = new Contract(
            taikoErcBridgeContractInfo.address,
            taikoErcBridgeContractInfo.abi,
            hre.ethers.provider
        );

        const bullToken = ERC20__factory.connect(BULL_TOKEN_ADDRESS_SEPOLIA, hre.ethers.provider);

        const processingFee = utils.parseEther("0.0046500000031");
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)} Address: ${account.address}`);

                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await bullToken.connect(account).balanceOf(account.address);
                } else {
                    amount = utils.parseUnits(taskArgs.amount, await bullToken.decimals());
                }

                const approveTx = await bullToken
                    .connect(account)
                    .approve(taikoErcBridgeContractInfo.address, amount);
                console.log(`Approve tx ${chainInfo.explorer}${approveTx.hash}`);

                const tx = await bridgeContract
                    .connect(account)
                    .sendERC20(
                        167005,
                        account.address,
                        bullToken.address,
                        amount,
                        140000,
                        processingFee,
                        account.address,
                        "",
                        { value: processingFee, gasLimit: 350000 }
                    );

                console.log(`Bull token bridget ${utils.formatEther(amount)} \ntxn: ${tx.hash}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("taikoA3BridgeHorse", "Deposit ETH")
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);
        if (![ChainId.ethereumSepolia].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Sepolia network!`);
            return;
        }

        let bridgeContract = new Contract(
            taikoErcBridgeContractInfo.address,
            taikoErcBridgeContractInfo.abi,
            hre.ethers.provider
        );

        const horseToken = ERC20__factory.connect(HORSE_TOKEN_ADDRESS_SEPOLIA, hre.ethers.provider);

        const processingFee = utils.parseEther("0.0046500000031");
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)} Address: ${account.address}`);

                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await horseToken.connect(account).balanceOf(account.address);
                } else {
                    amount = utils.parseUnits(taskArgs.amount, await horseToken.decimals());
                }

                const approveTx = await horseToken
                    .connect(account)
                    .approve(taikoErcBridgeContractInfo.address, amount);
                console.log(`Approve tx ${chainInfo.explorer}${approveTx.hash}`);

                const tx = await bridgeContract
                    .connect(account)
                    .sendERC20(
                        167005,
                        account.address,
                        horseToken.address,
                        amount,
                        140000,
                        processingFee,
                        account.address,
                        "",
                        { value: processingFee, gasLimit: 350000 }
                    );

                console.log(`Horse token bridget ${utils.formatEther(amount)} \ntxn: ${tx.hash}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });

task("taikoA3ContractInteractions", "Interact with erc-20 contracts")
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const network = await hre.ethers.provider.getNetwork();

        if (network.chainId != ChainId.taikoA3) {
            throw new Error("Task allowed only on --network taikoA3");
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const erc20Contracts = [
            ERC20__factory.connect(BULL_TOKEN_ADDRESS_TAIKO, hre.ethers.provider),
            ERC20__factory.connect(HORSE_TOKEN_ADDRESS_TAIKO, hre.ethers.provider),
            ERC20__factory.connect(TEST_TAIKO_TOKEN_ADDRESS, hre.ethers.provider),
        ];

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                for (const erc20 of erc20Contracts) {
                    const tx = await erc20
                        .connect(account)
                        .approve(UNISWAP_ROUTER_ADDRESS, BigNumber.from(50));
                    console.log(`Approve ${await erc20.symbol()} tx ${tx.hash}`);
                    await delay(0.1);
                }

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });
