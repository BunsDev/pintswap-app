import { ethers } from 'ethers6';
import { Avatar, Card, NFTTable, DataTable } from '../components';
import { useTrade } from '../hooks/trade';
import { useGlobalContext } from '../stores/global';
import { toLimitOrder } from '../utils/orderbook';
import { memoize } from 'lodash';
import { useMemo, useEffect, useState } from 'react';
import { useOffersContext, usePeersContext } from '../stores';
import { useLocation } from 'react-router-dom';
import { isERC721Transfer, isERC20Transfer } from '@pintswap/sdk';

const columns = [
    {
        name: 'hash',
        label: 'Hash',
        options: {
            filter: false,
            sort: true,
            sortThirdClickReset: true,
        },
    },
    {
        name: 'ticker',
        label: 'Pair',
        options: {
            filter: true,
            sort: true,
            sortThirdClickReset: true,
        },
    },
    {
        name: 'type',
        label: 'Type',
        options: {
            filter: true,
            sort: true,
            sortThirdClickReset: true,
        },
    },
    {
        name: 'amount',
        label: 'Amount',
        options: {
            filter: false,
            sort: true,
            sortThirdClickReset: true,
        },
    },
    {
        name: 'price',
        label: 'Price',
        options: {
            filter: false,
            sort: true,
            sortThirdClickReset: true,
        },
    },
];

const mapToArray = (v: any) => {
    const it = v.entries();
    const result = [];
    let val;
    while ((val = it.next()) && !val.done) {
        result.push(val.value);
    }
    return result;
};

const toFlattened = memoize((v: any) =>
    mapToArray(v).map(([key, value]: any) => ({
        ...value,
        hash: key,
    })),
);


function groupByType(peerTrades: any) {
  const flattened = toFlattened(peerTrades);
  return {
    erc20: flattened.filter(({ gets, gives }: any) => {
      return isERC20Transfer(gets) && isERC20Transfer(gives);
    }),
    nfts: flattened.filter(({ gets, gives }: any) => {
      return !(isERC20Transfer(gets) && isERC20Transfer(gives));
    })
  };
}
function filterOutNonERC20(offers: any) {
    return offers.filter(({ gets, gives }: any) => {
        return isERC20Transfer(gets) && isERC20Transfer(gives);
    });
}

export const PeerOrderbookView = () => {
    const { pintswap } = useGlobalContext();
    const { peerTrades } = useOffersContext();
    const { order } = useTrade();
    const [limitOrders, setLimitOrders] = useState<any[]>([]);
    const { state } = useLocation();

    const peer = state?.peer ? state.peer : order.multiAddr;
    const sorted = useMemo(() => {
      return groupByType(peerTrades);
    }, [ peerTrades ]);

    useEffect(() => {
        (async () => {
            if (pintswap.module) {
                const signer = pintswap.module.signer || new ethers.InfuraProvider('mainnet');
                const { erc20: flattened } = sorted;
                const mapped = (
                    await Promise.all(
                        flattened.map(async (v: any) => await toLimitOrder(v, signer)),
                    )
                ).map((v, i) => ({
                    ...v,
                    hash: flattened[i].hash,
                    peer: flattened[i].peer,
                    multiAddr: flattened[i].multiAddr,
                }));
                setLimitOrders(mapped);
            }
        })().catch((err) => console.error(err));
    }, [pintswap.module, peerTrades]);
    const { nfts } = sorted;
    const filteredNfts = useMemo(() => nfts.filter((v: any) => isERC721Transfer(v.gives)).slice(0, 6), [ nfts ]);
    return (
        <div className="flex flex-col gap-6">
            <Avatar peer={peer} withBio withName align="left" size={60} type="profile" />
            { filteredNfts.length && <Card header={'NFTs'}>
                <NFTTable
                   data={filteredNfts as any}
                />
            </Card> || <span></span> }
            <Card header={'Peer Trades'} scroll={limitOrders.length > 0}>
                <DataTable
                    title="Peer Trades"
                    columns={columns}
                    data={limitOrders}
                    loading={limitOrders.length === 0}
                    type="orderbook"
                    peer={order.multiAddr}
                />
            </Card>
        </div>
    );
};
