import { ethers } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

task("routeIntractWave7Trading", "")
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("delay", "Wait for gas price", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addParam("randomize", "Take random accounts and execution order", undefined, types.int, true)
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

        console.log(`\n--//-- Linea Defi Voyage: Wave 7 Trading --//--\n`);

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

                const balance = await account.getBalance();

                const minBalance = ethers.utils.parseEther("0.01");
                const ethAmountRaw = 0.008;
                const ethAmount = ethers.utils.parseEther(ethAmountRaw.toString());

                const usdcTokenAddress = "0x176211869ca2b568f2a7d4ee941e073a821ee1ff";
                const usdcContract = ERC20__factory.connect(usdcTokenAddress, hre.ethers.provider);
                const usdcAmountRaw = 16;
                const usdcAmount = ethers.utils.parseUnits(usdcAmountRaw.toString(), await usdcContract.decimals());

                const zkdxAddress = "0x3a85b87e81cd99d4a6670f95a4f0dedaac207da0";

                if (balance < minBalance) {
                    console.log(
                        `Skip account with low balance. Min - ${ethers.utils.formatEther(
                            minBalance
                        )}ETH Actual balance - ${ethers.utils.formatEther(balance)}`
                    );
                    return;
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                await hre.run("syncSwapTrade", {
                    amount: ethAmountRaw,
                    toToken: usdcTokenAddress,
                    ...taskArgs,
                });

                await hre.run("approve", {
                    amount: usdcAmountRaw,
                    tokenAddress: usdcTokenAddress,
                    spenderAddress: zkdxAddress,
                    ...taskArgs,
                });
                await delay(0.05)

                console.log(`Deposit to ZKDX`);
                
                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                const supplyTx = await account.sendTransaction({
                    to: zkdxAddress,
                    data: `0x045d0389000000000000000000000000176211869ca2b568f2a7d4ee941e073a821ee1ff0000000000000000000000000000000000000000000000000000000000f42400`,
                    ...txparams,
                });
                console.log(`tx - ${chainInfo.explorer}${supplyTx.hash}`);
                await supplyTx.wait(3);

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                console.log(`Withdraw Liquidity`);
                const withdrawTx = await account.sendTransaction({
                    to: zkdxAddress,
                    data: `0x1e9a6950000000000000000000000000176211869ca2b568f2a7d4ee941e073a821ee1ff000000000000000000000000000000000000000000000000de0b6b3a76400000`,
                    ...txparams,
                });
                console.log(`tx - ${chainInfo.explorer}${withdrawTx.hash}`);
                await withdrawTx.wait(3)

                console.log(`Swap back to ETH`);
                
                await hre.run("syncSwapTrade", {
                    all: true,
                    fromToken: usdcTokenAddress,
                    ...taskArgs,
                });

                console.log(`\nLaunch tasks verification`);
                await hre.run("intractVerifyWave7Trading", {
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
