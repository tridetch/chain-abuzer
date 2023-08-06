import snapshot from "@snapshot-labs/snapshot.js";
import { task, types } from "hardhat/config";
import { delay, getAccounts } from "../../utils/Utils";

const SNAPSHOT_HUB = "https://hub.snapshot.org";

task("snapshotVote", "Cast vote on proposal")
    .addParam("space", "Voting space", undefined, types.string, false)
    .addParam("proposal", "Proposal ID", undefined, types.string, false)
    .addParam("choice", "Answer variant", undefined, types.int, false)
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
        const snapshotClient = new snapshot.Client712(SNAPSHOT_HUB);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(
                    `\n#${accounts.indexOf(account)} Address: ${account.address}\nVoting on ${taskArgs.space}`
                );
                const voteResult = await snapshotClient.vote(account, account.address, {
                    space: taskArgs.space,
                    proposal: taskArgs.proposal,
                    type: "single-choice",
                    choice: taskArgs.choice,
                    reason: "",
                    app: "my-app",
                });
                console.log(`Result${JSON.stringify(voteResult)}`);
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

task("snapshotJoinSpace", "Join snapshot space")
    .addParam("space", "Voting space", undefined, types.string, false)
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
        const snapshotClient = new snapshot.Client712(SNAPSHOT_HUB);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(
                    `\n#${accounts.indexOf(account)} Address: ${account.address}\nVoting on ${taskArgs.space}`
                );
                const receipt = await snapshotClient.follow(account, account.address, {
                    space: taskArgs.space,
                });

                console.log(`Result${JSON.stringify(receipt)}`);
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
