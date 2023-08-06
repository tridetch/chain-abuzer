import { task, types } from "hardhat/config";
import "../utils/Util.tasks";
import { delay, getAccounts } from "../utils/Utils";
import { getChainInfo } from "../utils/ChainInfoUtils";

export const DeployTasks = {
    deployStubContract: "deployStubContract",
    deployErc20: "deployErc20",
    deployErc721: "deployErc721",
};

task("deployStubContract", "Deploy stub contract")
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const StubFactory = await hre.ethers.getContractFactory("Stub");

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const stubContract = await StubFactory.connect(account).deploy();
                await stubContract.deployed();

                console.log(`Contract deployed at address ${stubContract.address})`);
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
            if (taskArgs.delay != undefined) {
                await delay(taskArgs.delay);
            }
        }
    });

task("deployErc20", "Deploy standart ERC20 contract")
    .addParam("name", "Add delay", undefined, types.string, false)
    .addParam("symbol", "Add delay", undefined, types.string, false)
    .addParam("delay", "Add delay", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const ERC20ContractFacroty = await hre.ethers.getContractFactory("Erc20Stub");

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const erc20StubContract = await ERC20ContractFacroty.connect(account).deploy(
                    taskArgs.name,
                    taskArgs.symbol
                );
                await erc20StubContract.deployed();
                console.log(`Contract deployed at address: ${erc20StubContract.address})`);
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
            if (taskArgs.delay != undefined) {
                await delay(taskArgs.delay);
            }
        }
    });

task("deployErc721", "Deploy standart ERC721 contract")
    .addParam("name", "Add delay", undefined, types.string, false)
    .addParam("symbol", "Add delay", undefined, types.string, false)
    .addParam("delay", "Add delay", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const Erc721ContractFacroty = await hre.ethers.getContractFactory("Erc721Stub");

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const erc721StubContract = await Erc721ContractFacroty.connect(account).deploy(
                    taskArgs.name,
                    taskArgs.symbol
                );
                await erc721StubContract.deployed();
                console.log(`Contract deployed at address: ${erc721StubContract.address}`);
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
            if (taskArgs.delay != undefined) {
                await delay(taskArgs.delay);
            }
        }
    });

task("deployEscrowContract", "Deploy standart Escrow contract")
    .addParam("delay", "Add delay", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const EscrowContractFacroty = await hre.ethers.getContractFactory("Escrow");

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const escrowStubContract = await EscrowContractFacroty.connect(account).deploy();
                await escrowStubContract.deployed();
                console.log(`Contract deployed at address: ${escrowStubContract.address}`);
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
            if (taskArgs.delay != undefined) {
                await delay(taskArgs.delay);
            }
        }
    });
