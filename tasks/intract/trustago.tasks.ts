import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { MOCK_USER_AGENT, delay, getAccounts, populateTxnParams, waitForGasPrice } from "../../utils/Utils";

import axios, { AxiosResponse } from "axios";
import { Wallet, ethers } from "ethers";

interface AttestDataPayload {
    code: number;
    message: string;
    data: {
        calldata: {
            chainId: number;
            from: string;
            to: string;
            value: string;
            data: string;
        };
        message: {
            chain_id: number;
            address: string;
            score: number;
            attest_type: string;
            period: number;
            fee: string;
        };
    };
    datetime: string;
    success: boolean;
}

interface AttestInfoPayload {
    code: number;
    message: string;
    data: {
        total: number;
        current: number;
        size: number;
        items: any[];
    };
    datetime: string;
    success: boolean;
}

task("trustaGoDailyCheckIn", "")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                if ((await account.getBalance()).lt(ethers.utils.parseEther("0.05"))) {
                    console.log(`Require min balance on Ethereum mainnet of 0.05 ETH. Skip address.`);
                    continue;
                }

                const token = await signIn(account);

                const checkInResponse = await axios.post(
                    "https://mp.trustalabs.ai/accounts/daily_check_in",
                    undefined,
                    {
                        headers: {
                            "User-Agent": MOCK_USER_AGENT,
                            Authorization: token,
                        },
                    }
                );

                if (checkInResponse.data.success) {
                    console.log("Daily Check-In completed!");
                } else {
                    console.log("Daily Check-In Failed!");
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

task("trustaGoAttestaionPoh", "")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addFlag("mint", "Mint attestation")
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (ChainId.lineaMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at Linea mainnet");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const token = await signIn(account);

                const attestResponse: AxiosResponse<AttestDataPayload> = await axios.get(
                    "https://mp.trustalabs.ai/accounts/attest_calldata?attest_type=humanity",
                    {
                        headers: {
                            "User-Agent": MOCK_USER_AGENT,
                            Authorization: token,
                        },
                    }
                );

                console.log(`Trusta Humanity score: ${attestResponse.data.data.message.score}`);
                if (!taskArgs.mint) {
                    continue;
                }
                if (
                    attestResponse.data.data.message.score < -1 ||
                    attestResponse.data.data.message.score > 60
                ) {
                    console.log(`Account with Sybil score, skip claim`);
                    continue;
                }

                const attestInfoResponse: AxiosResponse<AttestInfoPayload> = await axios.get(
                    "https://mp.trustalabs.ai/accounts/attestation?attest_type=humanity",
                    {
                        headers: {
                            "User-Agent": MOCK_USER_AGENT,
                            Authorization: token,
                        },
                    }
                );

                if (!attestInfoResponse.data.data.items.some((info) => info.schema_tag == "humanity")) {
                    await waitForGasPrice({
                        maxPriceInGwei: taskArgs.gasPrice,
                        provider: hre.ethers.provider,
                    });
                    const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                    const attestTx = await account.sendTransaction({
                        to: attestResponse.data.data.calldata.to,
                        value: attestResponse.data.data.calldata.value,
                        data: attestResponse.data.data.calldata.data,
                        ...txParams,
                    });
                    console.log(`Attestation claimed tx: ${chainInfo.explorer}${attestTx.hash}`);
                } else {
                    console.log(`Humanity attestation already claimed`);
                    continue;
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

task("trustaGoAttestaionMedia", "")
    .addFlag("mint", "Mint attestation")
    .addParam("delay", "Add delay between operations", undefined, types.float, true)
    .addParam("gasPrice", "Wait for gas price", undefined, types.float, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (ChainId.lineaMainnet != currentNetwork.chainId) {
            console.log("Task awailable only at Linea mainnet");
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);

                const token = await signIn(account);

                // console.log(signInResponse.data);

                const attestResponse: AxiosResponse<AttestDataPayload> = await axios.get(
                    "https://mp.trustalabs.ai/accounts/attest_calldata?attest_type=media",
                    {
                        headers: {
                            "User-Agent": MOCK_USER_AGENT,
                            Authorization: token,
                        },
                    }
                );

                console.log(`Trusta MEDIA score: ${attestResponse.data.data.message.score}`);
                if (!taskArgs.mint) {
                    continue;
                }
                if (attestResponse.data.data.message.score < 20) {
                    console.log(`Media score to low, skip claim`);
                    continue;
                }

                const attestInfoResponse: AxiosResponse<AttestInfoPayload> = await axios.get(
                    "https://mp.trustalabs.ai/accounts/attestation?attest_type=media",
                    {
                        headers: {
                            "User-Agent": MOCK_USER_AGENT,
                            Authorization: token,
                        },
                    }
                );

                if (!attestInfoResponse.data.data.items.some((info) => info.schema_tag == "media")) {
                    await waitForGasPrice({
                        maxPriceInGwei: taskArgs.gasPrice,
                        provider: hre.ethers.provider,
                    });
                    const txParams = await populateTxnParams({ signer: account, chain: chainInfo });
                    const attestTx = await account.sendTransaction({
                        to: attestResponse.data.data.calldata.to,
                        value: attestResponse.data.data.calldata.value,
                        data: attestResponse.data.data.calldata.data,
                        ...txParams,
                    });
                    console.log(`Attestation claimed tx: ${chainInfo.explorer}${attestTx.hash}`);
                } else {
                    console.log(`MEDIA atteestation already claimed`);
                    continue;
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

async function signIn(account: Wallet): Promise<string> {
    const sign = await account.signMessage(
        "Please sign this message to confirm you are the owner of this address and Sign in to TrustGo App"
    );
    // console.log(`Signsture ${sign}`);
    const signInResponse = await axios.post("https://mp.trustalabs.ai/accounts/check_signed_message", {
        mode: "evm",
        address: account.address,
        message:
            "Please sign this message to confirm you are the owner of this address and Sign in to TrustGo App",
        signature: sign,
    });

    // console.log(signInResponse.data);
    const token = signInResponse.data.data.token;
    return `TOKEN ${token}`;
}
