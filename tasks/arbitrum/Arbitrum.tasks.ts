import { EthBridger, getL2Network } from "@arbitrum/sdk";
import axios from "axios";
import { BigNumber, Contract, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { addDust, delay, getAccounts } from "../../utils/Utils";
import ArbContractsInfo from "./ArbContractsInfo.json";

export const ArbitrumTasks = {
    arbitrumBridge: "arbitrumBridge",
    arbitrumClaimDrop: "arbitrumClaimDrop",
};

task("arbitrumBridge", "Bridge ETH to arbitrum network")
    .addParam("amount", "Amount of ETH", undefined, types.float)
    .addParam("targetNetwork", "Target L2 network Id", 42161, types.int)
    .addParam("dust", "Dust percentage", undefined, types.int, true)
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

        if (![ChainId.ethereumMainnet, ChainId.ethereumGoerli].includes(currentNetwork.chainId)) {
            console.log("Bridge to Arbitrum supported only from Ethereum networks!");
            return;
        }
        const targetL2Network = getChainInfo(taskArgs.targetNetwork);
        if (
            ![ChainId.arbitrumMainnet, ChainId.arbitrumNova, ChainId.arbitrumGoerli].includes(
                targetL2Network.chainId
            )
        ) {
            console.log("Bridge only to Arbitrum networks!");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const l2Network = await getL2Network(
            taskArgs.targetNetwork
        ); /** <-- chain id of target Arbitrum chain */
        const ethBridger = new EthBridger(l2Network);

        for (const account of accounts) {
            try {
                let amount: BigNumber;
                if (taskArgs.dust) {
                    amount = utils.parseEther(
                        addDust({ amount: taskArgs.amount, upToPercent: taskArgs.dust }).toString()
                    );
                } else {
                    amount = utils.parseEther(taskArgs.amount);
                }
                console.log(`Sending ${utils.formatEther(amount)} ETH from ${account.address} ...`);

                const ethDepositTxResponse = await ethBridger.deposit({
                    amount: amount,
                    l1Signer: account /** <-- connected ethers-js Wallet */,
                });

                console.log(
                    `Deposit result:\nAddress: ${account.address}\ntxn: ${ethDepositTxResponse.hash}\n`
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

task("arbitrumApproveArbToken", "Approve ARB token to address")
    .addParam("approveTo", "Approve spending to address", undefined, types.string)
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
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const arbToken = ERC20__factory.connect(ArbContractsInfo.tokenAddress, hre.ethers.provider);
        const arbDecimals = await arbToken.decimals();
        const arbTicker = await arbToken.name();

        const claimContract = new hre.ethers.Contract(
            ArbContractsInfo.claimContractAddress,
            ArbContractsInfo.claimContractAbi,
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)} Address: ${account.address}`);
                let amount: BigNumber = await claimContract.claimableTokens(account.address);

                console.log(`Approve ${utils.formatUnits(amount, arbDecimals)} ${arbTicker} tokens`);
                let approveTx = await arbToken.connect(account).approve(taskArgs.approveTo, amount);

                console.log(`Approve txn ${approveTx.hash}`);

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

task("arbitrumDropAwailable", "Check drop amount")
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
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const arbToken = ERC20__factory.connect(ArbContractsInfo.tokenAddress, hre.ethers.provider);
        const arbDecimals = await arbToken.decimals();
        const arbTicker = await arbToken.name();

        const claimContract = new hre.ethers.Contract(
            ArbContractsInfo.claimContractAddress,
            ArbContractsInfo.claimContractAbi,
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                let dropAmount = utils.formatUnits(
                    await claimContract.claimableTokens(account.address),
                    arbDecimals
                );
                console.log(
                    `#${accounts.indexOf(account)} Address: ${
                        account.address
                    } drop amount ${utils.formatUnits(
                        await claimContract.claimableTokens(account.address),
                        arbDecimals
                    )} ${arbTicker}`
                );
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("arbitrumClaimDrop", "Claim drop")
    .addParam("delay", "Add random delay", undefined, types.int, true)
    .addFlag("waitClaimStart", "Wait for claim start")
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
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const arbToken = ERC20__factory.connect(ArbContractsInfo.tokenAddress, hre.ethers.provider);
        const arbDecimals = await arbToken.decimals();
        const arbTicker = await arbToken.symbol();

        const claimContract = new hre.ethers.Contract(
            ArbContractsInfo.claimContractAddress,
            ArbContractsInfo.claimContractAbi,
            hre.ethers.provider
        );

        const claimPeriodStartBlock = ((await claimContract.claimPeriodStart()) as BigNumber).toNumber();

        if (taskArgs.waitClaimStart) await waitForClaimStart();

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                let awailableToClaim: BigNumber = await claimContract.claimableTokens(account.address);
                if (awailableToClaim.isZero()) {
                    console.log("Nothing to claim");
                    continue;
                }
                let claimTx = await claimContract.connect(account).claim();
                console.log(`Tx hash ${claimTx.hash}`);
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

        async function waitForClaimStart(): Promise<void> {
            let ethProvider = new hre.ethers.providers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_URL);
            let currentBlockNumber = await ethProvider.getBlockNumber();

            while (currentBlockNumber < claimPeriodStartBlock) {
                console.log(
                    `Block ${currentBlockNumber}. Waiting for claim start at block ${claimPeriodStartBlock}...`
                );
                await new Promise((r) => setTimeout(r, 3_000));
                currentBlockNumber = await ethProvider.getBlockNumber();
            }
        }
    });

task("arbitrumDelegateArb", "Delegate ARB voting power to address")
    .addParam("delegateTo", "Address to delegate. Self by default", undefined, types.string, true) // Olimpio.eth address = 0xF4B0556B9B6F53E00A1FDD2b0478Ce841991D8fA
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
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const arbToken = new Contract(
            ArbContractsInfo.tokenAddress,
            ArbContractsInfo.tokenContractAbi,
            hre.ethers.provider
        );
        const arbDecimals = await arbToken.decimals();
        const arbTicker = await arbToken.name();

        for (const account of accounts) {
            try {
                console.log(`#${accounts.indexOf(account)} Address: ${account.address}`);
                let amount: BigNumber = await arbToken.balanceOf(account.address);

                const delegateTo = taskArgs.delegateTo || account.address;

                console.log(`Delegate ${utils.formatUnits(amount, arbDecimals)} ${arbTicker} tokens`);
                let delegateTx = await arbToken.connect(account).delegate(delegateTo);

                console.log(`Txn ${chainInfo.explorer}${delegateTx.hash}`);

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                } else {
                    console.log("\n");
                }
            } catch (error) {
                console.log(
                    `Error when process account #${accounts.indexOf(account)} Address: ${account.address}`
                );
                console.log(error);
            }
        }
    });

