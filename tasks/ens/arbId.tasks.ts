import * as cryptoRandom from "ethereum-cryptography/random";
import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, waitForGasPrice } from "../../utils/Utils";
import arbRegistrarControllerInfo from "./ArbRegistrarController.json";

const DURATION = 31556952; // One year
const GAS_PRICE = 18;

task("arbIdRegisterName", "Register arbId name")
    .addParam("delay", "Add delay", undefined, types.int, true)
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

        if (![ChainId.arbitrumMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Arbitrum mainnet!`);
            return;
        }

        const arbRegistrarControllerContract = new hre.ethers.Contract(
            arbRegistrarControllerInfo.address,
            arbRegistrarControllerInfo.abi,
            hre.ethers.provider
        );

        let names: string[] = require("./names.json");
        names = names.slice(taskArgs.startAccount, taskArgs.endAccount);

        if (taskArgs.accountIndex != undefined) {
            names = [names[taskArgs.accountIndex]];
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                const index = accounts.indexOf(account);
                const name = names[index];

                console.log(`Registration process of "${name}" for address ${account.address}`);
                const namehash = utils.namehash(`${name}.eth`);
                console.log(`${name}.arb ${namehash}`);

                if (!(await arbRegistrarControllerContract.available(name))) {
                    console.log(`Name "${name}" not available. Trying next account...`);
                    continue;
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const random = cryptoRandom.getRandomBytesSync(32);
                const salt =
                    "0x" +
                    Array.from(random)
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");

                // Submit our commitment to the smart contract

                const commitment = await arbRegistrarControllerContract
                    .connect(account)
                    .makeCommitment(name, account.address, salt);

                const commitTx = await arbRegistrarControllerContract.connect(account).commit(commitment);
                await commitTx.wait();

                console.log(`Commitment submited.\nSecret ${salt}\nTx ${commitTx.hash}`);

                let commitmentAge: number = await arbRegistrarControllerContract
                    .connect(account)
                    .minCommitmentAge();
                console.log(`Wait commintemt cooldown - (${commitmentAge} seconds)`);
                await new Promise((r) => setTimeout(r, commitmentAge * 1500));

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                // Add 10% to account for price fluctuation; the difference is refunded.
                let price: BigNumber = (
                    await arbRegistrarControllerContract.connect(account).rentPrice(name, DURATION)
                ).base;
                console.log(`Price ${utils.formatEther(price)}`);
                price = price.div(BigNumber.from(100)).mul(BigNumber.from(110));

                // Submit our registration request
                const registrationTxn = await arbRegistrarControllerContract
                    .connect(account)
                    .registerWithConfigAndPoint(
                        name,
                        account.address,
                        DURATION,
                        salt,
                        arbRegistrarControllerInfo.resolverAddress,
                        true,
                        false,
                        { value: price /* , gasLimit: gasLimit  */ }
                    );
                await registrationTxn.wait();

                console.log(`Registration txn ${registrationTxn.hash}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process address - ${account.address}`, error);
            }
        }
    });

task("arbIdCheckAvailability", "Register ENS name").setAction(async (taskArgs, hre) => {
    const names = require("./names.json");

    const controllerContract = new hre.ethers.Contract(
        arbRegistrarControllerInfo.address,
        arbRegistrarControllerInfo.abi,
        hre.ethers.provider
    );

    for (const name of names) {
        console.log(
            `${name} ${await controllerContract.available(name)} price ${hre.ethers.utils.formatEther(
                (await controllerContract.rentPrice(name, DURATION)).base
            )}`
        );
    }
});
