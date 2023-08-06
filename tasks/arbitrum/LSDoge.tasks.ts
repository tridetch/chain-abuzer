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

const lsDogeTokenAddress = "0x4C70D32295de15Fdf302d3BcBb7FC2631acE1c91";

task("claimLsDogeDrop", "Claim lsDoge drop")
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
            "0x3b0fda8dbbbf273a45f576d8d31fc5e71ff4b742",
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

                const claimData = await axios.get(`https://api-airdrop.lsdoge.com/${account.address}`);

                console.log(claimData.data);

                return;

                let claimTx = await claimContract.connect(account).claim(claimData.data, refferer);

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
