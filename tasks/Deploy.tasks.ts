import { task, types } from "hardhat/config";
import { getChainInfo } from "../utils/ChainInfoUtils";
import "../utils/Util.tasks";
import { delay, getAccounts, populateTxnParams, waitForGasPrice } from "../utils/Utils";

export const DeployTasks = {
    deployStubContract: "deployStubContract",
    deployErc20: "deployErc20",
    deployErc721: "deployErc721",
};

task("deployStubContract", "Deploy stub contract")
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const StubFactory = await hre.ethers.getContractFactory("Stub");
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                
                await waitForGasPrice({
                    maxPriceInGwei: taskArgs.gasPrice,
                    provider: hre.ethers.provider,
                });

                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const stubContract = await StubFactory.connect(account).deploy({ ...txParams });

                console.log(`Contract deployed at address ${stubContract.address}`);
                console.log(`tx: ${chainInfo.explorer}${stubContract.deployTransaction.hash}`);
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
    .addParam("name", "Add delay", "Wrapped ETH", types.string, true)
    .addParam("symbol", "Add delay", "WETH", types.string, true)
    .addParam("delay", "Add delay", undefined, types.int, true)
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
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);
        const ERC20ContractFacroty = await hre.ethers.getContractFactory("Erc20Stub");

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });

                const erc20StubContract = await ERC20ContractFacroty.connect(account).deploy(
                    taskArgs.name,
                    taskArgs.symbol,
                    { ...txParams }
                );
                await erc20StubContract.deployed();

                console.log(`Contract deployed at address: ${erc20StubContract.address})`);
                console.log(`tx: ${chainInfo.explorer}${erc20StubContract.deployTransaction.hash}`);
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

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const Erc721ContractFacroty = await hre.ethers.getContractFactory("Erc721Stub");

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });

                const erc721StubContract = await Erc721ContractFacroty.connect(account).deploy(
                    taskArgs.name,
                    taskArgs.symbol,
                    { ...txParams }
                );
                await erc721StubContract.deployed();
                console.log(`Contract deployed at address: ${erc721StubContract.address}`);
                console.log(`tx: ${chainInfo.explorer}${erc721StubContract.deployTransaction.hash}`);
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

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const EscrowContractFacroty = await hre.ethers.getContractFactory("Escrow");

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });

                const escrowStubContract = await EscrowContractFacroty.connect(account).deploy({
                    ...txParams,
                });
                await escrowStubContract.deployed();
                console.log(`Contract deployed at address: ${escrowStubContract.address}`);
                console.log(`tx: ${chainInfo.explorer}${escrowStubContract.deployTransaction.hash}`);
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
