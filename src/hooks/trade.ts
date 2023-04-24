import React, { useEffect, useState } from 'react';
import { useGlobalContext } from '../stores/global';
import { convertAmount, EMPTY_TRADE, getTokenAttributes, TESTING } from '../utils/common';
import { useParams, useLocation } from 'react-router-dom';
import { DEFAULT_PROGRESS, IOrderProgressProps } from '../components/progress-indicator';
import { hashOffer, IOffer } from '@pintswap/sdk';
import { ITokenProps } from '../utils/token-list';
import PeerId from 'peer-id';
import { toast } from 'react-toastify';
import { updateToast } from '../utils/toast';
import { useOffersContext } from '../stores';

type IOrderStateProps = {
    orderHash: string;
    multiAddr: string | any;
};

type IOrderbookProps = {
    offers: IOffer[];
};

const resolveName = async (pintswap: any, name: any) => {
    while (true as any) {
        try {
            return await pintswap.resolveName(name);
        } catch (e) {
            if (!(e as any).message.match('no valid addresses')) throw e;
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }
    }
};

export const useTrade = () => {
    const params = useParams();
    const { pathname } = useLocation();
    const { pintswap, peer } = useGlobalContext();
    const { addTrade, openTrades, peerTrades, setPeerTrades, setOpenTrades } = useOffersContext();
    const [trade, setTrade] = useState<IOffer>(EMPTY_TRADE);
    const [order, setOrder] = useState<IOrderStateProps>({ orderHash: '', multiAddr: '' });
    const [steps, setSteps] = useState(DEFAULT_PROGRESS);
    const [loading, setLoading] = useState(false);
    const [loadingTrade, setLoadingTrade] = useState(false);
    const [error, setError] = useState(false);
    const { multiaddr } = useParams();

    const isMaker = pathname === '/create';
    const isOnActive = pathname === '/open';

    const buildTradeObj = ({ gets, gives }: IOffer): IOffer => {
        if (!gets || !gives || !gets.token || !gets.amount || !gives.amount || !gives.token)
            return EMPTY_TRADE;
        const foundGivesToken = getTokenAttributes(gives.token) as ITokenProps | undefined;
        const foundGetsToken = getTokenAttributes(gets.token) as ITokenProps | undefined;
        const builtObj = {
            gives: {
                token: foundGivesToken ? foundGivesToken.address : gives.token,
                amount: convertAmount('hex', gives.amount, gives.token),
            },
            gets: {
                token: foundGetsToken ? foundGetsToken.address : gets.token,
                amount: convertAmount('hex', gets.amount, gets.token),
            },
        };
        if (TESTING) console.log('#buildTradeObj:', builtObj);
        return builtObj;
    };

    // Create trade
    const broadcastTrade = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        if (TESTING) console.log('#broadcastTrade: TradeObj', buildTradeObj(trade));
        if (pintswap.module) {
            try {
                pintswap.module.broadcastOffer(buildTradeObj(trade));
            } catch (err) {
                console.error(err);
            }
        }
        toast.loading('Connecting to peer...', { toastId: 'findPeer' });
        setLoading(false);
    };

    // Fulfill trade
    const fulfillTrade = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        if (TESTING) console.log('#fulfillTrade - Trade Obj:', buildTradeObj(trade));
        if (pintswap.module) {
            try {
                let multiAddr = order.multiAddr;
                if (multiAddr.match(/\.drip$/))
                    multiAddr = await resolveName(pintswap.module, order.multiAddr);
                const peeredUp = PeerId.createFromB58String(multiAddr);
                pintswap.module.createTrade(peeredUp, buildTradeObj(trade));
                if (TESTING) console.log('Fulfilled trade!');
            } catch (err) {
                console.error(err);
                setLoading(false);
                setError(true);
            }
        }
        setLoading(false);
    };

    // Get single trade or all peer trades
    const getTrades = async (multiAddr: string, orderHash?: string) => {
        console.log("GETTING TRADES:", multiAddr, orderHash)
        let resolved = multiAddr;
        const ps = pintswap.module;
        if (multiAddr.match(/\.drip$/) && ps) resolved = await resolveName(ps, multiAddr);
        if (TESTING) console.log('#getTrades - Args:', { resolved, orderHash });
        setLoadingTrade(true);
        console.log('ORDERHASH', orderHash);
        const trade = orderHash ? openTrades.get(orderHash) : undefined;
        console.log('TRADE', trade);
        // MAKER
        if (trade) setTrade(trade);
        // TAKER
        else {
            console.log('pintswap.module', pintswap.module);
            if (pintswap.module) {
                try {
                    console.log('Discovery:', await (window as any).discoveryDeferred.promise);
                    console.log('RESOLVED', resolved);
                    const { offers }: IOrderbookProps = await (ps as any).getUserDataByPeerId(
                        resolved,
                    );
                    if (TESTING) console.log('#getTrades - Offers:', offers);
                    console.log('OFFERS', offers);
                    if (offers?.length > 0) {
                        // If only multiAddr in URL
                        if (!orderHash) {
                            const map = new Map(offers.map((offer) => [hashOffer(offer), offer]));
                            setPeerTrades(map);
                        }
                        // Set first found trade as trade state
                        const { gives, gets } = offers[0];
                        setTrade({
                            gives: {
                                token:
                                    (getTokenAttributes(gives.token) as ITokenProps).symbol ||
                                    gives.token,
                                amount: convertAmount('number', gives.amount || '', gives.token),
                            },
                            gets: {
                                token:
                                    (getTokenAttributes(gets.token) as ITokenProps).symbol ||
                                    gets.token,
                                amount: convertAmount('number', gets.amount || '', gets.token),
                            },
                        });
                    }
                } catch (err) {
                    console.error('Error in #getTrade:', err);
                    setError(true);
                    updateToast('findPeer', 'error', 'Error while finding peer');
                }
            }
        }
        setLoadingTrade(false);
    };

    // Update order form
    const updateTrade = (
        key: 'gives.token' | 'gets.token' | 'gives.amount' | 'gets.amount',
        val: string,
    ) => {
        const parts: any = key.split('.');
        const newTrade = { ...trade };
        parts.slice(0, -1).reduce((r: any, v: any) => r[v], newTrade)[parts[parts.length - 1]] =
            val;
        setTrade(newTrade);
    };

    // Update progress indicator
    const updateSteps = (nextStep: 'Create' | 'Fulfill' | 'Complete') => {
        const updated: IOrderProgressProps[] = steps.map((step, i) => {
            if (step.status === 'current') return { ...step, status: 'complete' };
            else if (step.name === nextStep) return { ...step, status: 'current' };
            else return step;
        });
        setSteps(updated);
    };

    // Get trade based on URL
    useEffect(() => {
        const getter = async () => {
            console.log('GETTER CALLED');
            if (pathname.includes('/') && multiaddr) {
                const splitUrl = pathname.split('/');
                if (splitUrl[1] === 'fulfill') {
                    // If multiAddr and orderHash
                    if (steps[1].status !== 'current') updateSteps('Fulfill');
                    setOrder({ multiAddr: multiaddr, orderHash: splitUrl[3] });
                    await getTrades(multiaddr, splitUrl[3]);
                } else if (splitUrl[1] === 'peers') {
                    // Only multiAddr
                    setOrder({ multiAddr: multiaddr, orderHash: '' });
                    await getTrades(multiaddr);
                }
            }
        };
        if (pintswap.module && (peer.module?.id || (peer.module as any)?._id))
            getter().catch((err) => console.error(err));
    }, [pintswap.module, peer.module, multiaddr]);

    /*
     * TRADE EVENT MANAGER - START
     */
    const peerListener = (step: 0 | 1 | 2 | 3) => {
        switch (step) {
            case 0:
                console.log('#peerListener: finding peer orders');
                break;
            case 1:
                console.log('#peerListener: peer found');
                updateToast('findPeer', 'success', 'Connected to peer!');
                break;
            case 2:
                console.log('#peerListener: found peer offers');
                updateToast('findPeer', 'success', 'Connected to peer!');
                break;
            case 3:
                console.log('#peerListener: returning offers');
                break;
        }
    };

    const makerListener = (step: 0 | 1 | 2 | 3 | 4 | 5) => {
        let shallow = new Map(openTrades);
        switch (step) {
            case 0:
                console.log('#makerListener: taker approving trade');
                toast('Taker is approving transaction...');
                break;
            case 1:
                console.log('#makerListener: taker approved trade');
                toast('Taker approved transaction!');
                break;
            case 2:
                console.log('#makerListener: swap is complete');
                updateSteps('Complete'); // only for maker
                shallow.delete(order.orderHash);
                setOpenTrades(shallow);
                shallow = openTrades;
                break;
        }
    };

    const takerListener = (step: 0 | 1 | 2 | 3 | 4 | 5) => {
        let shallow = new Map(openTrades);
        switch (step) {
            case 0:
                console.log('#takerListener: fulfilling trade');
                break;
            case 1:
                console.log('#takerListener: taker approving token swap');
                break;
            case 2:
                console.log('#takerListener: approved token swap');
                break;
            case 3:
                console.log('#takerListener: building transaction');
                break;
            case 4:
                console.log('#takerListener: transaction built');
                break;
            case 5:
                console.log('#takerLister: swap complete');
                updateSteps('Complete'); // only for taker
                shallow.delete(order.orderHash);
                setOpenTrades(shallow);
                shallow = openTrades;
                break;
        }
    };

    useEffect(() => {
        const { module } = pintswap;
        if (module) {
            if (!isMaker && !isOnActive)
                toast.loading('Connecting to peer...', { toastId: 'findPeer' });
            module.on('pintswap/trade/peer', peerListener);
            module.on('pintswap/trade/taker', takerListener);
            module.on('pintswap/trade/maker', makerListener);
            return () => {
                module.removeListener('pintswap/trade/taker', takerListener);
                module.removeListener('pintswap/trade/peer', peerListener);
                module.removeListener('pintswap/trade/maker', makerListener);
            };
        }
        return () => {};
    }, [pintswap.module]);

    useEffect(() => {
        const { module } = pintswap;
        if (module) {
            const broadcastListener = (hash: string) => {
                if (TESTING) console.log(`#broadcastListener: trade broadcasted (${hash})`);
                setOrder({ multiAddr: pintswap.module?.peerId.toB58String(), orderHash: hash });
                addTrade(hash, buildTradeObj(trade));
                updateSteps('Fulfill');
            };
            module.on('pintswap/trade/broadcast', broadcastListener);
            return () => {
                module.removeListener('pintswap/trade/broadcast', broadcastListener);
            };
        }
        return () => {};
    }, [pintswap.module, trade]);
    /*
     * TRADE EVENT MANAGER - END
     */

    return {
        loading,
        broadcastTrade,
        trade,
        updateTrade,
        fulfillTrade,
        getTrades,
        order,
        steps,
        updateSteps,
        loadingTrade,
        error,
    };
};
