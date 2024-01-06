import { ethers } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

task("routeIntractWave5Liquidity", "Wave 5 onchain activity and task verifications")
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

        const GAS_LIMIT = 400_000;

        console.log(`\n--//-- Linea Defi Voyage: Wave 5 Liquidity --//--\n`);

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

                const minAmount = ethers.utils.parseEther("0.0137");
                const amount = ethers.utils.parseEther("0.0115");

                if (balance < minAmount) {
                    console.log(
                        `Skip account with low balance. Min - ${ethers.utils.formatEther(
                            minAmount
                        )}0.0137 ETH Actual balance - ${ethers.utils.formatEther(balance)}`
                    );
                    return;
                }

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                console.log(`Add Liquidity`);
                const supplyTx = await account.sendTransaction({
                    to: "0x1d0188c4b276a09366d05d6be06af61a73bc7535",
                    data: `0xd3115a8a0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000040000000000000000000000003f006b0493ff32b33be2809367f5f6722cb84a7b000000000000000000000000cc22f6aa610d1b2a0e89ef228079cb3e1831b1d10200000000000000000000011d312eedd57e8d43bcb6369e4b8f02d3c18aaf13eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000004800000000000000000000000000000000000000000000000000000000000000560040000000000000000000000${account.address.slice(
                        2
                    )}000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010300000000000000000000000000000000000000000000000028db3066eac00000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000040000000000000000000000${account.address.slice(
                        2
                    )}000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000103000000000000000000000000000000ffffffffffffffffffd724cf99154000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000007573f3284c91858450eb57c1f46c7354d901228d000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000002000100000000000000000000000000007fffffffffffffffffffffffffffffff030200000000000000000000000000007fffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000001d312eedd57e8d43bcb6369e4b8f02d3c18aaf13000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000002000200000000000000000000000000007fffffffffffffffffffffffffffffff020100000000000000000000000000007fffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000102010000000000000000000000000000fffffffffffffffffffffffffe7f7580000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000009582b6ad01b308edac14cb9bdf21e7da698b5edd000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000020101000000000000000000000000000000000000000000000000000000000000020200000000000000000000000000007fffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000`,
                    value: amount,
                    gasLimit: GAS_LIMIT,
                    ...txparams,
                });
                console.log(`tx - ${chainInfo.explorer}${supplyTx.hash}`);
                await supplyTx.wait(3);

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                console.log(`Withdraw Liquidity`);
                const withdrawTx = await account.sendTransaction({
                    to: "0x1d0188c4b276a09366d05d6be06af61a73bc7535",
                    data: `0xd3115a8a0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000040000000000000000000000003f006b0493ff32b33be2809367f5f6722cb84a7b000000000000000000000000cc22f6aa610d1b2a0e89ef228079cb3e1831b1d10200000000000000000000011d312eedd57e8d43bcb6369e4b8f02d3c18aaf13eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000003800100000000000000000000009582b6ad01b308edac14cb9bdf21e7da698b5edd000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000002010100000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000fffffffffffffffffffffffffe6b94fb000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000001d312eedd57e8d43bcb6369e4b8f02d3c18aaf13000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000002000100000000000000000000000000007fffffffffffffffffffffffffffffff020200000000000000000000000000007fffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000007573f3284c91858450eb57c1f46c7354d901228d000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000002000200000000000000000000000000007fffffffffffffffffffffffffffffff030100000000000000000000000000007fffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000103010000000000000000000000000000ffffffffffffffffffda04fe3b2cfcac00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000`,
                    gasLimit: GAS_LIMIT,
                    ...txparams,
                });
                console.log(`tx - ${chainInfo.explorer}${withdrawTx.hash}`);

                console.log(`\nLaunch tasks verification`);
                await delay(0.2);

                await hre.run("intractVerifyWave5LiquidityCore", {
                    ...taskArgs,
                });
                await delay(0.01);
                await hre.run("intractVerifyWave5LiquidityLst", {
                    ...taskArgs,
                });
                await delay(0.01);
                await hre.run("intractVerifyWave5LiquidityVe", {
                    ...taskArgs,
                });
                await delay(0.01);
                await hre.run("intractVerifyWave5LiquiditySingle", {
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

task("routeIntractWave5ClaimAll", "Wave 5 and task claim")
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

        console.log(`\n--//-- Linea Defi Voyage: Wave 5 Liquidity --//--\n`);

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
                console.log(`### ${accounts.indexOf(account)} Address ${account.address} ###`);

                const delayTime = taskArgs.delay;
                taskArgs.delay = undefined;

                console.log(`\nLaunch tasks verification`);

                await hre.run("intractClaimWave5LiquidityCore", {
                    ...taskArgs,
                });
                await delay(0.01);
                await hre.run("intractClaimWave5LiquidityLst", {
                    ...taskArgs,
                });
                await delay(0.01);
                await hre.run("intractClaimWave5LiquidityVe", {
                    ...taskArgs,
                });
                await delay(0.01);
                await hre.run("intractClaimWave5LiquiditySingle", {
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

task("intractWave5LiquidityWithdraw", "WithdrawLiquidity")
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

        const GAS_LIMIT = 400_000;

        console.log(`\n--//-- Linea Defi Voyage: Wave 5 Liquidity Withdraw --//--\n`);

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

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                console.log(`Withdraw Liquidity`);
                const withdrawTx = await account.sendTransaction({
                    to: "0x1d0188c4b276a09366d05d6be06af61a73bc7535",
                    data: `0xd3115a8a0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000040000000000000000000000003f006b0493ff32b33be2809367f5f6722cb84a7b000000000000000000000000cc22f6aa610d1b2a0e89ef228079cb3e1831b1d10200000000000000000000011d312eedd57e8d43bcb6369e4b8f02d3c18aaf13eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000003800100000000000000000000009582b6ad01b308edac14cb9bdf21e7da698b5edd000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000002010100000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000fffffffffffffffffffffffffe6f97e5000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000001d312eedd57e8d43bcb6369e4b8f02d3c18aaf13000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000002000100000000000000000000000000007fffffffffffffffffffffffffffffff020200000000000000000000000000007fffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000007573f3284c91858450eb57c1f46c7354d901228d000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000002000200000000000000000000000000007fffffffffffffffffffffffffffffff030100000000000000000000000000007fffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000103010000000000000000000000000000ffffffffffffffffffd99162ff5368a100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000`,
                    gasLimit: GAS_LIMIT,
                    ...txparams,
                });
                console.log(`tx - ${chainInfo.explorer}${withdrawTx.hash}`);

                if (delayTime != undefined) {
                    await delay(delayTime);
                }
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }
    });

task("intractWave5LiquidityVerify", "")
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

        console.log(`\n--//-- Linea Defi Voyage: Wave 5 Liquidity Verify --//--\n`);

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

                console.log(`\nLaunch tasks verification`);

                await hre.run("intractVerifyWave5LiquidityCore", {
                    ...taskArgs,
                });
                await delay(0.01);
                await hre.run("intractVerifyWave5LiquidityLst", {
                    ...taskArgs,
                });
                await delay(0.01);
                await hre.run("intractVerifyWave5LiquidityVe", {
                    ...taskArgs,
                });
                await delay(0.01);
                await hre.run("intractVerifyWave5LiquiditySingle", {
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
