import React, { useEffect, useState } from 'react';
import { useGlobalContext } from '../stores/global';
import { EMPTY_TRADE, getDecimals, TESTING } from '../utils/common';
import { useLocation } from 'react-router-dom';
import { DEFAULT_PROGRESS, IOrderProgressProps } from '../components/progress-indicator';
import { ethers } from 'ethers';
import { hashOffer, IOffer } from 'pintswap-sdk';
import { TOKENS } from '../utils/token-list';
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
    const { addTrade, pintswap, openTrades, peer, peerTrades, setPeerTrades, peerOrders, setPeerOrders } = useGlobalContext();
    const [trade, setTrade] = useState<IOffer>(EMPTY_TRADE);
    const [order, setOrder] = useState<IOrderStateProps>({ orderHash: '', multiAddr: '' });
    const [steps, setSteps] = useState(DEFAULT_PROGRESS);
    const [loading, setLoading] = useState(false);
    const [loadingTrade, setLoadingTrade] = useState(false);
    const [error, setError] = useState(false);

    const isMaker = pathname === '/create';

    const buildTradeObj = ({ getsAmount, getsToken, givesAmount, givesToken }: IOffer): IOffer => {
        if (!getsToken && !getsAmount && !givesAmount && !givesToken) return EMPTY_TRADE;
        const foundGivesToken = TOKENS.find((el) => el.symbol === givesToken);
        const foundGetsToken = TOKENS.find((el) => el.symbol === getsToken);
        return {
            givesToken: foundGivesToken ? foundGivesToken.address : givesToken,
            getsToken: foundGetsToken ? foundGetsToken.address : getsToken,
            givesAmount: ethers.utils
                .parseUnits(givesAmount, getDecimals(givesToken))
                .toHexString(),
            getsAmount: ethers.utils.parseUnits(getsAmount, getDecimals(getsToken)).toHexString(),
        };
    };

    // Create trade
    const broadcastTrade = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        if (TESTING) console.log('Broadcasting trade:', buildTradeObj(trade));
        if (pintswap.module) {
            try {
                const tradeObj = buildTradeObj(trade);
                console.log('tradeObj', tradeObj);
                pintswap.module.broadcastOffer({
                    getsAmount: tradeObj.getsAmount,
                    getsToken: tradeObj.getsToken,
                    givesAmount: tradeObj.givesAmount,
                    givesToken: tradeObj.givesToken,
                });
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
        if (pintswap.module) {
            try {
                if (TESTING) console.log('Chain ID:', await pintswap.module.signer.getChainId());
                const peeredUp = PeerId.createFromB58String(order.multiAddr);
                if (TESTING) console.log('Trade Obj:', buildTradeObj(trade));
                pintswap.module.createTrade(peeredUp, buildTradeObj(trade));
                if (TESTING) console.log('Fulfilled trade!');
                else setError(true);
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
        setLoadingTrade(true);
        const trade = orderHash ? openTrades.get(orderHash) : undefined;
        // MAKER
        if (trade) setTrade(trade);
        // TAKER
        else {
            if (pintswap.module) {
                try {
                    console.log('Discovery:', await (window as any).discoveryDeferred.promise);
                    console.log('getting trades', multiAddr);
                    const { offers }: IOrderbookProps = await pintswap.module.getTradesByPeerId(
                        multiAddr,
                    );
                    console.log('Offers:', offers);
                    if (TESTING) console.log('Offers:', offers);
                    if (offers?.length > 0) {
                        // If only multiAddr
                        if (!orderHash) {
                            const map = new Map(offers.map((offer) => [hashOffer(offer), offer]));
                            setPeerOrders(map);
                        }
                        // Set first found trade as trade state
                        const foundGivesToken = TOKENS.find(
                            (el) => el.address.toLowerCase() === offers[0].givesToken.toLowerCase(),
                        );
                        const foundGetsToken = TOKENS.find(
                            (el) => el.address.toLowerCase() === offers[0].getsToken.toLowerCase(),
                        );
                        setTrade({
                            givesToken: foundGivesToken?.symbol || offers[0].givesToken,
                            givesAmount: ethers.utils.formatUnits(
                                offers[0].givesAmount,
                                foundGivesToken?.decimals || 18,
                            ),
                            getsToken: foundGetsToken?.symbol || offers[0].getsToken,
                            getsAmount: ethers.utils.formatUnits(
                                offers[0].getsAmount,
                                foundGetsToken?.decimals || 18,
                            ),
                        });
                    }
                } catch (err) {
                    console.error('Error in trade.ts#getTrade:', err);
                    setError(true);
                    updateToast('findPeer', 'error', 'Error while finding peer');
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
                    if (TESTING) console.log('get trade:', splitUrl[2]);
                    if (steps[1].status !== 'current') updateSteps('Fulfill');
                    console.log([splitUrl[1], splitUrl[2]]);
                    await getTrades(splitUrl[1], splitUrl[2]);
                } else if (splitUrl.length === 2) {
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
                console.log('MAKER: taker approved trade');
                toast('Taker is approving trade...');
                break;
            case 2:
                console.log('MAKER: swap is complete');
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
                if (TESTING) console.log(`Trade Broadcasted', ${hash}`);
                setOrder({ multiAddr: pintswap.module?.peerId.toB58String(), orderHash: hash });
                if (TESTING) console.log(buildTradeObj(trade));
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
