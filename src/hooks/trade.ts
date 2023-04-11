import React, { useEffect, useState } from 'react';
import { useGlobalContext } from '../stores/global';
import { convertAmount, EMPTY_TRADE, getTokenAttributes, TESTING } from '../utils/common';
import { useLocation } from 'react-router-dom';
import { DEFAULT_PROGRESS, IOrderProgressProps } from '../components/progress-indicator';
import { hashOffer, IOffer } from '@pintswap/sdk';
import { ITokenProps } from '../utils/token-list';
import PeerId from 'peer-id';
import { toast } from 'react-toastify';
import { updateToast } from '../utils/toast';

type IOrderStateProps = {
    orderHash: string;
    multiAddr: string | any;
};

type IOrderbookProps = {
    offers: IOffer[];
};

export const useTrade = () => {
    const { pathname } = useLocation();
    const { addTrade, pintswap, openTrades, peer, peerTrades, setPeerTrades } = useGlobalContext();
    const [trade, setTrade] = useState<IOffer>(EMPTY_TRADE);
    const [order, setOrder] = useState<IOrderStateProps>({ orderHash: '', multiAddr: '' });
    const [steps, setSteps] = useState(DEFAULT_PROGRESS);
    const [loading, setLoading] = useState(false);
    const [loadingTrade, setLoadingTrade] = useState(false);
    const [error, setError] = useState(false);

    const isMaker = pathname === '/create';

    const buildTradeObj = ({ getsAmount, getsToken, givesAmount, givesToken }: IOffer): IOffer => {
        if (!getsToken || !getsAmount || !givesAmount || !givesToken)
            return EMPTY_TRADE;
        console.log("Building obj...", { getsAmount, getsToken, givesAmount, givesToken })
        const foundGivesToken = (getTokenAttributes(givesToken) as ITokenProps | undefined);
        const foundGetsToken = (getTokenAttributes(getsToken) as ITokenProps | undefined);
        return {
            givesToken: foundGivesToken ? foundGivesToken.address : givesToken,
            getsToken: foundGetsToken ? foundGetsToken.address : getsToken,
            givesAmount: convertAmount('hex', givesAmount, givesToken),
            getsAmount: convertAmount('hex', getsAmount, getsToken)
        };
    };

    console.log(buildTradeObj(trade))

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
                const peeredUp = PeerId.createFromB58String(order.multiAddr);
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
        if(TESTING) console.log("#getTrades - Args:", {multiAddr, orderHash})
        setLoadingTrade(true);
        const trade = orderHash ? openTrades.get(orderHash) : undefined;
        // MAKER
        if (trade) setTrade(trade);
        // TAKER
        else {
            if (pintswap.module) {
                try {
                    console.log('Discovery:', await (window as any).discoveryDeferred.promise);
                    const { offers }: IOrderbookProps = await pintswap.module.getTradesByPeerId(
                        multiAddr,
                    );
                    if (TESTING) console.log('#getTrades - Offers:', offers);
                    if (offers?.length > 0) {
                        // If only multiAddr in URL
                        if(!orderHash) {
                            const map = new Map(offers.map((offer) => [hashOffer(offer), offer]));
                            if(peerTrades.size === 0) setPeerTrades(map);
                        }
                        // Set first found trade as trade state
                        setTrade(offers[0]);
                    }
                } catch (err) {
                    console.error('Error in #getTrade:', err);
                    setError(true);
                    updateToast('findPeer', 'error', 'Error while finding peer')
                }
            }
        }
        setLoadingTrade(false);
    };

    // Update order form
    const updateTrade = (
        key: 'givesToken' | 'getsToken' | 'givesAmount' | 'getsAmount',
        val: string,
    ) => {
        setTrade({
            ...trade,
            [key]: val,
        });
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
            if (pathname.includes('/')) {
                const splitUrl = pathname.split('/');
                if (splitUrl.length === 3) { 
                    // If multiAddr and orderHash
                    setOrder({ multiAddr: splitUrl[1], orderHash: splitUrl[2] });
                    if (steps[1].status !== 'current') updateSteps('Fulfill');
                    await getTrades(splitUrl[1], splitUrl[2]);
                } else if (splitUrl.length === 2 && splitUrl[1] !== 'create') { 
                    // Only multiAddr
                    setOrder({ multiAddr: splitUrl[1], orderHash: '' });
                    await getTrades(splitUrl[1]); 
                }
            }
        };
        if (pintswap.module && (peer.module?.id || (peer.module as any)?._id))
            getter().catch((err) => console.error(err));
    }, [pintswap.module, peer.module]);

    /*
    * TRADE EVENT MANAGER - START
    */
    const peerListener = (step: 0 | 1 | 2 | 3) => {
        switch (step) {
            case 0:
                console.log('finding peer orders');
                break;
            case 1:
                console.log('peer found');
                updateToast('findPeer', 'success', 'Connected to peer!');
                break;
            case 2:
                console.log('found peer offers');
                updateToast('findPeer', 'success', 'Connected to peer!');
                break;
            case 3:
                console.log('returning offers');
                break;
        }
    };

    const makerListener = (step: 0 | 1 | 2 | 3 | 4 | 5) => {
        switch (step) {
            case 0:
                console.log('MAKER: taker fulfilling trade');
                toast('Taker is fulfilling trade...');
                break;
            case 1:
                console.log("MAKER: taker approved trade");
                toast('Taker is approving trade...')
                break;
            case 2:
                console.log("MAKER: swap is complete");
                updateSteps('Complete'); // only for maker
                break;
        }
    };

    const takerListener = (step: 0 | 1 | 2 | 3 | 4 | 5) => {
        switch (step) {
            case 0:
                console.log('TAKER: fulfilling trade');
                break;
            case 1:
                console.log('TAKER: taker approving token swap');
                break;
            case 2:
                console.log('TAKER: approved token swap');
                break;
            case 3:
                console.log('TAKER: building transaction');
                break;
            case 4:
                console.log('TAKER: transaction built');
                break;
            case 5:
                console.log('TAKER: swap complete');
                updateSteps('Complete'); // only for taker
                break;
        }
    };

    useEffect(() => {
        const { module } = pintswap;
        if (module) {
            if (!isMaker) toast.loading('Connecting to peer...', { toastId: 'findPeer' });
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
                if (TESTING) console.log(`Trade Broadcasted: ${hash}`);
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
        error
    };
};