import {
    QueryClient, setupDistributionExtension, setupBankExtension, setupStakingExtension, setupTxExtension, setupGovExtension
} from "@cosmjs/stargate";
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import fs from "fs";
import SigningClient from "./utils/SigningClient.js";
import { coin } from '@cosmjs/launchpad';
import { getSigner } from "./utils/helpers.js";
import { decrypt } from "./crypto.js";
const loadJSON = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const chainsMap = loadJSON('./assets/chains.json');

async function getQueryClient(rpcEndpoint) {
    const tendermint34Client = await Tendermint34Client.connect(rpcEndpoint);
    const queryClient = QueryClient.withExtensions(
        tendermint34Client,
        setupBankExtension,
        setupStakingExtension,
        setupTxExtension,
        setupGovExtension,
        setupDistributionExtension
    );
    return queryClient;
}

async function delegate(client, address, validator, amount) {
    let ops = [];
    ops.push({
        typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
        value: {
            delegatorAddress: address,
            validatorAddress: validator,
            amount: amount
        },
    });
    let result = await client.signAndBroadcast(address, ops, '', '');

    return result;
}

async function start(chain, mnemonicOrKey, validatorAddress, delegationAmount) {
    try {
        const rpcEndpoint = chain.rpc;
        let wallet = await getSigner(chain, mnemonicOrKey);
        let client = new SigningClient(chain, wallet);
        const [account] = await wallet.getAccounts();
        const queryClient = await getQueryClient(rpcEndpoint);
        let balances = await queryClient.bank.balance(account.address, chain.denom);
        console.log(`${account.address} has ${balances.amount / Math.pow(10, chain.exponent)} ${chain.symbol}`);
        if (balances.amount > 0) {
            //Delegation
            let result = await delegate(client, account.address, validatorAddress, coin("" + delegationAmount * Math.pow(10, chain.exponent), chain.denom));
            let code = result.code;
            if (code == 0) {
                console.log(`${account.address} delegated ${delegationAmount} ${chain.symbol} to ${validatorAddress}: ${result.transactionHash}`)
            } else {
                console.log(`${account.address} FAILED to delegate ${delegationAmount} ${chain.symbol} to ${validatorAddress}. Reason: ${result.rawLog}`);
            }
        }

    } catch (err) {
        console.log(err)
        console.log("Error in start: " + err);
    }
}



const chainName = 'cosmos'; //Get the chain name from the chains.json
const mnemonicOrKey = 'Put mnemonic or private key here';
const validatorAddress = 'cosmosvaloper1hmd535f69t3x262m6s9wc6jd0dmel2zevhyuhm'; //Validator address
const delegationAmount = 0.01; //Delegation amount

//start(chainsMap[chainName], mnemonicOrKey, validatorAddress, delegationAmount);

const args = process.argv.slice(2);


const results = fs.readFileSync('./wallet.txt', 'utf-8')
    .split(/\r?\n/)
    .filter(line => line.trim()) // 过滤掉空行
    .map(line => line.trim());

for (const v of results) {
   await start(chainsMap[chainName], decrypt(v,args[0],args[1]), validatorAddress, delegationAmount);       
}