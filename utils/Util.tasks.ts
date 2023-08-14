import crypto from "crypto";
import * as fs from "fs";
import { subtask, task, types } from "hardhat/config";
import { warnIfMainnet } from "../utils/ChainInfoUtils";

subtask("warnIfMainnet", "Warn user if task executed in mainnet").setAction(async (taskArgs, hre) => {
    await warnIfMainnet((await hre.ethers.provider.getNetwork()).chainId);
});

export interface SData {
    k: Buffer;
    i: Buffer;
}

task("encryptSeedPhrase", "Encrypt seed phrase")
    .addParam("message", "Message to encrypt", undefined, types.string, true)
    .setAction(async (taskArgs, hre) => {
        const message = taskArgs.message || process.env.MNEMONIC;

        let sData: SData = getSdata();

        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(sData.k), Buffer.from(sData.i));
        let encrypted = cipher.update(message, "utf8", "hex");
        encrypted += cipher.final("hex");

        console.log("Encrypted seed phrase:", encrypted);
        console.log("Put it into `MNEMONIC_ENCRYPTED` field in .env file");
    });

task("revealSeedPhrase", "Reveal seed phrase").setAction(async (taskArgs, hre) => {
    let seed: string = process.env.MNEMONIC_ENCRYPTED || "";
    let sData: SData = require(`./temp/temp.json`);

    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(sData.k), Buffer.from(sData.i));
    let decrypted = decipher.update(seed, "hex", "utf8");
    decrypted += decipher.final("utf8");

    console.log(`Seed phrase: ${decrypted}`);
});

task("encryptPrivateKeys", "Encrypt private keys").setAction(async (taskArgs, hre) => {
    const keys: string[] = require("../private_keys.json");

    let sData: SData = getSdata();

    let pkObf: string[] = [];
    for (const key of keys) {
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(sData.k), Buffer.from(sData.i));
        let encrypted = cipher.update(key, "utf8", "hex");
        encrypted += cipher.final("hex");
        pkObf.push(encrypted);
    }

    fs.writeFileSync("./private_keys_e.json", JSON.stringify(pkObf));
    fs.writeFileSync("./private_keys.json", JSON.stringify([]));

    console.log("Private keys encrypted end saved in ./private_keys_e.json");
});

function getSdata() {
    const sFilePath = `./utils/temp/temp.json`;
    let sData: SData;
    if (fs.existsSync(sFilePath)) {
        sData = require(`./temp/temp.json`);
    } else {
        const k = crypto.randomBytes(32);
        const i = crypto.randomBytes(16);

        sData = { k: k, i: i };

        fs.writeFileSync(`./utils/temp/temp.json`, JSON.stringify(sData));
    }
    return sData;
}