task("arbitrumSellAgiDrop", "Sell augi drop")
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
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }
        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const agiToken = ERC20__factory.connect(
            "0xff191514a9baba76bfd19e3943a4d37e8ec9a111",
            hre.ethers.provider
        );
        const decimals = await agiToken.decimals();
        const symbol = await agiToken.symbol();

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
                let awailable: BigNumber = await agiToken.balanceOf(account.address);
                if (awailable.isZero()) {
                    console.log("Nothing to sell");
                    continue;
                }
                let approveTx = await agiToken
                    .connect(account)
                    .approve("0x0fae1e44655ab06825966a8fce87b9e988ab6170", awailable);
                console.log(`Tx hash ${approveTx.hash}`);
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

task("arbitrumClaimArbShibaDrop", "Claim arb shiba drop")
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
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const claimContract = new ethers.Contract(
            "0x7aB3E1D1f706b35B7Ae82987C8862e8E3904529c",
            ["function claim(uint128 nonce, bytes signature, address referrer)"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                let index: number = accounts.indexOf(account) + 1;

                let refferer: string = accounts[index]
                    ? accounts[index].address
                    : "0xB049F7B441a21ed652c355546Bb12B5E51004D11";

                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const isEligible = await axios.get(
                    `https://arbshib.io/api/arb/eligibility/${account.address}`
                );

                if (!isEligible.data.data.isEligible || isEligible.data.data.hasClaimed) {
                    console.log(`Not eligible or already claimed`);
                    continue;
                }

                const claimData = await axios.post("https://arbshib.io/api/arb/eligibility/claim/", {
                    address: account.address,
                });

                console.log(claimData.data.data);

                let claimTx = await claimContract
                    .connect(account)
                    .claim(claimData.data.data.nonce, claimData.data.data.signature, refferer);

                console.log(`Tx hash ${claimTx.hash}`);
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

task("arbitrumNovaContractInteractions", "Interact with erc-20 contracts")
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
        const arbiSwapAddress = "0x67844f0f0dd3D770ff29B0ACE50E35a853e4655E";
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId)

        if (network.chainId != ChainId.arbitrumNova) {
            throw new Error("Task allowed only on --network arbNova");
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const erc20Contracts = [
            ERC20__factory.connect("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", hre.ethers.provider),
            ERC20__factory.connect("0x722E8BdD2ce80A4422E880164f2079488e115365", hre.ethers.provider),
            ERC20__factory.connect("0xf823C3cD3CeBE0a1fA952ba88Dc9EEf8e0Bf46AD", hre.ethers.provider),
            ERC20__factory.connect("0x6DcB98f460457fe4952e12779Ba852F82eCC62C1", hre.ethers.provider),
            ERC20__factory.connect("0x0057Ac2d777797d31CD3f8f13bF5e927571D6Ad0", hre.ethers.provider),
            ERC20__factory.connect("0x750ba8b76187092B0D1E87E28daaf484d1b5273b", hre.ethers.provider),
            ERC20__factory.connect("0x1d05e4e72cD994cdF976181CfB0707345763564d", hre.ethers.provider),
        ];

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                for (const erc20 of erc20Contracts) {
                    const tx = await erc20.connect(account).approve(arbiSwapAddress, BigNumber.from(0));
                    console.log(`Approve ${await erc20.symbol()} tx ${chainInfo.explorer}${tx.hash}`);
                    await delay(0.1);
                }

                if (taskArgs.delay != undefined) {
                    await delay(taskArgs.delay);
                }
            } catch (error) {
                console.log(`Error when process account`);
                console.log(error);
            }
        }
    });
