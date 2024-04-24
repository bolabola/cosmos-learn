import {
    PrivateKey,
    InjectiveDirectEthSecp256k1Wallet
} from "@injectivelabs/sdk-ts"
import bip39 from "bip39";

async function start() {
    const mnemonic = bip39.generateMnemonic();
    const privateKey = PrivateKey.fromMnemonic(mnemonic);
    let wallet = (await InjectiveDirectEthSecp256k1Wallet.fromKey(
        Buffer.from(privateKey.toPrivateKeyHex().replace("0x", ""), "hex"), 'evmos'))
    const [account] = await wallet.getAccounts();
    console.log(mnemonic, privateKey.wallet.address, account.address)
}

start();