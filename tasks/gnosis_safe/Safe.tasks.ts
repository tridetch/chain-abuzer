import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { EthersAdapter, SafeAccountConfig, SafeFactory, SafeFactoryConfig } from "@safe-global/protocol-kit";
import { EthAdapter } from "@safe-global/safe-core-sdk-types";
import { Wallet, ethers, utils } from "ethers";
import * as fs from "fs";
import { task, types } from "hardhat/config";
import { getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts } from "../../utils/Utils";

export const GnosisSafeTasks = {
    gnosisBalances: "gnosisBalances",
    gnosisCreateAccounts: "gnosisCreateAccounts",
    gnosisDeposit: "gnosisDeposit",
};

interface SafeInfo {
    safeAddress: string;
    owners: string[];
}

export async function getSafes(
    taskArgs: any,
    provider: ethers.providers.JsonRpcProvider
): Promise<SafeInfo[]> {
    const deployedSafes: SafeInfo[] = require(`./DeployedSafes_${(await provider.getNetwork()).name}.json`);

    let accounts = deployedSafes.slice(taskArgs.startAccount, taskArgs.endAccount);
    if (taskArgs.accountIndex != undefined) {
        accounts = [accounts[taskArgs.accountIndex]];
    }
    return accounts;
}

task("gnosisBalances", "Print Gnosis Safe accounts")
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
        const provider = hre.ethers.provider;
        const network = await provider.getNetwork();

        const accounts = await getSafes(taskArgs, provider);
        for (const account of accounts) {
            try {
                const balance = await provider.getBalance(account.safeAddress);
                console.log(
                    `\n#${accounts.indexOf(account) + 1} Safe address: ${
                        account.safeAddress
                    } Balance: ${hre.ethers.utils.formatEther(balance)}\nOwners: ${account.owners}`
                );
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.owners[0]}`
                );
                console.log(error);
            }
        }
    });

task("gnosisCreateAccounts", "Create Gnosis wallets")
    .addParam("delay", "Add delay", undefined, types.int, true)
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
        const provider = hre.ethers.provider;
        const network = await provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        const [signer, ...accounts] = await getAccounts(taskArgs, hre.ethers.provider);

        let deployedSafes: SafeInfo[] = [];

        try {
            deployedSafes = require(`./DeployedSafes_${chainInfo.chainName}.json`);
        } catch {
            // ignore
        }

        const filePath = `./tasks/gnosis_safe/DeployedSafes_${chainInfo.chainName}.json`;

        try {
            console.log(`\n#${accounts.indexOf(accounts[1])} Address: ${accounts[1].address}`);
            await createSafe(signer, accounts[1]);
            if (taskArgs.delay != undefined) {
                await delay(taskArgs.delay);
            }
        } catch (error) {
            console.log(`Error when process account Signer Address: ${signer.address}`);
            console.log(error);
        }

        for (const account of accounts) {
            console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
            try {
                await createSafe(account, signer);
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

        console.log(deployedSafes);

        async function createSafe(
            account: SignerWithAddress | Wallet,
            secondOwner: SignerWithAddress | Wallet
        ) {
            // @ts-ignore
            const ethAdapter: EthAdapter = new EthersAdapter({
                ethers,
                signerOrProvider: account,
            });

            const config: SafeFactoryConfig = { ethAdapter: ethAdapter };
            const safeFactory = await SafeFactory.create({ ethAdapter });
            const safeAccountConfig: SafeAccountConfig = {
                owners: [account.address, secondOwner.address],
                threshold: 2,
            };
            const safeSdk = await safeFactory.deploySafe({ safeAccountConfig });

            console.log(`Safe deployed`);

            deployedSafes.push({
                safeAddress: await safeSdk.getAddress(),
                owners: await safeSdk.getOwners(),
            });
            fs.writeFileSync(filePath, JSON.stringify(deployedSafes));
        }
    });

task("gnosisDeposit", "Deposit ETH to gnosis safe wallet")
    .addParam("amount", "Amount to deposit", undefined, types.float)
    .addFlag("dust", "Dust percentage")
    .addParam("delay", "Add delay", undefined, types.int, true)
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
        const provider = hre.ethers.provider;

        const safes: SafeInfo[] = await getSafes(taskArgs, provider);

        for (const safe of safes) {
            try {
                var amount: number;
                if (taskArgs.dust) {
                    amount = addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust });
                } else {
                    amount = taskArgs.amount;
                }

                const owner = (await getAccounts(taskArgs, hre.ethers.provider)).find(
                    (obj) => obj.address === safe.owners[0]
                );
                if (owner == undefined) continue;

                const txn = await owner.sendTransaction({
                    to: safe?.safeAddress,
                    value: utils.parseEther(amount.toString()),
                });

                console.log(
                    `Deposited ${amount} from ${owner.address} to ${safe?.safeAddress} (${txn.hash})`
                );
                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(
                    `Error when process account #${safes.indexOf(safe)} Address: ${safe.safeAddress}`
                );
                console.log(error);
            }
        }
    });
