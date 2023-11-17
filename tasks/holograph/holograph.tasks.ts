import { Contract, ethers } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts, populateTxnParams } from "../../utils/Utils";

task("holographMintHFWCnft", "Mint holograph How far we've come NFT")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
    .addFlag("randomize", "Randomize accounts execution order")
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
            ![
                ChainId.arbitrumMainnet,
                ChainId.optimismMainnet,
                ChainId.binanceMainnet,
                ChainId.poligonMainnet,
            ].includes(currentNetwork.chainId)
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

task("holographMintSuperPositionNft", "Mint holograph Super Position NFT")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0x3b2d8bb062D121619aCff4e01eCe2690789E919f";

        if (
            ![
                ChainId.arbitrumMainnet,
                ChainId.optimismMainnet,
                ChainId.binanceMainnet,
                ChainId.poligonMainnet,
            ].includes(currentNetwork.chainId)
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
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: ethers.utils.parseEther("0.000059401287374237"),
                    ...txParams,
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

task("holographMintWhereWDWGFPositionNft", "Mint holograph WDWGF NFT")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0xcb0bb5d835a47584fda53f57bb4193b28d2738db";

        if (
            ![
                ChainId.arbitrumMainnet,
                ChainId.optimismMainnet,
                ChainId.binanceMainnet,
                ChainId.poligonMainnet,
            ].includes(currentNetwork.chainId)
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
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: ethers.utils.parseEther("0.000059401287374237"),
                    ...txParams,
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

task("holographMintLayerZeroNft", "Mint holograph Layer Zero NFT")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0x2c4bd4e25d83285f417e26a44069f41d1a8ad0e7";

        if (![ChainId.poligonMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Polygon!`);
            return;
        }

        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 numberOfTokens) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: ethers.utils.parseEther("0.191523607137533"),
                    ...txParams,
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

task("holographMint###Nft", "Mint ### NFT")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0x052790f7f5b15f9a2fa684fd3ecd657e3cd9029c";

        if (![ChainId.optimismMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Optimism!`);
            return;
        }

        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 numberOfTokens) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: ethers.utils.parseEther("0.000064333257281"),
                    ...txParams,
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
    .addFlag("randomize", "Randomize accounts execution order")
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
            ![
                ChainId.arbitrumMainnet,
                ChainId.optimismMainnet,
                ChainId.binanceMainnet,
                ChainId.poligonMainnet,
            ].includes(currentNetwork.chainId)
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

        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await mintContract.connect(account).purchase(1, {
                    ...txParams,
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

task("holographMintForgetAboutTimeNft", "Mint Forget About Time NFT")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0xA2962687e7b4A7610E84E857959FE559239FdFCF";

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Zora!`);
            return;
        }

        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 numberOfTokens) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: ethers.utils.parseEther("0.000042000000000001"),
                    ...txParams,
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

task("holographMintDreamTravelNft", "Mint Dream Travel NFT")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0x7d213E53953a8dDe1dD08413699fEaC0292685E6";

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Zora!`);
            return;
        }

        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 numberOfTokens) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: ethers.utils.parseEther("0.000042000000000001"),
                    ...txParams,
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

    task("holographMintMercyRougeNft", "Mint Mercy ROugE NFT")
    .addParam("delay", "Add random delay", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const targetAddress = "0x0fc96CBf26e631005CCa26903aE57e7cF8eccAf2";

        if (![ChainId.zoraMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Zora!`);
            return;
        }

        let mintContract = new Contract(
            targetAddress,
            ["function purchase(uint256 numberOfTokens) payable"],
            hre.ethers.provider
        );
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            try {
                var txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                const tx = await mintContract.connect(account).purchase(1, {
                    value: ethers.utils.parseEther("0.000042000000000001"),
                    ...txParams,
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
