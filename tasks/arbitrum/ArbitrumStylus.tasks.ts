import { BigNumber, Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts, populateTxnParams } from "../../utils/Utils";
import { ERC20__factory } from "../../typechain-types";

export const ArbitrumTasks = {
    arbitrumBridge: "arbitrumBridge",
    arbitrumClaimDrop: "arbitrumClaimDrop",
};

task("arbitrumSepoliaBridge", "Bridge ETH Sepolia to arbitrum sepolia network")
    .addParam("amount", "Amount of ETH", undefined, types.float)
    .addParam("dust", "Dust percentage", undefined, types.float, true)
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.ethereumSepolia].includes(currentNetwork.chainId)) {
            console.log("Bridge only from Ethereum Sepolia network!");
            return;
        }

        const sepoliaBridgeAddress = "0xaAe29B0366299461418F5324a79Afc425BE5ae21";

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const bridgeContract = new Contract(
            sepoliaBridgeAddress,
            ["function depositEth() payable"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount.toString());
                }

                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                console.log(`Sending ${utils.formatEther(amount)} ETH from ${account.address} ...`);

                const txParams = populateTxnParams({signer: account, chain: chainInfo})
                const ethDepositTxResponse = await bridgeContract.connect(account).depositEth({
                    value: amount,
                    ...txParams
                });

                console.log(
                    `Deposit txn: ${chainInfo.explorer}${ethDepositTxResponse.hash}`
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
        console.log("\nAll funds sent across the bridge");
    });

task("arbitrumStylusBridge", "Bridge ETH to arbitrum stylus network")
    .addParam("amount", "Amount of ETH", undefined, types.float)
    .addParam("dust", "Dust percentage", undefined, types.float, true)
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.arbbitrumSepolia].includes(currentNetwork.chainId)) {
            console.log("Bridge only from Arbitrum Sepolia network!");
            return;
        }

        const stylusBridgeAddress = "0xe1e3b1CBaCC870cb6e5F4Bdf246feB6eB5cD351B";

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const bridgeContract = new Contract(
            stylusBridgeAddress,
            ["function depositEth() payable"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
              let amount: BigNumber;
              if (taskArgs.dust) {
                amount = utils.parseEther(
                  addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                  );
                } else {
                  amount = utils.parseEther(taskArgs.amount.toString());
                }
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                console.log(`Sending ${utils.formatEther(amount)} ETH from ${account.address} ...`);
                
                const ethDepositTxResponse = await bridgeContract.connect(account).depositEth({
                  value: amount
              });

                console.log(
                    `Deposit txn: ${chainInfo.explorer}${ethDepositTxResponse.hash}\n`
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
        console.log("All funds sent across the bridge");
    });

/* task("arbitrumStylusContractInteractions", "Interact with erc-20 contracts")
    .addParam("delay", "Add delay", undefined, types.float, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.baseMainnet) {
            throw new Error("Task allowed only on Base chain");
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const erc20Contracts = [
            // ERC20__factory.connect("0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca", hre.ethers.provider),
        ];

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                for (const erc20 of erc20Contracts) {
                    const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                    const tx = await erc20
                        .connect(account)
                        .approve(erc20.address, BigNumber.from(0), { ...txParams });
                    console.log(`Approve ${await erc20.symbol()} tx ${chainInfo.explorer}${tx.hash}`);
                    await delay(0.1);
                }

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
    }); */