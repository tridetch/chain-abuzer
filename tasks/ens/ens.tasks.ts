import ENSRegistryInfo from "@ensdomains/ens-contracts/deployments/mainnet/ENSRegistry.json";
import ETHRegistrarControllerInfo from "@ensdomains/ens-contracts/deployments/mainnet/ETHRegistrarController.json";
import ReverseRegistrarInfo from "@ensdomains/ens-contracts/deployments/mainnet/ReverseRegistrar.json";
import * as cryptoRandom from "ethereum-cryptography/random";
import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, waitForGasPrice } from "../../utils/Utils";
import PublicResolverInfo from "./EthereumPublicResolver.json";

export const OneInchTasks = {
    oneInchSwap: "1inchSwap",
};

const DURATION = 31556952; // One year

task("ensRegisterNameLegacy", "Register ENS name")
    .addParam("delay", "Add delay", undefined, types.int, true)
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
        console.log(`Script deprecated!\nUse ensRegisterName script`);
        return;

        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Arbitrum mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const controllerContract = new hre.ethers.Contract(
            ETHRegistrarControllerInfo.address,
            ETHRegistrarControllerInfo.abi,
            hre.ethers.provider
        );

        const reverseRegistrarContract = new hre.ethers.Contract(
            ReverseRegistrarInfo.address,
            ReverseRegistrarInfo.abi,
            hre.ethers.provider
        );

        const ensRegistryContract = new hre.ethers.Contract(
            ENSRegistryInfo.address,
            ENSRegistryInfo.abi,
            hre.ethers.provider
        );

        const publicResolverContract = new hre.ethers.Contract(
            PublicResolverInfo.address,
            PublicResolverInfo.abi,
            hre.ethers.provider
        );

        let names: string[] = require("./names.json");
        names = names.slice(taskArgs.startAccount, taskArgs.endAccount);

        if (taskArgs.accountIndex != undefined) {
            names = [names[taskArgs.accountIndex]];
        }

        for (const account of accounts) {
            try {
                const index = accounts.indexOf(account);
                const name = names[index];

                console.log(`Registration process of "${name}" for address ${account.address}`);
                const namehash = utils.namehash(`${name}.eth`);
                console.log(`${name}.eth ${namehash}`);

                if (!(await controllerContract.available(name))) {
                    console.log(`Name "${name}" not available. Trying next account...`);
                    continue;
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const random = cryptoRandom.getRandomBytesSync(32);
                const secret =
                    "0x" +
                    Array.from(random)
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");

                // Submit our commitment to the smart contract

                const commitment = await controllerContract
                    .connect(account)
                    .makeCommitment(name, account.address, secret);

                const commitTx = await controllerContract.connect(account).commit(commitment);
                await commitTx.wait();

                console.log(`Commitment submited.\nSecret ${secret}\nTx ${commitTx.hash}`);

                let commitmentAge: number = await controllerContract.connect(account).minCommitmentAge();
                console.log(`Wait commintemt cooldown - (${commitmentAge} seconds)`);
                await new Promise((r) => setTimeout(r, commitmentAge * 1500));

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                // Add 10% to account for price fluctuation; the difference is refunded.
                let price: BigNumber = await controllerContract.connect(account).rentPrice(name, DURATION);
                console.log(`Price ${utils.formatEther(price)}`);
                price = price.div(BigNumber.from(100)).mul(BigNumber.from(110));

                let gasLimit = await controllerContract
                    .connect(account)
                    .estimateGas.register(name, account.address, DURATION, secret, { value: price });
                gasLimit = gasLimit.div(BigNumber.from(100)).mul(BigNumber.from(130));

                // Submit our registration request
                const registrationTxn = await controllerContract
                    .connect(account)
                    .register(name, account.address, DURATION, secret, { value: price, gasLimit: gasLimit });
                await registrationTxn.wait();

                console.log(`Registration txn ${registrationTxn.hash}`);

                const setResolverTx = await ensRegistryContract
                    .connect(account)
                    .setResolver(namehash, PublicResolverInfo.address);
                console.log(`Set resolver tx ${setResolverTx.hash}`);

                const setAddrTx = await publicResolverContract
                    .connect(account)
                    [`setAddr(bytes32,uint256,bytes)`](namehash, 60, account.address);
                console.log(`Set address tx ${setAddrTx.hash}`);

                const setNameTxn = await reverseRegistrarContract.connect(account).setName(`${name}.eth`);
                console.log(`Set name "${name}" for address ${account.address} Txn ${setNameTxn.hash}\n`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process address - ${account.address}`, error);
            }
        }
    });

task("ensRegisterName", "Register ENS name")
    .addParam("delay", "Add delay", undefined, types.int, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Arbitrum mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const controllerContract = new hre.ethers.Contract(
            ETHRegistrarControllerInfo.address,
            ETHRegistrarControllerInfo.abi,
            hre.ethers.provider
        );

        const newReverseRegistrarContract = "0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb";
        const reverseRegistrarContract = new hre.ethers.Contract(
            newReverseRegistrarContract,
            ReverseRegistrarInfo.abi,
            hre.ethers.provider
        );

        const ensRegistryContract = new hre.ethers.Contract(
            ENSRegistryInfo.address,
            ENSRegistryInfo.abi,
            hre.ethers.provider
        );

        const newResolverAddress = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";
        const publicResolverContract = new hre.ethers.Contract(
            newResolverAddress,
            PublicResolverInfo.abi,
            hre.ethers.provider
        );

        let names: string[] = require("./names.json");
        names = names.slice(taskArgs.startAccount, taskArgs.endAccount);

        if (taskArgs.accountIndex != undefined) {
            names = [names[taskArgs.accountIndex]];
        }

        for (const account of accounts) {
            try {
                const index = accounts.indexOf(account);
                const name = names[index];

                console.log(`Registration process of "${name}" for address ${account.address}`);
                const namehash = utils.namehash(`${name}.eth`);
                console.log(`${name}.eth ${namehash}`);

                if (!(await controllerContract.available(name))) {
                    console.log(`Name "${name}" not available. Trying next account...`);
                    continue;
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const random = cryptoRandom.getRandomBytesSync(32);
                const secret =
                    "0x" +
                    Array.from(random)
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");

                // Submit our commitment to the smart contract

                const commitment = await controllerContract
                    .connect(account)
                    .makeCommitment(name, account.address, secret);

                const commitTx = await controllerContract.connect(account).commit(commitment);
                await commitTx.wait();

                console.log(`Commitment submited.\nSecret ${secret}\nTx ${commitTx.hash}`);

                let commitmentAge: number = await controllerContract.connect(account).minCommitmentAge();
                console.log(`Wait commintemt cooldown - (${commitmentAge} seconds)`);
                await new Promise((r) => setTimeout(r, commitmentAge * 1500));

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                // Add 10% to account for price fluctuation; the difference is refunded.
                let price: BigNumber = await controllerContract.connect(account).rentPrice(name, DURATION);
                console.log(`Price ${utils.formatEther(price)}`);
                price = price.div(BigNumber.from(100)).mul(BigNumber.from(110));

                let gasLimit = await controllerContract
                    .connect(account)
                    .estimateGas.register(name, account.address, DURATION, secret, { value: price });
                gasLimit = gasLimit.div(BigNumber.from(100)).mul(BigNumber.from(130));

                // Submit our registration request
                const registrationTxn = await controllerContract
                    .connect(account)
                    .register(name, account.address, DURATION, secret, { value: price, gasLimit: gasLimit });
                await registrationTxn.wait();

                console.log(`Registration txn ${registrationTxn.hash}`);

                const setAddrTx = await publicResolverContract
                    .connect(account)
                    [`setAddr(bytes32,uint256,bytes)`](namehash, 60, account.address);
                console.log(`Set address tx ${setAddrTx.hash}`);
                await setAddrTx.wait();

                const setResolverTx = await ensRegistryContract
                    .connect(account)
                    .setResolver(namehash, newResolverAddress);
                console.log(`Set resolver tx ${setResolverTx.hash}`);
                await setResolverTx.wait();

                const setNameTxn = await reverseRegistrarContract.connect(account).setName(`${name}.eth`);
                console.log(`Set name "${name}" for address ${account.address} Txn ${setNameTxn.hash}\n`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process address - ${account.address}`, error);
            }
        }
    });

task("ensCheckAvailability", "Register ENS name")
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const names = require("./names.json").slice(taskArgs.startAccount, taskArgs.endAccount);

        const controllerContract = new hre.ethers.Contract(
            ETHRegistrarControllerInfo.address,
            ETHRegistrarControllerInfo.abi,
            hre.ethers.provider
        );

        for (const name of names) {
            console.log(
                `#${names.indexOf(name)} ${name} price ${hre.ethers.utils.formatEther(
                    await controllerContract.rentPrice(name, DURATION)
                )} ${await controllerContract.available(name)}`
            );
        }
    });
