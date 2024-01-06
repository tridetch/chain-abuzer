import { ethers } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

task("routeIntractWave8SocialFi", "")
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("delay", "Wait for gas price", undefined, types.float, true)
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
        if (ChainId.lineaMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at Linea mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);

        console.log(`\n--//-- Linea Defi Voyage: Wave 8 Social Fi --//--\n`);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        if (accounts.length == 1) {
            await performRoute(accounts[0]);
        } else {
            for (const account of accounts) {
                taskArgs.accountIndex = accounts.indexOf(account).toString();
                await performRoute(account);
            }
        }

        async function performRoute(account: ethers.Wallet) {
            try {
                console.log(`\n### ${accounts.indexOf(account)} Address ${account.address} ###`);

                const delayTime = taskArgs.delay;
                taskArgs.delay = undefined;

                const mintContractAddress = "0x4e586686e0f614c6dbce19c40f239163569d4e4b";
                const mintContract = new ethers.Contract(
                    mintContractAddress,
                    ["function balanceOf(address address) view returns (uint256 balance)"],
                    hre.ethers.provider
                );

                const nftBalance = await mintContract.balanceOf(account.address);

                if (nftBalance > 0) {
                    console.log(`Skip account, NFT already minted`);
                    return;
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                console.log(`Mint Persona NFT`);

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                const mintTx = await account.sendTransaction({
                    to: mintContractAddress,
                    value: ethers.utils.parseEther("0.0015"),
                    data: `0x84bb1e42000000000000000000000000${account.address.slice(
                        2
                    )}0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000005543df729c00000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000005543df729c000000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`,
                    ...txparams,
                });
                console.log(`tx - ${chainInfo.explorer}${mintTx.hash}`);
                await mintTx.wait(3);

                console.log(`\nLaunch tasks verification`);
                await hre.run("intractVerifyWave8SocialFi", {
                    ...taskArgs,
                });

                if (delayTime != undefined) {
                    await delay(delayTime);
                }
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }
    });
