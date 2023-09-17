import * as dotenv from "dotenv";
import { BigNumber, Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

dotenv.config();

task("lineaDepositEth", "Deposit ETH from ethereum mainnet to linea via official bridge")
    .addParam("amount", "Amount of ETH to deposit", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
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
        const targetAddress = "0xd19d4B5d358258f05D7B411E21A1460D11B0876F";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const lineaProvider = new ethers.providers.JsonRpcProvider(process.env.LINEA_MAINNET);

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on --network ethMainnet!`);
            return;
        }

        const bridgeContract = new Contract(targetAddress, [
            "function sendMessage(address _to,uint256 _fee,bytes _calldata) payable",
        ]);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                let amount: BigNumber;
                if (taskArgs.all) {
                    let fullBalance = await account.getBalance();
                    const minimumBalance = utils.parseEther(
                        addDust({ amount: taskArgs.minBalance }).toString()
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

                // Postman Fee = target layer gas price * (gas estimated + gas limit surplus) * margin where target layer
                // gas price is eth_gasPrice on the target layer, gas estimated = 100,000, gas limit surplus = 6000, and margin = 2

                const targetChainGasPrice = await lineaProvider.getGasPrice();
                const gasEstimated = 100000;
                const gasLimitSurplus = 6000;
                const amountOfGas = BigNumber.from(gasEstimated + gasLimitSurplus);
                const margin = 2;

                const proposerFee = amountOfGas.mul(targetChainGasPrice).mul(margin);
                console.log(`Crosschain fee ${ethers.utils.formatEther(proposerFee)}`);

                const tx = await bridgeContract
                    .connect(account)
                    .sendMessage(account.address, proposerFee, [], {
                        value: amount.add(proposerFee),
                    });

                console.log(`Deposit txn: ${chainInfo.explorer}${tx.hash}`);

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

task("lineaEchoDexDailyCheckin", "EchoDex daily check in")
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
        const targetAddress = "0xcce9d3f392c135dc038b147ca73ec496f7f89d93";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.lineaMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on --network lineaMainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts)
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const callData = `0x183ff085`;

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });

                const tx = await account.sendTransaction({
                    to: targetAddress,
                    data: callData,
                    ...txParams,
                });

                console.log(`Check-in txn: ${chainInfo.explorer}${tx.hash}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
    });

task("lineaContractInteractions", "Interact with erc-20 contracts")
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
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.lineaMainnet) {
            throw new Error("Task allowed only on Linea mainnet chain");
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const erc20Contracts = [
            ERC20__factory.connect("0x7d43AABC515C356145049227CeE54B608342c0ad", hre.ethers.provider),
            ERC20__factory.connect("0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f", hre.ethers.provider),
            ERC20__factory.connect("0x176211869cA2b568f2A7D4EE941E073a821EE1ff", hre.ethers.provider),
            ERC20__factory.connect("0x9201f3b9DfAB7C13Cd659ac5695D12D605B5F1e6", hre.ethers.provider),
            ERC20__factory.connect("0xf5C6825015280CdfD0b56903F9F8B5A2233476F5", hre.ethers.provider),
            ERC20__factory.connect("0x265B25e22bcd7f10a5bD6E6410F10537Cc7567e8", hre.ethers.provider),
            ERC20__factory.connect("0xA219439258ca9da29E9Cc4cE5596924745e12B93", hre.ethers.provider),
            ERC20__factory.connect("0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", hre.ethers.provider),
            ERC20__factory.connect("0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5", hre.ethers.provider),
            ERC20__factory.connect("0x3b2F62d42DB19B30588648bf1c184865D4C3B1D6", hre.ethers.provider),
        ];

        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)} Address ${account.address}`);
                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                for (const erc20 of erc20Contracts) {
                    const tx = await erc20.connect(account).approve(erc20.address, BigNumber.from(0), {
                        ...txParams,
                    });
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
