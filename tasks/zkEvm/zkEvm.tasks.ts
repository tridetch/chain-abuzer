import { BigNumber } from "ethers";
import { task, types } from "hardhat/config";
import { ERC20__factory } from "../../typechain-types";
import { ChainId, getChainInfo } from "../../utils/ChainInfoUtils";
import { delay, getAccounts } from "../../utils/Utils";

task("zkEvmContractInteractions", "Interact with erc-20 contracts")
    .addParam("delay", "Add delay", undefined, types.float, true)
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
        const quickSwapAddress = "0xF6Ad3CcF71Abb3E12beCf6b3D2a74C963859ADCd";
        const network = await hre.ethers.provider.getNetwork();
        const chainInfo = getChainInfo(network.chainId);

        if (network.chainId != ChainId.zkEvm) {
            throw new Error("Task allowed only on zkEvm chain");
        }

        const accounts = await getAccounts(taskArgs, hre.ethers.provider);

        const erc20Contracts = [
            ERC20__factory.connect("0xa8ce8aee21bc2a48a5ef670afcc9274c7bbbc035", hre.ethers.provider),
            ERC20__factory.connect("0x1e4a5963abfd975d8c9021ce480b42188849d41d", hre.ethers.provider),
            ERC20__factory.connect("0xc5015b9d9161dca7e18e32f6f25c4ad850731fd4", hre.ethers.provider),
            ERC20__factory.connect("0x68791cfe079814c46e0e25c19bcc5bfc71a744f7", hre.ethers.provider),
            ERC20__factory.connect("0x4b16e4752711a7abec32799c976f3cefc0111f2b", hre.ethers.provider),
            ERC20__factory.connect("0xea034fb02eb1808c2cc3adbc15f447b93cbe08e1", hre.ethers.provider),
            ERC20__factory.connect("0x2548c94a3092494db3af864cc2cf781a72f55678", hre.ethers.provider),
            ERC20__factory.connect("0x120ef59b80774f02211563834d8e3b72cb1649d6", hre.ethers.provider),
            ERC20__factory.connect("0x3d5320821bfca19fb0b5428f2c79d63bd5246f89", hre.ethers.provider),
            ERC20__factory.connect("0x7e2feea957b7d1606335e339754f4e52b452b792", hre.ethers.provider),
            ERC20__factory.connect("0x68286607a1d43602d880d349187c3c48c0fd05e6", hre.ethers.provider),
        ];

        for (const account of accounts) {
            try {
                console.log(`\n#${accounts.indexOf(account)} Address ${account.address}`);

                for (const erc20 of erc20Contracts) {
                    const tx = await erc20.connect(account).approve(quickSwapAddress, BigNumber.from(0));
                    console.log(`Approve ${await erc20.symbol()} tx ${chainInfo.explorer}${tx.hash}`);
                    await delay(0.1);
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
