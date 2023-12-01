import { BigNumber, ethers } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

export const ACCOUNT_DELAY = 2;
export const TASK_DELAY = 0.5;

task("routeIntractWave4Lending", "Make some developer tasks")
    .addParam("supplyAmount", "Amount of tokens to swap", 0.0178, types.float, true)
    .addParam("borrowAmount", "Amount of tokens to swap", 0.0126, types.float, true)
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.lineaMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at Linea mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);

        // const USDC_TOKEN_ADDRESS = "0x176211869cA2b568f2A7D4EE941E073a821EE1ff";
        // const usdcTokenContract = ERC20__factory.connect(USDC_TOKEN_ADDRESS, hre.ethers.provider);
        // const usdcDecimals = await usdcTokenContract.decimals();

        const ETH_BORROW_AMOUNT = ethers.utils.parseEther(taskArgs.borrowAmount);

        const layerBankEthAddress = "0xc7D8489DaE3D2EbEF075b1dB2257E2c231C9D231";
        const layerBankEthContract = ERC20__factory.connect(layerBankEthAddress, hre.ethers.provider);

        // const layerBankUsdcAddress = "0x2aD69A0Cf272B9941c7dDcaDa7B0273E9046C4B0";
        // const layerBankUsdcContract = ERC20__factory.connect(layerBankUsdcAddress, hre.ethers.provider);

        const layerBankLendingAddress = "0x009a0b7c38b542208936f1179151cd08e2943833";
        const layerBankLendingContract = new ethers.Contract(layerBankLendingAddress, [
            "function supply(address gToken, uint256 uAmount) payable",
            "function enterMarkets(address[] gTokens)",
            "function borrow(address gToken,uint256 amount)",
            "function repayBorrow(address gToken,uint256 amount) payable",
            "function redeemToken(address gToken,uint256 gAmount)",
            "function redeemUnderlying(address gToken,uint256 uAmount)",
        ]);

        const GAS_LIMIT = 500_000;

        console.log(`\n--//-- Linea Defi Voyage: Wave 4 Lending --//--\n`);

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

                const balance = await account.getBalance();

                if (balance < BigNumber.from(0.02)) {
                    console.log(
                        `Skip account with low balance. Min - 0.02 ETH Actual balance - ${ethers.utils.formatEther(
                            balance
                        )}`
                    );
                    return;
                }

                const amount = ethers.utils.parseEther(taskArgs.supplyAmount.toString());

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                console.log(`Supply ETH`);
                const supplyTx = await layerBankLendingContract
                    .connect(account)
                    .supply(layerBankEthAddress, amount, { value: amount, gasLimit: GAS_LIMIT, ...txparams });
                console.log(`tx - ${chainInfo.explorer}${supplyTx.hash}`);

                await supplyTx.wait(2);

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                console.log(`Enable as collateral`);
                const enableCollateralTx = await layerBankLendingContract
                    .connect(account)
                    .enterMarkets([layerBankEthAddress], { gasLimit: GAS_LIMIT, ...txparams });
                console.log(`tx - ${enableCollateralTx.hash}`);
                await enableCollateralTx.wait(2);

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                console.log(`Borrow ETH`);
                const borrowTx = await layerBankLendingContract
                    .connect(account)
                    .borrow(layerBankEthAddress, ETH_BORROW_AMOUNT, {
                        gasLimit: 800_000,
                        ...txparams,
                    });
                console.log(`tx - ${chainInfo.explorer}${borrowTx.hash}`);
                await borrowTx.wait(2);

                // console.log(`Approve USDC`);
                // await hre.run("approve", {
                //     gasLimit: GAS_LIMIT,
                //     ...taskArgs,
                //     tokenAddress: USDC_TOKEN_ADDRESS,
                //     spenderAddress: layerBankUsdcAddress,
                //     amount: 25,
                // });
                // await delay(0.02);

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                console.log(`Repay ETH`);
                const repayTx = await layerBankLendingContract
                    .connect(account)
                    .repayBorrow(layerBankEthAddress, ETH_BORROW_AMOUNT, {
                        value: ETH_BORROW_AMOUNT,
                        gasLimit: GAS_LIMIT,
                        ...txparams,
                    });
                console.log(`tx - ${chainInfo.explorer}${repayTx.hash}`);
                await repayTx.wait(2);

                var txparams = await populateTxnParams({ signer: account, chain: chainInfo });
                console.log(`Withdraw`);
                const redeemTokenTx = await layerBankLendingContract
                    .connect(account)
                    .redeemUnderlying(
                        layerBankEthAddress,
                        await layerBankEthContract.balanceOf(account.address),
                        { gasLimit: GAS_LIMIT, ...txparams }
                    );
                console.log(`tx - ${chainInfo.explorer}${redeemTokenTx.hash}`);

                console.log(`\nLaunch tasks verification`);
                await delay(0.5);

                console.log(`Core tasks verification`);
                await hre.run("intractVerifyWave4LendingCore", {
                    ...taskArgs,
                    layerbank: true,
                });

                console.log(`Repay tasks verification`);
                await hre.run("intractVerifyWave4LendingRepay", {
                    ...taskArgs,
                    layerbank: true,
                });
            } catch (error) {
                console.error(`\nROUTE FAILED FOR ACCOUNT ${account.address}`);
                console.log(error);
            }
        }
    });
