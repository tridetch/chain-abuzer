import crypto from "crypto";
import * as dotenv from "dotenv";
import { ethers, Wallet } from "ethers";
import * as fs from "fs";
import { SData } from "./Util.tasks";

dotenv.config();

const DEFAULT_WALLET_COUNT: number = parseInt(process.env.NUMBER_OF_ACCOUNTS || "100");

export async function deriveWallets(
    provider: ethers.providers.JsonRpcProvider,
    numberOfWallets: number = DEFAULT_WALLET_COUNT
): Promise<Wallet[]> {
    let wallets: Wallet[] = [];

    if (process.env.MNEMONIC_ENCRYPTED) {
        wallets = getAccountsFromSeedPhrase(
            numberOfWallets,
            decrypt(process.env.MNEMONIC_ENCRYPTED),
            provider
        );
    } else if (process.env.MNEMONIC) {
        wallets = getAccountsFromSeedPhrase(numberOfWallets, process.env.MNEMONIC, provider);
    } else {
        wallets = getAccountsFromPrivateKeys(provider);
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

function getAccountsFromSeedPhrase(
    numberOfWallets: number,
    seed: string,
    provider: ethers.providers.JsonRpcProvider
): Wallet[] {
    const wallets: Wallet[] = [];

    const node = ethers.utils.HDNode.fromMnemonic(seed);

    for (let accountIndex = 0; accountIndex < numberOfWallets; accountIndex++) {
        const wallet = new ethers.Wallet(node.derivePath(`m/44'/60'/0'/0/${accountIndex}`).privateKey);
        wallets.push(wallet.connect(provider));
    }

    return wallets;
}

function getAccountsFromPrivateKeys(provider: ethers.providers.JsonRpcProvider): Wallet[] {
    const wallets: Wallet[] = [];

    let private_keys: string[];
    if (fs.existsSync(`./private_keys_e.json`)) {
        const encrPk: string[] = require(`../private_keys_e.json`);
        private_keys = encrPk.map((k) => decrypt(k));
    } else {
        private_keys = require("../private_keys.json");
    }

    for (let accountIndex = 0; accountIndex < private_keys.length; accountIndex++) {
        const wallet = new ethers.Wallet(private_keys[accountIndex]);
        wallets.push(wallet.connect(provider));
    }

    return wallets;
}
