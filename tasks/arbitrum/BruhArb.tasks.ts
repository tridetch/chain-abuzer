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

const bruhTokenAddress = "0xB5B5b428e4DE365F809CeD8271D202449e5c2F72";

task("claimBruhDrop", "Claim bruh drop")
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
        if (ChainId.arbitrumMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at arbitrum mainnet");
            return;
        }

        const chainInfo = getChainInfo(currentNetwork.chainId);
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const claimContract = new ethers.Contract(
            "0x0857832548ab9dd3724943305b1ca5d230341b90",
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

                const claimData = await axios.post(
                    `https://bruhcoin.co/api/sinature?userAddress=${account.address}`
                );

                if (claimData.data.error) {
                    console.log(`Not eligible or already claimed`);
                    continue;
                }

                console.log(claimData.data);

                let claimTx = await claimContract
                    .connect(account)
                    .claim(claimData.data.nonce, claimData.data.signature, refferer);

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
