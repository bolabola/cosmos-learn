import {
    QueryClient, setupDistributionExtension, setupBankExtension, setupStakingExtension, setupTxExtension, setupGovExtension
} from "@cosmjs/stargate";
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import fs from "fs";
import SigningClient from "./utils/SigningClient.js";
import { coin } from '@cosmjs/launchpad';
import { getSigner } from "./utils/helpers.js";

import { wallet } from "./wallet.js"
import { decrypt } from "./utils/crypto.js";
import axios from 'axios';

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
const validatorAddress = ''; //Validator address
const delegationAmount = 1; //Delegation amount

//start(chainsMap[chainName], mnemonicOrKey, validatorAddress, delegationAmount);


async function reDelegate(client, address, srcValidator, dstValidator, amount, chain) {
    let ops = [];
    ops.push({
        typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
        value: {
            delegatorAddress: address,
            validatorSrcAddress: srcValidator,
            validatorDstAddress: dstValidator,
            amount: coin(amount, chain.denom)
        },
    });
    let result;
    if (chain.slip44 && chain.slip44 === 60) {
        result = await client.signAndBroadcast(address, ops, '', '');
    } else {
        let calculatedFee = await estimateFee(client, address, ops, chain);
        result = await client.signAndBroadcast(address, ops, calculatedFee, '');
    }
    return result;
}

async function estimateFee (client, address, message, chain) {
        let gasLimit = await client.simulate(address, message, '');
        let calculatedFee = calculateFee(Math.floor(gasLimit * chain.gasLimitRatio), `${chain.gasPrice}${chain.denom}`);
        return calculatedFee;
    } catch (err) {
        console.log("Error in estimateFee: " + err);
    }
}

async function queryDelegationBalance(address) {
    try {
        //https://lcd-celestia.keplr.app/cosmos/staking/v1beta1/delegations/${address}
        //https://lcd-osmosis.keplr.app/cosmos/staking/v1beta1/delegations/${address}
        //https://lcd-cosmoshub.keplr.app/cosmos/staking/v1beta1/delegations/${address};
        const response = await axios.get(`https://lcd-cosmoshub.keplr.app/cosmos/staking/v1beta1/delegations/${address}`);
        const delegationResponse = response.data.delegation_responses

        //console.log(delegationResponse)
        if (response.status === 200 && delegationResponse) {
            const totalBalance = delegationResponse.reduce(
                (total, entry) => total + parseInt(entry.balance.amount),
                0
            );
            console.log(`Total Delegated Balance for ${address}: ${totalBalance / 1_000_000} ATOM`);
            return totalBalance / 1_000_000
        } else {
            console.error('Error: Unable to retrieve delegation response from the RPC server.');
        }
    } catch (error) {
        console.error(`Error: Unable to connect to the RPC server. ${error.message}`);
    }
};


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const args = process.argv.slice(2);
const key = args[0]
const iv = args[1]

for (const v of wallet) {
    const mnemonicOrKey = decrypt(v, key, iv)
    try {
        await delay(300)
        start(chainsMap[chainName], mnemonicOrKey, validatorAddress, delegationAmount);

    } catch (error) {
        console.log(error)
    }
}