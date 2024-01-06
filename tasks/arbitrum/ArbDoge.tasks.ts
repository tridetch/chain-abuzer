import axios from "axios";
import { BigNumber, ethers, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts } from "../../utils/Utils";
import StakingContractAbi from "./ArbDogeStakingContractInfo.json";

export const ArbitrumTasks = {
    arbitrumBridge: "arbitrumBridge",
    arbitrumClaimDrop: "arbitrumClaimDrop",
};

const AiDogeTokenAddress = "0x09E18590E8f76b6Cf471b3cd75fE1A1a9D2B2c2b";
const AiCodeTokenAddress = "0x7C8a1A80FDd00C9Cccd6EbD573E9EcB49BFa2a59";
const StakingContractAddress = "0x5845696f6031bfd57b32e6ce2ddea19a486fa5e5";
const BurnForAiCodeContractAddress = "0xc79877f4805be68e564031434ad060c2ee852fa8";

task("arbitrumClaimArbDogeDrop", "Claim arb doge drop")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const claimContract = new ethers.Contract(
            "0x7c20acfd25467de0b92d03e4c4d304f18b8408e1",
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
                    `https://api.arbdoge.ai/arb/eligibility/${account.address}`
                );

                if (!isEligible.data.data.isEligible || isEligible.data.data.hasClaimed) {
                    console.log(`Not eligible or already claimed`);
                    continue;
                }

                const claimData = await axios.post("https://api.arbdoge.ai/arb/eligibility/claim/", {
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

task("stakeArbDoge", "Stake arb doge")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const stakingContract = new ethers.Contract(
            StakingContractAddress,
            StakingContractAbi,
            hre.ethers.provider
        );

        const arbDogeToken = ERC20__factory.connect(AiDogeTokenAddress, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const balance = await arbDogeToken.balanceOf(account.address);
                const allowance = await arbDogeToken.allowance(account.address, StakingContractAddress);

                if (balance.isZero()) {
                    console.log(`Skip zero balance`);
                }

                if (allowance.lt(balance)) {
                    const approveTx = await arbDogeToken
                        .connect(account)
                        .approve(StakingContractAddress, balance);
                    console.log(`Approve tx ${approveTx.hash}`);
                }

                const stakeTx = await stakingContract.connect(account).deposit(0, balance);

                console.log(`Tokens staked ${stakeTx.hash}`);

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

task("withdrawArbDoge", "Claim arb doge")
    .addParam("delay", "Add random delay", undefined, types.float, true)
    .addFlag("rewards", "Claim rewards")
    .addFlag("all", "Withdraw and claim")
    .addFlag("balance", "Show balances")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const stakingContract = new ethers.Contract(
            StakingContractAddress,
            StakingContractAbi,
            hre.ethers.provider
        );

        const arbDogeToken = ERC20__factory.connect(AiDogeTokenAddress, hre.ethers.provider);
        const decimals = await arbDogeToken.decimals();

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const stakingInfo = await stakingContract.userInfo(0, account.address);
                const stakingBalance: BigNumber = stakingInfo[0];
                const stakingRewards: BigNumber = stakingInfo[1];

                if (stakingBalance.isZero()) {
                    console.log(`Skip zero balance`);
                } else {
                    console.log(
                        `Staking balance ${utils.formatUnits(
                            stakingBalance,
                            decimals
                        )}\nRewards ${utils.formatUnits(stakingRewards, decimals)}`
                    );
                }
                if (taskArgs.balance) {
                    continue;
                }

                const amountToClaim = taskArgs.all ? stakingBalance : 0;

                const claimTx = await stakingContract.connect(account).withdraw(0, amountToClaim);
                console.log(`Claim tx ${claimTx.hash}`);

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

task("burnArbDogeForAiCode", "Burn for ARBDOGE for AICODE")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const burnContract = new ethers.Contract(
            BurnForAiCodeContractAddress,
            ["function burn(uint256 value)"],
            hre.ethers.provider
        );

        const arbDogeToken = ERC20__factory.connect(AiDogeTokenAddress, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const balance = await arbDogeToken.balanceOf(account.address);
                const allowance = await arbDogeToken.allowance(account.address, BurnForAiCodeContractAddress);

                if (balance.isZero()) {
                    console.log(`Skip zero balance`);
                }

                if (allowance.lt(balance)) {
                    const approveTx = await arbDogeToken
                        .connect(account)
                        .approve(BurnForAiCodeContractAddress, balance);
                    console.log(`Approve tx ${approveTx.hash}`);
                }

                const stakeTx = await burnContract.connect(account).burn(balance);

                console.log(`Tokens burned ${stakeTx.hash}`);

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

task("claimArbDogeForAiCode", "Claim for ARBDOGE for AICODE")
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
        const currentNetwork = await hre.ethers.provider.getNetwork();
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const claimContract = new ethers.Contract(
            BurnForAiCodeContractAddress,
            ["function claim()"],
            hre.ethers.provider
        );

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const claimTx = await claimContract.connect(account).claim();

                console.log(`Tokens burned ${claimTx.hash}`);

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
