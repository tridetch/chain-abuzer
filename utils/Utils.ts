import { BigNumber, ethers, utils } from "ethers";
import { ChainId, ChainInfo } from "./ChainInfoUtils";
import { deriveWallets } from "./HdNodeUtils";

export interface ContractInfo {
    address: string;
    abi: Array<any>;
}

interface Range {
    from?: number;
    to?: number;
}

export function getRandomAmount({ from = 0, to = 1 }: Range = {}): number {
    return Math.random() * (to - from) + from;
}

interface DustParameters {
    amount: number;
    upToPercent?: number;
    decimals?: number;
}

export function addDust({ amount = 0, upToPercent = 30, decimals = 5 }: DustParameters): number {
    const random = getRandomAmount({ from: 0, to: (amount / 100) * upToPercent });
    const sum = amount + random;
    return parseFloat(sum.toFixed(decimals));
}

export const delay = (minutes: number = 3) => {
    const ms = minutes * 60_000;
    console.log(`(${getCurrentTime()}) Delay ${minutes} minutes...`);
    return new Promise((r) => setTimeout(r, ms));
};

export async function getAccounts(
    taskArgs: any,
    provider: ethers.providers.JsonRpcProvider
): Promise<ethers.Wallet[]> {
    let accounts = (await deriveWallets(provider)).slice(taskArgs.startAccount, taskArgs.endAccount);
    if (taskArgs.accountIndex != undefined) {
        accounts = [accounts[taskArgs.accountIndex]];
    }
    if (taskArgs.randomize) {
        accounts = shuffle(accounts);
    }
    return accounts;
}

interface GasPriceParams {
    maxPriceInGwei?: number;
    provider: ethers.providers.JsonRpcProvider;
}

export async function waitForGasPrice({ maxPriceInGwei = undefined, provider }: GasPriceParams) {
    //If maxPriceInGwei not provided skip waiting
    if (!maxPriceInGwei) return;

    let currentGasPrice = await provider.getGasPrice();
    while (currentGasPrice.gt(utils.parseUnits(maxPriceInGwei.toString(), "gwei"))) {
        console.log(
            `${getCurrentTime()} Gas price: ${utils.formatUnits(
                currentGasPrice,
                "gwei"
            )} Waiting for cheaper gasprice ${maxPriceInGwei} gwei...`
        );
        await new Promise((r) => setTimeout(r, 180_000));
        currentGasPrice = await provider.getGasPrice();
    }
}

export function getCurrentTime() {
    const today = new Date();
    return `${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
}

export function percentOf(number: BigNumber, percent: number): BigNumber {
    return number.div(BigNumber.from(100)).mul(BigNumber.from(percent));
}

export function dateInSeconds(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

export function getDeadline(seconds: number = 60): Date {
    return new Date(new Date().getTime() + seconds * 1000);
}

export function donateMessage() {
    console.log(
        `Abused successfully\nDonate here 0x7783362B401EA9CA3cAC0F364Cc77EC0B1C1a19E (any EVM chain, any token)`
    );
}

interface TxnParams {
    signer: ethers.Wallet;
    chain: ChainInfo;
    increaseGasPercent?: number;
}

export async function populateTxnParams({
    signer,
    chain,
    increaseGasPercent = 3,
}: TxnParams): Promise<ethers.providers.TransactionRequest> {
    var txRequest: ethers.providers.TransactionRequest = {};

    txRequest.gasPrice = (await signer.getGasPrice())
        .div(BigNumber.from(100))
        .mul(BigNumber.from(100 + increaseGasPercent));

    switch (chain.chainId) {
        case ChainId.optimismMainnet:
            txRequest.maxPriorityFeePerGas = ethers.utils.parseUnits("1", "wei");
            txRequest.gasPrice = undefined; // eip-1559 transaction do not support gasPrice
            break;
        case ChainId.baseMainnet:
            txRequest.maxPriorityFeePerGas = ethers.utils.parseUnits("0.0001", "gwei");
            txRequest.maxFeePerGas = ethers.utils.parseUnits("0.0001", "gwei");
            txRequest.gasPrice = undefined; // eip-1559 transaction do not support gasPrice
            break;
        case ChainId.zoraMainnet:
            txRequest.maxPriorityFeePerGas = ethers.utils.parseUnits("0.001", "gwei");
            txRequest.maxFeePerGas = ethers.utils.parseUnits("0.001", "gwei");
            txRequest.gasPrice = undefined; // eip-1559 transaction do not support gasPrice
            break;
    }

    return txRequest;
}

export const shuffle = <T>(array: T[]) => {
    return array.sort(() => Math.random() - 0.5);
};

export function toHexZeroPad(string: string): string {
    return utils.hexZeroPad(utils.hexlify(string), 32);
}
