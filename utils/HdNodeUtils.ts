import crypto from "crypto";
import * as dotenv from "dotenv";
import { ethers, Wallet } from "ethers";
import { SData } from "./Util.tasks";

dotenv.config();

const DEFAULT_WALLET_COUNT: number = parseInt(process.env.NUMBER_OF_ACCOUNTS || "100");

export async function deriveWallets(
    provider: ethers.providers.JsonRpcProvider,
    numberOfWallets: number = DEFAULT_WALLET_COUNT
): Promise<Wallet[]> {
    let seed: string = "";

    if (process.env.MNEMONIC_ENCRYPTED) {
        seed = decrypt(process.env.MNEMONIC_ENCRYPTED);
    } else {
        seed = process.env.MNEMONIC || "";
    }

    const node = ethers.utils.HDNode.fromMnemonic(seed);

    const wallets: Wallet[] = [];

    for (let accountIndex = 0; accountIndex < numberOfWallets; accountIndex++) {
        const wallet = new ethers.Wallet(node.derivePath(`m/44'/60'/0'/0/${accountIndex}`).privateKey);
        wallets.push(wallet.connect(provider));
    }
    return wallets;
}

function decrypt(data: string): string {
    let sData: SData = require(`./temp/temp.json`);

    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(sData.k), Buffer.from(sData.i));
    let decrypted = decipher.update(data, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}
