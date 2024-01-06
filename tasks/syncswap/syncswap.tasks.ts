import { BigNumber, ethers, utils } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { task, types } from "hardhat/config";
import { ERC20, ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";
import { SyncSwapClassicPoolAbi, SyncSwapStablePoolAbi } from "./SyncsSwapContractsAbi";
import { getSyncSwapContracts } from "./SyncsSwapHeplers";

task("syncSwapTrade", "Swap tokens on Syncswap")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("minBalance", "Minimum balance after using all funds", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addParam("fromToken", "Token to sell", "0x0000000000000000000000000000000000000000", types.string)
    .addParam("toToken", "Token to buy", "0x0000000000000000000000000000000000000000", types.string) // ETH 0x0000000000000000000000000000000000000000
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
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (![ChainId.zkSyncEra, ChainId.lineaMainnet, ChainId.scrollMainnet].includes(chainInfo.chainId)) {
            console.log(`Task not supported at ${chainInfo.chainName}`);
            return;
        }

        const syncSwapContracts = getSyncSwapContracts(network.chainId, hre.ethers.provider);

        if (!syncSwapContracts) {
            console.log(`Unsupported network`);
            return;
        }

        const fromNativeEth = taskArgs.fromToken == ethers.constants.AddressZero;
        const toNativeEth = taskArgs.toToken == ethers.constants.AddressZero;

        let sellTokenContract: ERC20 = fromNativeEth
            ? ERC20__factory.connect(chainInfo.wethAddress, hre.ethers.provider)
            : ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
        let sellTokenDecimals: number = fromNativeEth ? 18 : await sellTokenContract.decimals();

        // console.log(`sell token ${sellTokenContract.address}`);

        let buyTokenContract: ERC20 = toNativeEth
            ? ERC20__factory.connect(chainInfo.wethAddress, hre.ethers.provider)
            : ERC20__factory.connect(taskArgs.toToken, hre.ethers.provider);
        let buyTokenDecimals: number = toNativeEth ? 18 : await buyTokenContract.decimals();

        // console.log(`buy token ${buyTokenContract.address}`);

        // Gets the address of the ETH/DAI Classic Pool.
        // wETH is used internally by the pools.
        let poolAddress: string = await syncSwapContracts.classicPoolFactoryContract.getPool(
            sellTokenContract.address,
            buyTokenContract.address
        );
        let poolAbi = SyncSwapClassicPoolAbi;

        // Checks whether the pool exists.
        if (poolAddress === ethers.constants.AddressZero) {
            poolAddress = syncSwapContracts.stablePoolFactoryContract.getPool(
                sellTokenContract.address,
                buyTokenContract.address
            );
            poolAbi = SyncSwapStablePoolAbi;

            if (poolAddress === ethers.constants.AddressZero) {
                console.log("Pool not exists");
                return;
            }
        }

        // console.log(`poolAddress ${poolAddress}`);

        // Gets the reserves of the pool.
        const pool: ethers.Contract = new ethers.Contract(poolAddress, poolAbi, hre.ethers.provider);
        const reserves: [BigNumber, BigNumber] = await pool.getReserves(); // Returns tuple (uint, uint)

        // Sorts the reserves by token addresses.
        const [reserveETH, reserveDAI] =
            sellTokenContract.address < buyTokenContract.address ? reserves : [reserves[1], reserves[0]];

        // Constructs the swap paths with steps.
        // Determine withdraw mode, to withdraw native ETH or wETH on last step.
        // 0 - vault internal transfer
        // 1 - withdraw and unwrap to naitve ETH
        // 2 - withdraw and wrap to wETH
        const withdrawMode = 1; // 1 or 2 to withdraw to user's wallet

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

                await waitForGasPrice({ maxPriceInGwei: taskArgs.gasPrice, provider: hre.ethers.provider });

                console.log(
                    `Swap ${utils.formatUnits(amount, sellTokenDecimals)} ${
                        fromNativeEth ? "ETH" : await sellTokenContract.symbol()
                    } to ${toNativeEth ? "ETH" : await buyTokenContract.symbol()}`
                );

                const swapData: string = defaultAbiCoder.encode(
                    ["address", "address", "uint8"],
                    [sellTokenContract.address, account.address, withdrawMode] // tokenIn, to, withdraw mode
                );

                // We have only 1 step.
                const steps = [
                    {
                        pool: poolAddress,
                        data: swapData,
                        callback: ethers.constants.AddressZero, // we don't have a callback
                        callbackData: "0x",
                    },
                ];

                // If we want to use the native ETH as the input token,
                // the `tokenIn` on path should be replaced with the zero address.
                // Note: however we still have to encode the wETH address to pool's swap data.
                const tokenInAddress = fromNativeEth
                    ? ethers.constants.AddressZero
                    : sellTokenContract.address;

                // We have only 1 path.
                const paths = [
                    {
                        steps: steps,
                        tokenIn: tokenInAddress,
                        amountIn: amount,
                    },
                ];

                // Gets the router contract.

                // Note: checks approval for ERC20 tokens.
                if (!fromNativeEth) {
                    let tokenContract = ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
                    const allowance: BigNumber = await tokenContract.allowance(
                        account.address,
                        syncSwapContracts.routerContract.address
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
                            .approve(syncSwapContracts.routerContract.address, amount, { ...txParams });
                        console.log(`Approve tx: ${chainInfo.explorer}${approveTxHash.hash}`);
                        await approveTxHash.wait();
                    }
                }
                // The router will handle the deposit to the pool's vault account.
                const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const response = await syncSwapContracts.routerContract.connect(account).swap(
                    paths, // paths
                    0, // amountOutMin // Note: ensures slippage here
                    BigNumber.from(Math.floor(Date.now() / 1000)).add(300), // deadline // 5 minutes
                    {
                        value: fromNativeEth ? amount : undefined,
                        ...txParams,
                    }
                );

                console.log(`Swap tx: ${chainInfo.explorer}${response.hash}`);
                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process address - ${account.address}`, error);
            }
        }
    });
