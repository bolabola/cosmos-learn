import axios from 'axios';
import { wallet } from "./wallet.js"
import { decrypt } from "./utils/crypto.js";
import { Secp256k1HdWallet, makeCosmoshubPath } from "@cosmjs/amino";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";

// Populate addresses from mnemonic
function getWalletWithAccountSize(mnemonic, accountSize, prefix) {
    return new Promise(async (resolve) => {
        let ops = {
            bip39Password: "",
            hdPaths: [],
            prefix: prefix,
        }

        for (let i = 0; i < accountSize; i++) {
            ops.hdPaths.push(makeCosmoshubPath(i));
        }
        let wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, ops);
        resolve(wallet);
    })

}

// Populate addresses from mnemonic
async function getAccounts(mnemonic, accountSize, prefix) {
    let wallet = await getWalletWithAccountSize(mnemonic, accountSize, prefix);
    let accounts = await wallet.getAccounts();
    return accounts;
}


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const args = process.argv.slice(2);
const key = args[0]
const iv = args[1]

for (const v of wallet) {
    const mnemonic = decrypt(v, key, iv)
    //console.log(mnemonic)
    try {
        await delay(300)
        let msg = (await getAccounts(mnemonic, 1, 'osmo'))[0].address;

        const signer = await Secp256k1HdWallet.fromMnemonic(mnemonic);
        const account = (await signer.getAccounts())[0];
        const signDoc = {
            chain_id: "",
            account_number: "0",
            sequence: "0",
            fee: {
                gas: "0",
                amount: [],
            },
            msgs: [
                {
                    type: "sign/MsgSignData",
                    value: {
                        signer: account.address,
                        data: Buffer.from(msg).toString("base64"),
                    },
                },
            ],
            memo: "",
        };

        const res = await signer.signAmino(account.address, signDoc);
        const body = JSON.stringify({
            address: account.address,
            message: msg,
            wallet: 'keplr',
            signature: res.signature.signature
        })
        //console.log(body)
        const response = await axios.post("https://gateway.biglabs.eu/api/cook/participate/cosmoshub", body, {
            headers: {
                "Content-Type": "application/json"
            }
        })

        console.log(response.data)

    } catch (error) {
        console.log(error)
    }
}