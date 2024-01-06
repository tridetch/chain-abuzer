import { BigNumber, Contract, utils } from "ethers";
import { task, types } from "hardhat/config";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import "../../utils/Util.tasks";
import { delay, getAccounts } from "../../utils/Utils";
import { lzMailerContractInfo as LzMailerContractInfo } from "./lzMailerContracstInfo";
import { zkNftBridgeContractInfo } from "./zkNftBridgeContractInfo";

interface DstChainInfo {
    dstChainId: number;
    lzChainId: number;
    dstAddress: string;
    lzDstAddress: string;
}
const DstChainInfos = {
    arbNova: {
        dstChainId: 14,
        lzChainId: 175,
        dstAddress: "0x52c491c2afdA8b6FB361404213122644D98e0AA0",
        lzDstAddress: "0x2dED59F685f18ee016a93d1CeCc5b7eA0322aFED",
    },
};

function getTargetChain(targetChainId: number): DstChainInfo | undefined {
    switch (targetChainId) {
        case ChainId.arbitrumNova:
            return DstChainInfos.arbNova;
        default:
            break;
    }
}

function getLzMailerContractAddress(chainId: number): string | undefined {
    switch (chainId) {
        case ChainId.binanceMainnet:
            return LzMailerContractInfo.binanceContractAddress;
        case ChainId.poligonMainnet:
            return LzMailerContractInfo.polygonContractAddress;
        default:
            break;
    }
}

task("zkBridgeMintLoyaltyProgramNft", "Mint zkBridge Loyalty Program Nft's")
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
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.binanceMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on binance mainnet!`);
            return;
        }
        let mintInfos = [
            {
                name: "zkLightClient",
                contract: new Contract(
                    "0xd2ccc9ee7ea2ccd154c727a46d475dda49e99852",
                    ["function mint()"],
                    hre.ethers.provider
                ),
            },
            {
                name: "zkBridge on opBNB",
                contract: new Contract(
                    "0x9c614a8E5a23725214024d2C3633BE30D44806f9",
                    ["function mint()"],
                    hre.ethers.provider
                ),
            },
            {
                name: "BNB Chain Luban Upgrade",
                contract: new Contract(
                    "0x9885C17Dd44c00C37B98F510cdff099EfF437dcE",
                    ["function mint()"],
                    hre.ethers.provider
                ),
            },
            {
                name: "Greenfield Testnet Tutorial",
                contract: new Contract(
                    "0x13D23d867e73aF912Adf5d5bd47915261eFa28F2",
                    ["function mint()"],
                    hre.ethers.provider
                ),
            },
        ];
        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
            for (const info of mintInfos) {
                try {
                    const tx = await info.contract.connect(account).mint();
                    await tx.wait();
                    console.log(`${info.name} nft minted txn: ${chainInfo.explorer}${tx.hash}`);
                    await delay(0.05);
                } catch (error) {
                    console.log(`Error when mint ${info.name}`);
                    console.log(error);
                }
            }
            if (taskArgs.delay != undefined) {
                await delay(taskArgs.delay);
            }
        }
    });

task("zkBridgeMysteryOfPandaria", "Mint and bridge Mystery of Pandaria Nft's")
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
        const chainInfo = getChainInfo(currentNetwork.chainId);

        if (![ChainId.binanceMainnet].includes(currentNetwork.chainId)) {
            console.log(` Task supported only on binance mainnet!`);
            return;
        }

        let mintContract = new Contract(
            "0x87a218ae43c136b3148a45ea1a282517794002c8",
            ["function mint()", "function approve(address to,uint256 tokenId)"],
            hre.ethers.provider
        );
        let bridgeContract = new Contract(
            zkNftBridgeContractInfo.binanceContractAddress,
            zkNftBridgeContractInfo.abi,
            hre.ethers.provider
        );

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        for (const account of accounts) {
            console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
            try {
                const tx = await mintContract.connect(account).mint();
                const receipt = await tx.wait();
                const nftId = BigInt(receipt.logs[0].topics[3]).toString();
                console.log(`Nft minted (Id ${nftId}) txn: ${chainInfo.explorer}${tx.hash}`);

                const approveTx = await mintContract.connect(account).approve(bridgeContract.address, nftId);
                await approveTx.wait();

                const recipientChain = 126;
                const adapterParams =
                    "0x000100000000000000000000000000000000000000000000000000000000001b7740";

                const chainFee = await bridgeContract.chainFee(recipientChain);
                const fee = await bridgeContract.estimateFee(
                    mintContract.address,
                    nftId,
                    recipientChain,
                    account.address,
                    adapterParams
                );

                console.log(`Total crosschain fee ${utils.formatEther(fee)}`);

                const bridgeTx = await bridgeContract
                    .connect(account)
                    .transferNFT(
                        mintContract.address,
                        nftId,
                        recipientChain,
                        account.address,
                        adapterParams,
                        { value: fee }
                    );

                console.log(`Nft bridged to moonbeam chain tx ${chainInfo.explorer}${bridgeTx.hash}`);
            } catch (error) {
                console.log(error);
            }
            if (taskArgs.delay != undefined) {
                await delay(taskArgs.delay);
            }
        }
    });

task("zkBridgeSendMessage", "Send zk message")
    .addParam(
        "message",
        "Message to send",
        "Embrace the future of cross-chain interoperability on zkBridge! 🌈",
        types.string,
        true
    )
    .addParam("to", "Recepient address or ENS, self by default", undefined, types.string, true)
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
        const chainInfo = getChainInfo(currentNetwork.chainId);

        const dstChain = DstChainInfos.arbNova;

        if (!dstChain) {
            console.log(`Destination chain not supported!`);
            return;
        }

        if (![ChainId.binanceMainnet, ChainId.poligonMainnet].includes(currentNetwork.chainId)) {
            console.log(`Task supported only on binance mainnet!`);
            return;
        }
        const lzMailerContractAddress = getLzMailerContractAddress(chainInfo.chainId);
        if (!lzMailerContractAddress) {
            console.log(`Destination chain not supported!`);
            return;
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);
        const lzMailerContract = new Contract(
            lzMailerContractAddress,
            LzMailerContractInfo.abi,
            hre.ethers.provider
        );
        for (const account of accounts) {
            console.log(`\n#${accounts.indexOf(account)} Address: ${account.address}`);
            try {
                const nativeFee: BigNumber = await lzMailerContract.estimateLzFee(
                    dstChain.lzChainId,
                    dstChain.lzDstAddress,
                    taskArgs.message
                );
                const dstFee: BigNumber = await lzMailerContract.fees(dstChain.dstChainId);

                const messageTx = await lzMailerContract
                    .connect(account)
                    .sendMessage(
                        dstChain.dstChainId,
                        dstChain.dstAddress,
                        dstChain.lzChainId,
                        dstChain.lzDstAddress,
                        nativeFee,
                        taskArgs.to || account.address,
                        taskArgs.message,
                        { value: nativeFee.add(dstFee), gasPrice: await account.getGasPrice() }
                    );
                console.log(
                    `Message "${taskArgs.message}" sended to address ${taskArgs.to || account.address}\ntx: ${
                        chainInfo.explorer
                    }${messageTx.hash}`
                );

                if (taskArgs.delay) {
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
