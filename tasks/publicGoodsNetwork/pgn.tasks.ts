import { BigNumber, Contract, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts } from "../../utils/Utils";

task("bridgeToHgnSepolia", "Bridge Sepolia ETH to PGN Sepolia")
    .addParam("amount", "Amount to send", undefined, types.float)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
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

        if (![ChainId.pgnSepolia].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at --network pgnSepolia`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const bridgeAddress = "0xFaE6abCAF30D23e233AC7faF747F2fC3a5a6Bfa3";

        const bridgeContract = new Contract(
            bridgeAddress,
            ["depositETH(uint32 _l2Gas,bytes _data) payable"],
            hre.ethers.provider
        );

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
                    const txn = await bridgeContract
                        .connect(account)
                        .depositETH(200000, "", { value: amount });
                    console.log(
                        `\n#${accounts.indexOf(account)} Address: ${
                            account.address
                        } Bridge ${utils.formatUnits(amount)} ETH to Public Goods Network\ntxn: ${
                            chainInfo.explorer
                        }${txn.hash}`
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
