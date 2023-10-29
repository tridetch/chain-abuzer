import { BigNumber, Wallet } from "ethers";
import { Account, CallData, Provider, constants, ec, hash } from "starknet";
import { StarknetAccountConstants } from "./StarknetConstants";

export function getStarknetProvider(): Provider {
    return new Provider({ sequencer: { network: constants.NetworkName.SN_MAIN } });
}

export function toStarknetAccount(provider: Provider, account: Wallet) {
    const privateKeyAX = "0x" + ec.starkCurve.grindKey(account.privateKey);
    // console.log(`\nGRIND_ACCOUNT_PRIVATE_KEY= ${privateKeyAX}`);
    const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKeyAX);
    // console.log(`GRIND_ACCOUNT_PUB_KEY= ${starkKeyPubAX}`);

    const AXcontractAddress = starknetAddressFromHash(starkKeyPubAX);
    // console.log('Precalculated account address=', AXcontractAddress);

    return new Account(provider, AXcontractAddress, privateKeyAX, "1");
}

export const constructorCallData = (pubKey: string) => {
    return CallData.compile({
        owner: pubKey,
        guardian: 0n,
    });
};

export const starknetAddressFromHash = (pubKey: string) => {
    return hash.calculateContractAddressFromHash(
        pubKey,
        StarknetAccountConstants.argentXaccountClassHash,
        constructorCallData(pubKey),
        0
    );
};

export interface StarkgatePayload {
    from_address: string;
    to_address: string;
    entry_point_selector: string;
    payload: Array<string>;
}

export const isStarknetAccountDeployed = async (account: Account) => {
    return !BigNumber.from(await account.getNonce()).isZero()
}