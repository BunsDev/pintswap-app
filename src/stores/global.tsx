import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useSigner } from 'wagmi';
import { Pintswap } from '@pintswap/sdk';
import PeerId, { JSONPeerId } from 'peer-id';
import { defer, EMPTY_PEER, TESTING } from '../utils/common';

// Types
export type IGlobalStoreProps = {
    pintswap: {
        module: Pintswap | undefined;
        loading: boolean;
        error: boolean;
    };
    peer: {
        module: JSONPeerId;
        loading: boolean;
        error: boolean;
    };
    setPeer?: any;
    setPintswap?: any;
};

export type IPintswapProps = {
    module: Pintswap | undefined;
    loading: boolean;
    error: boolean;
};

export type IPeerProps = {
    module: JSONPeerId;
    loading: boolean;
    error: boolean;
};

// Context
const GlobalContext = createContext<IGlobalStoreProps>({
    pintswap: {
        module: undefined,
        loading: true,
        error: false,
    },
    peer: {
        module: EMPTY_PEER,
        loading: true,
        error: false,
    },
});

// Peer
(window as any).discoveryDeferred = defer();

// Wrapper
export function GlobalStore(props: { children: ReactNode }) {
    const { data: signer } = useSigner();

    const [pintswap, setPintswap] = useState<IPintswapProps>({
        module: undefined,
        loading: true,
        error: false,
    });
    const [peer, setPeer] = useState<IPeerProps>({
        module: EMPTY_PEER,
        loading: true,
        error: false,
    });

    // Initialize Pintswap
    useEffect(() => {
        const initialize = async () => {
            const ps: Pintswap = await new Promise((resolve, reject) => {
                (async () => {
                    try {
                        const ps =
                            typeof localStorage.getItem('_pintUser') === 'string'
                                ? await Pintswap.fromObject(
                                      JSON.parse(localStorage.getItem('_pintUser') as string),
                                      signer,
                                  )
                                : await Pintswap.initialize({ awaitReceipts: false, signer });
                        (window as any).ps = ps;
                        ps.on('pintswap/node/status', (s: any) => {
                            if (TESTING) console.log('Node emitting', s);
                        });
                        // Start node
                        await ps.startNode();
                        // Subscribe to peer
                        ps.on('peer:discovery', async (peer: any) => {
                            if (TESTING) console.log('Discovered peer:', peer);
                            (window as any).discoveryDeferred.resolve(peer);
                        });
                        // Subscribe to pubsub
                        await ps.subscribeOffers();
                        resolve(ps);
                    } catch (err) {
                        console.error('Initializing error:', err);
                        setPintswap({ ...pintswap, loading: false });
                        setPeer({ ...peer, loading: false });
                    }
                })().catch(reject);
            });
            if (ps.isStarted()) {
                setPintswap({ ...pintswap, module: ps, loading: false });
            } else {
                setPintswap({ ...pintswap, loading: false });
            }
        };
        if (!pintswap.module && signer) initialize();
    }, [signer]);

    // Find Peer Id
    useEffect(() => {
        const getPeer = async () => {
            const key = 'peerId';
            const localPeerId = localStorage.getItem(key);
            if (localPeerId && localPeerId != null && !TESTING) {
                setPeer({ ...peer, module: JSON.parse(localPeerId) });
            } else {
                const id = await PeerId.create();
                setPeer({ ...peer, module: id.toJSON() });
                localStorage.setItem(key, JSON.stringify(id.toJSON()));
            }
        };
        getPeer();
    }, []);

    return (
        <GlobalContext.Provider
            value={{
                pintswap,
                peer,
                setPeer,
                setPintswap,
            }}
        >
            {props.children}
        </GlobalContext.Provider>
    );
}

// Independent
export function useGlobalContext() {
    return useContext(GlobalContext);
}
