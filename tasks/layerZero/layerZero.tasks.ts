import { ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId } from "../../utils/ChainInfoUtils";
import { delay, getAccounts } from "../../utils/Utils";

task("l0BuyGethForAeth", "Buy goelri ETH for arb ETH")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const targetAddress = "0x0a9f824c05a74f577a536a8a0c673183a872dff4";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.arbitrumMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at Arbitrum mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const testnetBridgeContract = new ethers.Contract(
            targetAddress,
            [
                "function swapAndBridge(uint256 amountIn,uint256 amountOutMin,uint16 dstChainId,address to,address refundAddress,address zroPaymentAddress,bytes adapterParams) payable",
            ],
            hre.ethers.provider
        );

        const value = utils.parseEther("0.000265");
        const amountIn = utils.parseEther("0.0001");
        const amountOut = utils.parseEther("1");
        const dstChainId = 154;

        for (const account of accounts) {
            try {
                const claimTx = await testnetBridgeContract
                    .connect(account)
                    .swapAndBridge(
                        amountIn,
                        amountOut,
                        dstChainId,
                        account.address,
                        account.address,
                        "0x0000000000000000000000000000000000000000",
                        [],
                        { value: value }
                    );

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${claimTx.hash}\n`);

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

task("mintOmnichainAdventuresNft", "Mint Omni-X Omnichain Adventures nft")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const targetAddress = "0xd12999440402d30f69e282d45081999412013844";
        const currentNetwork = await hre.ethers.provider.getNetwork();

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at optimism mainnet!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const mintContract = new ethers.Contract(
            targetAddress,
            ["function mint(uint256 _nbTokens)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                const mintTx = await mintContract.connect(account).mint(20, {
                    maxPriorityFeePerGas: ethers.utils.parseUnits("4", "wei"),
                });

                console.log(`Task result:\nAddress: ${account.address}\ntxn: ${mintTx.hash}\n`);

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
