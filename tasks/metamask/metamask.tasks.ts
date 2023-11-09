import axios from "axios";
import { BigNumber, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20, ERC20__factory } from "../../typechain-types";
import { getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams } from "../../utils/Utils";
import { MetamaskBridgeInfo } from "./metamaskHelpers";

task("metamaskBridge", "Bridge tokens with metamask bridge")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("slippage", "Slippage", 0.5, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("toChainId", "Destination chain id", undefined, types.int)
    .addParam("fromToken", "Token to sell", "0x0000000000000000000000000000000000000000", types.string)
    .addParam("toToken", "Token to buy", "0x0000000000000000000000000000000000000000", types.string) // ETH 0x0000000000000000000000000000000000000000
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

        const fromNativeEth = taskArgs.fromToken == ethers.constants.AddressZero;
        const toNativeEth = taskArgs.toToken == ethers.constants.AddressZero;

        let sellTokenContract: ERC20 = fromNativeEth
            ? ERC20__factory.connect(chainInfo.wethAddress, hre.ethers.provider)
            : ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
        let sellTokenDecimals: number = fromNativeEth ? 18 : await sellTokenContract.decimals();

        let buyTokenContract: ERC20 = toNativeEth
            ? ERC20__factory.connect(chainInfo.wethAddress, hre.ethers.provider)
            : ERC20__factory.connect(taskArgs.toToken, hre.ethers.provider);
        let buyTokenDecimals: number = toNativeEth ? 18 : await buyTokenContract.decimals();

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    const minBalance = utils.parseEther(addDust({ amount: taskArgs.minBalance }).toString());
                    amount = fromNativeEth
                        ? (await account.getBalance()).sub(minBalance)
                        : await sellTokenContract.balanceOf(account.address);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.addDust }).toString(),
                        sellTokenDecimals
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString(), sellTokenDecimals);
                }

                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                if (amount.isZero()) {
                    console.log(`Skip address with zero balance ${account.address}`);
                    continue;
                }

                //Get quote
                console.log(`Request Metamask bridge api for route...`);
                
                const bridgeData: MetamaskBridgeInfo = (
                    await axios.get(
                        `https://bridge.api.cx.metamask.io/getQuote?walletAddress=${
                            account.address
                        }&srcChainId=${chainInfo.chainId}&destChainId=${taskArgs.toChainId}&srcTokenAddress=${
                            taskArgs.fromToken
                        }&destTokenAddress=${
                            taskArgs.toToken
                        }&srcTokenAmount=${amount.toString()}&slippage=${taskArgs.slippage.toString()}&aggIds=lifi,socket,squid&insufficientBal=false`
                    )
                ).data[0];

                if (!bridgeData) {
                    console.log(`No routes found for bridge`);
                    continue;
                }

                console.log(`Bridge info:`);
                console.log(`Amount ${ethers.utils.formatUnits(amount, sellTokenDecimals)}`);
                console.log(
                    `Estimated processing time in seconds ${bridgeData.estimatedProcessingTimeInSeconds}`
                );

                let routeLog = "Route";
                for (const step of bridgeData.quote.steps) {
                    routeLog = routeLog + ` -> ${step.action} with ${step.protocol.displayName} chainId ${step.destChainId}`;
                }
                console.log(routeLog);

                // checks approval for ERC20 tokens.
                if (!fromNativeEth) {
                    let tokenContract = ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
                    const allowance: BigNumber = await tokenContract.allowance(
                        account.address,
                        bridgeData.trade.to
                    );

                    if (allowance.lt(amount)) {
                        console.log(
                            `Swap amount - ${utils.formatUnits(
                                amount,
                                sellTokenDecimals
                            )} ${await tokenContract.symbol()} greater then allowance - ${utils.formatUnits(
                                allowance
                            )}\nSending approve txn...`
                        );

                        // Send a transaction and get its hash
                        const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                        const approveTxHash = await tokenContract
                            .connect(account)
                            .approve(bridgeData.trade.to, amount, { ...txParams });
                        console.log(`Approve tx: ${chainInfo.explorer}${approveTxHash.hash}`);
                        await approveTxHash.wait();
                    }
                }

                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const response = await account.sendTransaction({
                    to: bridgeData.trade.to,
                    data: bridgeData.trade.data,
                    value: fromNativeEth ? amount : undefined,
                    gasLimit: bridgeData.trade.gasLimit,
                    ...txParams,
                });

                console.log(`Bridge tx: ${chainInfo.explorer}${response.hash}`);
                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process address - ${account.address}`, error);
            }
        }
    });
