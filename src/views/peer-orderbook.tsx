import { ethers } from 'ethers';
import { ImSpinner9 } from 'react-icons/im';
import { useNavigate } from 'react-router-dom';
import { Card, CopyClipboard, Skeleton, Table } from '../components';
import { useTrade } from '../hooks/trade';
import { useGlobalContext } from '../stores/global';
import { toLimitOrder } from '../utils/orderbook';
import { convertAmount } from '../utils/common';
import { capitalCase } from 'change-case';
import { memoize } from 'lodash';
import { useEffect, useState } from 'react';

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

export const PeerOrderbookView = () => {
    const navigate = useNavigate();
    const { pintswap, peerTrades } = useGlobalContext();
    const { error, order } = useTrade();
    const [limitOrders, setLimitOrders] = useState([]);
    useEffect(() => {
        (async () => {
            if (pintswap.module) {
                const signer =
                    pintswap.module.signer || new ethers.providers.InfuraProvider('mainnet');
                const flattened = toFlattened(peerTrades);
                const limitOrders = (
                    await Promise.all(
                        flattened.map(async (v: any) => await toLimitOrder(v, signer)),
                    )
                ).map((v, i) => ({
                    ...v,
                    hash: flattened[i].hash,
                    peer: flattened[i].peer,
                    multiAddr: flattened[i].multiAddr,
                }));
                setLimitOrders(limitOrders as any);
            }
        })().catch((err) => console.error(err));
    }, [pintswap.module, peerTrades]);

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center self-center">
                <p className="text-sm">Multi Address</p>
                <Skeleton loading={pintswap.loading}>
                    <CopyClipboard
                        value={order.multiAddr || ethers.constants.AddressZero}
                        truncate={5}
                        icon
                        lg
                    />
                </Skeleton>
            </div>
            <Card header="Open Trades" scroll>
                <Table
                    headers={['Hash', 'Pair', 'Type', 'Price', 'Amount']}
                    onClick={(trade: any) => navigate(`/${order.multiAddr}/${trade.hash}`)}
                    items={Array.from(limitOrders, (entry: any) => [
                        entry.hash,
                        entry.ticker,
                        capitalCase(entry.type),
                        entry.price,
                        entry.amount,
                    ])}
                    emptyContent={
                        pintswap.loading ? (
                            <ImSpinner9 className="animate-spin" size="20px" />
                        ) : (
                            <span>
                                {error ? (
                                    <span>
                                        Error loading peer&apos;s trades.{' '}
                                        <button
                                            onClick={() => navigate(0)}
                                            className="text-indigo-600 transition duration-200 hover:text-indigo-700"
                                        >
                                            Try refreshing.
                                        </button>
                                    </span>
                                ) : (
                                    "Loading peer's trades..."
                                )}
                            </span>
                        )
                    }
                />
            </Card>
        </div>
    );
};
