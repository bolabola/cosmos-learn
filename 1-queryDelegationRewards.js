import {
    QueryClient, setupDistributionExtension

} from "@cosmjs/stargate";
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import fs from "fs";

async function getQueryClient (rpcEndpoint) {
    const tendermint34Client = await Tendermint34Client.connect(rpcEndpoint);
    const queryClient = QueryClient.withExtensions(
        tendermint34Client,
        setupDistributionExtension
    );
    return queryClient;
}


async function start (address) {
    const rpcEndpoint = "https://rpc.cosmos.directory/cosmoshub";
    const queryClient = await getQueryClient(rpcEndpoint);
    let rewards = await queryClient.distribution.delegationTotalRewards(address);
    let totalRewards = rewards.total[rewards.total.length - 1].amount / Math.pow(10, 24);
    console.log("Rewards are ready to claim: " + totalRewards);

}
const address = '';//enter cosmos address
//start(address);

const results = fs.readFileSync('./wallet.txt', 'utf-8')
    .split(/\r?\n/)
    .filter(line => line.trim()) // 过滤掉空行
    .map(line => line.trim());

for (const v of results) {
   await start( v);
}