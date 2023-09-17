import { ChainId as JoeChainId, Token, WNATIVE } from "@traderjoe-xyz/sdk";
import { BigNumber, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, getAccounts } from "../../utils/Utils";

export const OneInchTasks = {
    TraderJoeSwap: "TraderJoeSwap",
};

task("1inchSwap", "Swap tokens on 1inch")
    .addParam("amount", "Amount of tokens to swap", undefined, types.float, true)
    .addFlag("all", "Use all balance of tokens")
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addParam("delay", "Add delay", undefined, types.int, true)
    .addParam("fromToken", "Token to sell", undefined, types.string)
    .addParam("toToken", "Token to buy", undefined, types.string)
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
        const currentNetwork = getChainInfo(network.chainId);

        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Route awailable only at arbitrum mainnet");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        let WETH = WNATIVE[JoeChainId.ARBITRUM_ONE];

        const sellToken = ERC20__factory.connect(taskArgs.fromToken, hre.ethers.provider);
        const sellTokenDecimals = await sellToken.decimals();
        const sellTokenName = await sellToken.name();
        const sellTokenSymbol = await sellToken.symbol();

        const joeSellToken = new Token(
            JoeChainId.ARBITRUM_ONE,
            sellToken.address,
            sellTokenDecimals,
            sellTokenSymbol,
            sellTokenName
        );

        const buyToken = ERC20__factory.connect(taskArgs.toToken, hre.ethers.provider);
        const buyTokenDecimals = await buyToken.decimals();
        const buyTokenName = await buyToken.name();
        const buyTokenSymbol = await buyToken.symbol();

        const joeBuyToken = new Token(
            JoeChainId.ARBITRUM_ONE,
            buyToken.address,
            buyTokenDecimals,
            buyTokenSymbol,
            buyTokenName
        );

        const BASES = createBaseTokens();

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.all) {
                    amount = await sellToken.connect(account).balanceOf(account.address);
                } else if (taskArgs.dust) {
                    amount = utils.parseUnits(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString(),
                        sellTokenDecimals
                    );
                } else {
                    amount = utils.parseUnits(taskArgs.amount.toString(), sellTokenDecimals);
                }

                if (amount.isZero()) {
                    console.log(`Skip address with zero balance ${account.address}`);
                    continue;
                }

                const walletAddress = account.address;
                console.log(`Address ${walletAddress}`);
            } catch (error) {
                console.log(`Error when process address - ${account.address}`, error);
            }
        }

        function createBaseTokens() {
            const USDC = new Token(
                JoeChainId.ARBITRUM_ONE,
                "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
                6,
                "USDC",
                "USD Coin"
            );
            const USDT = new Token(
                JoeChainId.ARBITRUM_ONE,
                "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
                6,
                "USDT",
                "Tether USD"
            );

            // declare bases used to generate trade routes
            const BASES = [WETH, USDC, USDT];
            return BASES;
        }
    });
