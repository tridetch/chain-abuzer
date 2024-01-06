import * as cryptoRandom from "ethereum-cryptography/random";
import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, waitForGasPrice } from "../../utils/Utils";
import opNamesRegistrarControllerInfo from "./OpNamesRegistrarController.json";

const DURATION = 31556952; // One year
const GAS_PRICE = 18;

// DONT WORK
task("opNamesRegisterName", "Register arbId name")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Goerli testnet!`);
            return;
        }

        const opRegistrarControllerContract = new hre.ethers.Contract(
            opNamesRegistrarControllerInfo.address,
            opNamesRegistrarControllerInfo.abi,
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
                console.log(`${name}.op ${namehash}`);

                // if (!(await opRegistrarControllerContract.available(name))) {
                //     console.log(`Name "${name}" not available. Trying next account...`);
                //     continue;
                // }

                await waitForGasPrice({ maxPriceInGwei: GAS_PRICE, provider: hre.ethers.provider });

                const random = cryptoRandom.getRandomBytesSync(32);
                const salt =
                    "0x" +
                    Array.from(random)
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");

                console.log(
                    `name ${utils.solidityPack(["string"], ["satoshislayer"])}
                    address ${utils.solidityPack(["address"], ["0x73609A361844c53Ea82a717B9c3DFeFf96D22a93"])}
                    duration ${utils.solidityPack(["uint256"], ["31536000"])}
                    secret ${utils.solidityPack(
                        ["bytes32"],
                        ["0xd4c86519baa7ab55028bc5af4e28419285d0116b397e52fb8bda3e19f7062945"]
                    )}
                    address ${utils.solidityPack(["address"], ["0xE00545a7060AAF1278aAF28B7330e879A0976815"])}
                    reverseRecord ${utils.solidityPack(["bool"], [true])}
                    fuses ${utils.solidityPack(["uint32"], [0])}
                    wrapperExpiry ${utils.solidityPack(["uint64"], ["18446744073709551615"])}
                    value ${utils.solidityPack(
                        ["uint64"],
                        [utils.parseEther("0.00312500000000349").toString()]
                    )}

                    `
                );
                break;
                // Submit our commitment to the smart contract

                const commitment = await opRegistrarControllerContract
                    .connect(account)
                    .makeCommitment(
                        name,
                        account.address,
                        DURATION,
                        salt,
                        opNamesRegistrarControllerInfo.resolverAddress,
                        `0x8b95dd71b8c2f9d0088890f9ee934c256196c48bfc60111257a110960aa589365aa195e0000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000${account.address.slice(
                            2
                        )}000000000000000000000000`,
                        true,
                        0,
                        "18446744073709551615"
                    );

                const commitTx = await opRegistrarControllerContract.connect(account).commit(commitment);
                await commitTx.wait();

                console.log(`Commitment submited.\nSecret ${salt}\nTx ${commitTx.hash}`);

                let commitmentAge: number = await opRegistrarControllerContract
                    .connect(account)
                    .minCommitmentAge();
                console.log(`Wait commintemt cooldown - (${commitmentAge} seconds)`);
                await new Promise((r) => setTimeout(r, commitmentAge * 1500));

                await waitForGasPrice({ maxPriceInGwei: GAS_PRICE, provider: hre.ethers.provider });

                // Add 10% to account for price fluctuation; the difference is refunded.
                let price: BigNumber = (
                    await opRegistrarControllerContract.connect(account).rentPrice(name, DURATION)
                ).base;
                console.log(`Price ${utils.formatEther(price)}`);
                price = price.div(BigNumber.from(100)).mul(BigNumber.from(110));

                // Submit our registration request
                const registrationTxn = await opRegistrarControllerContract
                    .connect(account)
                    .register(
                        name,
                        account.address,
                        DURATION,
                        salt,
                        opNamesRegistrarControllerInfo.resolverAddress,
                        `0x8b95dd71b8c2f9d0088890f9ee934c256196c48bfc60111257a110960aa589365aa195e0000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000${account.address.slice(
                            2
                        )}000000000000000000000000`,
                        true,
                        0,
                        "18446744073709551615",
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

task("opNamesCheckAvailability", "Check Op name availability").setAction(async (taskArgs, hre) => {
    const names = require("./names.json");

    const controllerContract = new hre.ethers.Contract(
        opNamesRegistrarControllerInfo.address,
        opNamesRegistrarControllerInfo.abi,
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
