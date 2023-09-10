import { BigNumber, Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20, ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts } from "../../utils/Utils";

task("scrollDeposit", "Bridge ETH to scroll")
    .addParam("amount", "Amount to bridge", undefined, types.float, true)
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId)

        if (![ChainId.ethereumGoerli, ChainId.ethereumSepolia].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Ethereum testnets!`);
            return;
        }

        let contractAddress: string = "0x13FBE0D0e5552b8c9c4AE9e2435F38f37355998a";

        const bridgeContract = new Contract(
            contractAddress,
            ["function depositETH(uint256 ,uint256 _gasLimit) payable"],
            hre.ethers.provider
        );

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        let gasLimit: BigNumber = utils.parseEther("0.000168");

        for (const account of accounts) {
            try {
                let amount: BigNumber = utils.parseEther(taskArgs.amount.toString());

                const tx = await bridgeContract.connect(account).depositETH(amount, 168000, {
                    value: amount.add(gasLimit),
                });

                console.log(
                    `Task result:\nAddress: #${accounts.indexOf(account)} ${account.address}\ntxn: ${chainInfo.explorer}${
                        tx.hash
                    }\n`
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

task("scrollWithdraw", "Withdraw ETH from scroll")
    .addParam("delay", "Add random delay", undefined, types.int, true)
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

        if (![ChainId.scrollSepolia, ChainId.scrollAlphaGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on Scroll!`);
            return;
        }

        let contractAddress: string = "0x9aD3c5617eCAa556d6E166787A97081907171230";

        const bridgeContract = new Contract(
            contractAddress,
            ["function withdrawETH(uint256 ,uint256 _gasLimit) payable"],
            hre.ethers.provider
        );

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                let amount: BigNumber = utils.parseEther(taskArgs.amount.toString());

                const tx = await bridgeContract.connect(account).depositETH(amount, 0, {
                    value: amount,
                });

                console.log(
                    `Task result:\nAddress: #${accounts.indexOf(account)} ${account.address}\ntxn: ${
                        chainInfo.explorer
                    }${tx.hash}\n`
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

task("scrollSend", "Send ETH to address")
    .addParam("amount", "Amount to send", undefined, types.float, true)
    .addParam("delay", "Add random delay", undefined, types.int, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId)

        if (![ChainId.scrollSepolia, ChainId.scrollAlphaGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on Scroll!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

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

                const tx = await account.sendTransaction({
                    to: accounts[accounts.indexOf(account) + 2].address,
                    value: amount,
                });

                console.log(
                    `Task result:\nAddress: #${accounts.indexOf(account)} ${account.address}\ntxn: ${chainInfo.explorer}${
                        tx.hash
                    }\n`
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

task("scrollAaveSupplyEth", "Supply ETH to AAVE")
    .addParam("amount", "Amount to send", undefined, types.float, true)
    .addParam("delay", "Add random delay", undefined, types.int, true)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
    .addOptionalParam("startAccount", "Starting account index", undefined, types.string)
    .addOptionalParam("endAccount", "Ending account index", undefined, types.string)
    .addOptionalParam(
        "accountIndex",
        "Index of the account for which it will be executed",
        undefined,
        types.string
    )
    .setAction(async (taskArgs, hre) => {
        const contractAddress = "0x57ce905CfD7f986A929A26b006f797d181dB706e";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId)

        if (![ChainId.scrollSepolia, ChainId.scrollAlphaGoerli].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on --network scrollAlpha`);
            return;
        }

        const aaveContract = new Contract(
            contractAddress,
            ["function depositETH(address ,address onBehalfOf,uint16 referralCode) payable"],
            hre.ethers.provider
        );

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                let amount: BigNumber = utils.parseEther(taskArgs.amount.toString());

                const tx = await aaveContract
                    .connect(account)
                    .depositETH("0x48914c788295b5db23af2b5f0b3be775c4ea9440", account.address, 0, {
                        value: amount,
                    });

                console.log(
                    `Task result:\nAddress: #${accounts.indexOf(account)} ${account.address}\ntxn: ${chainInfo.explorer}${
                        tx.hash
                    }\n`
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

task("scrollAaveSupplyTokens", "Supply tokens")
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
        const targetAddress = "0x48914C788295b5db23aF2b5F0B3BE775C4eA9440";
        const currentNetwork = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(currentNetwork.chainId)

        if (![ChainId.scrollSepolia, ChainId.scrollAlphaGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at --network scrollAlpha`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const daiTokenAddress = "0x7984e363c38b590bb4ca35aed5133ef2c6619c40";
        const eursTokenAddress = "0xdf40f3a3566b4271450083f1ad5732590ba47575";
        const usdcTokenAddress = "0x2c9678042d52b97d27f2bd2947f7111d93f3dd0d";
        const usdtTokenAddress = "0x186c0c26c45a8da1da34339ee513624a9609156d";
        const aaveTokenAddress = "0xfc2921be7b2762f0e87039905d6019b0ff5978a8";
        const linkTokenAddress = "0x279cbf5b7e3651f03cb9b71a9e7a3c924b267801";
        const wbtcTokenAddress = "0x5ea79f3190ff37418d42f9b2618688494dbd9693";

        const tokens = [
            ERC20__factory.connect(daiTokenAddress, hre.ethers.provider),
            ERC20__factory.connect(eursTokenAddress, hre.ethers.provider),
            ERC20__factory.connect(usdcTokenAddress, hre.ethers.provider),
            ERC20__factory.connect(usdtTokenAddress, hre.ethers.provider),
            ERC20__factory.connect(aaveTokenAddress, hre.ethers.provider),
            ERC20__factory.connect(linkTokenAddress, hre.ethers.provider),
            ERC20__factory.connect(wbtcTokenAddress, hre.ethers.provider),
        ];

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                for (const token of tokens) {
                    const balance = await token.balanceOf(account.address);
                    if (balance.isZero()) {
                        console.log(`Skip zero balance ${await token.name()}`);
                        continue;
                    }
                    const balanceHex = utils.hexZeroPad(balance.toHexString(), 32);
                    const approveTx = await token.connect(account).approve(targetAddress, balance);
                    await approveTx.wait();

                    const sendCallData = `0x617ba037000000000000000000000000${token.address.slice(
                        2
                    )}${balanceHex.slice(2)}000000000000000000000000${account.address.slice(
                        2
                    )}0000000000000000000000000000000000000000000000000000000000000000`;
                    const tx = await account.sendTransaction({
                        to: targetAddress,
                        data: sendCallData,
                    });
                    console.log(`${await token.name()} Deposit txn: ${chainInfo.explorer}${tx.hash}`);
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
    });

task("scrollAaveFaucet", "Request test assets")
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
        const chainInfo = getChainInfo(currentNetwork.chainId)

        if (![ChainId.scrollSepolia, ChainId.scrollAlphaGoerli].includes(currentNetwork.chainId)) {
            console.log(`Task supported only at --network scrollAlpha`);
            return;
        }

        const daiTokenAddress = "0x7984e363c38b590bb4ca35aed5133ef2c6619c40";
        const eursTokenAddress = "0xdf40f3a3566b4271450083f1ad5732590ba47575";
        const usdcTokenAddress = "0x2c9678042d52b97d27f2bd2947f7111d93f3dd0d";
        const usdtTokenAddress = "0x186c0c26c45a8da1da34339ee513624a9609156d";
        const aaveTokenAddress = "0xfc2921be7b2762f0e87039905d6019b0ff5978a8";
        const linkTokenAddress = "0x279cbf5b7e3651f03cb9b71a9e7a3c924b267801";
        const wbtcTokenAddress = "0x5ea79f3190ff37418d42f9b2618688494dbd9693";

        interface MintInfo {
            amount: string;
            contract: ERC20;
        }

        const mintInfos: MintInfo[] = [
            { amount: "10000", contract: ERC20__factory.connect(daiTokenAddress, hre.ethers.provider) },
            { amount: "10000", contract: ERC20__factory.connect(eursTokenAddress, hre.ethers.provider) },
            { amount: "10000", contract: ERC20__factory.connect(usdcTokenAddress, hre.ethers.provider) },
            { amount: "10000", contract: ERC20__factory.connect(usdtTokenAddress, hre.ethers.provider) },
            { amount: "100", contract: ERC20__factory.connect(aaveTokenAddress, hre.ethers.provider) },
            { amount: "1000", contract: ERC20__factory.connect(linkTokenAddress, hre.ethers.provider) },
            { amount: "1", contract: ERC20__factory.connect(wbtcTokenAddress, hre.ethers.provider) },
        ];

        const faucetContract = new Contract("0x2F826FD1a0071476330a58dD1A9B36bcF7da832d", [
            "function mint(address token, address to, uint256 amount)",
        ]);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                for (const mintInfo of mintInfos) {
                    const mintTx = await faucetContract
                        .connect(account)
                        .mint(
                            mintInfo.contract.address,
                            account.address,
                            ethers.utils.parseUnits(mintInfo.amount, await mintInfo.contract.decimals())
                        );

                    console.log(`Mint ${await mintInfo.contract.symbol()} txn: ${chainInfo.explorer}${mintTx.hash}`);
                    await delay(0.05);
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
    });
