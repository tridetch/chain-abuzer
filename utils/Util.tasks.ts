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
        const filePath = `./utils/temp/temp.json`;

        const message = taskArgs.message || process.env.MNEMONIC;

        const k = crypto.randomBytes(32);
        const i = crypto.randomBytes(16);

        let sData: SData = { k: k, i: i };

        const cipher = crypto.createCipheriv("aes-256-cbc", sData.k, sData.i);
        let encrypted = cipher.update(message, "utf8", "hex");
        encrypted += cipher.final("hex");

        console.log("Encrypted seed phrase:", encrypted);
        console.log("Put it into `MNEMONIC_ENCRYPTED` field in .env file");

        fs.writeFileSync(filePath, JSON.stringify(sData));
    });

task("revealSeedPhrase", "Reveal seed phrase")
    .setAction(async (taskArgs, hre) => {
        let seed: string = process.env.MNEMONIC_ENCRYPTED || "";
        let sData: SData = require(`./temp/temp.json`);

        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(sData.k), Buffer.from(sData.i));
        let decrypted = decipher.update(seed, "hex", "utf8");
        decrypted += decipher.final("utf8");

        console.log(`Seed phrase: ${decrypted}`);
    });
