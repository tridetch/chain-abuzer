import * as dotenv from "dotenv";
import { BigNumber, Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
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
