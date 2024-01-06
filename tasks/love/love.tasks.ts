import axios from "axios";
import { Contract, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { delay, getAccounts, waitForGasPrice } from "../../utils/Utils";
import { LoveTokenInfo } from "./loveContractInfo";

interface ClaimData {
    index: number;
    proof: Array<string>;
    amount: string;
    error: string;
}

task("claimLove", "Claim Love token")
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Ethereum goerli!`);
            return;
        }

        const loveToken = new Contract(LoveTokenInfo.address, LoveTokenInfo.abi);
        const claimContract = new Contract("0xb85EEb713b876A25f16604887cC6b8997ef1B9DD", [
            "function claim(uint256 index,uint256 amount,bytes32[] merkleProof)",
        ]);

        for (const account of accounts) {
            try {
                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const claimData: ClaimData = (
                    await axios.post("https://www.love.game/api/markle", {
                        address: account.address,
                    })
                ).data[0];

                if (claimData.error) {
                    console.log(
                        `Error when process account #${accounts.indexOf(account)} Address: ${
                            account.address
                        } ${claimData.error}`
                    );
                    continue;
                }

                const claimTx = await claimContract
                    .connect(account)
                    .claim(claimData.index, claimData.amount, claimData.proof);

                console.log(
                    `#${accounts.indexOf(account)} Address: ${
                        account.address
                    }\nClaimed amount ${utils.formatEther(BigInt(claimData.amount).toString())} txn ${
                        claimTx.hash
                    }`
                );

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

task("claimWar", "Claim War token")
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        interface ClaimInfo {
            signature: string;
            messageHash: string;
        }

        const chainInfo = getChainInfo((await hre.ethers.provider.getNetwork()).chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.ethereumMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Ethereum!`);
            return;
        }

        const warTokenAddress = "0x36d7aA5c67EFd83992fC5CBc488cc2f9Ba7689B8";

        const claimContract = new Contract(warTokenAddress, [
            "function claim(bytes32 messageHash,bytes signature)",
        ]);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const message = "ALL IS FAIR IN $LOVE AND $WAR";
                const messageSign = await account.signMessage(message);

                const claimData: ClaimInfo = (
                    await axios.post("https://love.game/api/claimTokens", {
                        message: message,
                        signature: messageSign,
                    })
                ).data;

                if (!claimData) {
                    console.log(`Error: Address is not eligible for claim!`);
                    continue;
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                const claimTx = await claimContract
                    .connect(account)
                    .claim(claimData.messageHash, claimData.signature);

                console.log(`Claimed txn ${chainInfo.explorer}${claimTx.hash}`);

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
