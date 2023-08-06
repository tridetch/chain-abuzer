import { Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts } from "../../utils/Utils";

task("holographMintHFWCnft", "Mint holograph How far we've come NFT")
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
        const targetAddress = "0x6d6768a0b24299bede0492a4571d79f535c330d8";

        if (
            ![ChainId.arbitrumMainnet, ChainId.optimismMainnet, ChainId.binanceMainnet].includes(
                currentNetwork.chainId
            )
        ) {
            console.log(` Task supported only on Arbitrum, Optimism, Polygon, Binance Smart Chain!`);
            return;
        }

        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 numberOfTokens) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        var priorityFee = undefined;
        if (chainInfo.chainId == ChainId.optimismMainnet) {
            priorityFee = ethers.utils.parseUnits("2", "wei");
        }
        for (const account of accounts) {
            try {
                const tx = await mintContract.connect(account).purchase(1, {
                    maxPriorityFeePerGas: priorityFee,
                });

                console.log(
                    `\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${chainInfo.explorer}${
                        tx.hash
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

task("holographMintAzuroCnft", "Mint holograph How far we've come NFT")
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
        const targetAddress = "0xb6432d111bc2a022048b9aea7c11b2d627184bdd";

        if (
            ![ChainId.arbitrumMainnet, ChainId.optimismMainnet, ChainId.binanceMainnet, ChainId.poligonMainnet ].includes(
                currentNetwork.chainId
            )
        ) {
            console.log(` Task supported only on Arbitrum, Optimism, Polygon, Binance Smart Chain!`);
            return;
        }

        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 numberOfTokens) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        var priorityFee = undefined;
        if (chainInfo.chainId == ChainId.optimismMainnet) {
            priorityFee = ethers.utils.parseUnits("2", "wei");
        }
        for (const account of accounts) {
            try {
                var gasPrice = undefined;
                if (chainInfo.chainId == ChainId.poligonMainnet) {
                    gasPrice = await account.getGasPrice();
                }
                const tx = await mintContract.connect(account).purchase(1, {
                    gasPrice: gasPrice,
                    maxPriorityFeePerGas: priorityFee,
                });

                console.log(
                    `\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${chainInfo.explorer}${
                        tx.hash
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

task("holographMintNft", "Mint holograph NFT by contract address")
    .addParam("contractAddress", "Contract address of nft", undefined, types.string, true)
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
        const targetAddress = taskArgs.contractAddress;

        if (
            ![ChainId.arbitrumMainnet, ChainId.optimismMainnet, ChainId.binanceMainnet, ChainId.poligonMainnet ].includes(
                currentNetwork.chainId
            )
        ) {
            console.log(` Task supported only on Arbitrum, Optimism, Polygon, Binance Smart Chain!`);
            return;
        }

        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 numberOfTokens) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        var priorityFee = undefined;
        if (chainInfo.chainId == ChainId.optimismMainnet) {
            priorityFee = ethers.utils.parseUnits("1", "wei");
        }
        for (const account of accounts) {
            try {
                var gasPrice = undefined;
                if (chainInfo.chainId == ChainId.poligonMainnet) {
                    gasPrice = await account.getGasPrice();
                }
                const tx = await mintContract.connect(account).purchase(1, {
                    gasPrice: gasPrice,
                    maxPriorityFeePerGas: priorityFee,
                });

                console.log(
                    `\n#${accounts.indexOf(account)} Address: ${account.address}\ntxn: ${chainInfo.explorer}${
                        tx.hash
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
